import {
    createRecord,
    findRecords,
    findRecordById
} from "../utils/fileStorage.js";
import { processDroneVideo } from "./videoProcessor.service.js";
import { logCaseEvent } from "./timeline.service.js";

/**
 * Register a new Drone Video and initiate asynchronous processing
 */
export const createDroneVideo = async ({ file, missingPersonId }) => {
    let caseId = "";
    let validMissingPersonId = null;

    if (missingPersonId && missingPersonId.trim().length > 0) {
        const mpCase = findRecordById("missing_persons", missingPersonId);
        if (mpCase) {
            validMissingPersonId = mpCase._id;
            caseId = mpCase.caseId;
        }
    }

    const videoUrl = `/uploads/drone-videos/${file.filename}`;

    const droneVideo = createRecord("drone_videos", {
        caseId,
        missingPersonId: validMissingPersonId,
        videoUrl,
        videoPublicId: file.filename,
        filename: file.originalname,
        fileSize: file.size,
        status: "UPLOADED"
    });

    if (caseId) {
        await logCaseEvent({
            caseId,
            caseType: "MISSING_PERSON",
            eventType: "DRONE_VIDEO_UPLOADED",
            description: `Drone search video uploaded: ${file.originalname}`,
            metadata: { droneVideoId: droneVideo._id, filename: file.originalname }
        });
    }

    // Trigger non-blocking asynchronous video processing pipeline
    setImmediate(() => {
        processDroneVideo(droneVideo._id);
    });

    return droneVideo;
};

/**
 * Retrieve paginated list of drone videos
 */
export const getAllDroneVideos = async ({ page = 1, limit = 20 } = {}) => {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const { records: rawVideos, total } = findRecords("drone_videos", () => true, {
        page: pageNum,
        limit: limitNum,
        sortField: "createdAt",
        sortOrder: "desc"
    });

    // Populate missingPersonId
    const videos = rawVideos.map(video => {
        let mpObj = null;
        if (video.missingPersonId) {
            const mp = findRecordById("missing_persons", video.missingPersonId);
            if (mp) {
                mpObj = {
                    _id: mp._id,
                    name: mp.name,
                    caseId: mp.caseId,
                    age: mp.age,
                    gender: mp.gender,
                    photoUrl: mp.photoUrl
                };
            }
        }
        return {
            ...video,
            missingPersonId: mpObj
        };
    });

    return {
        videos,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum) || 1
        }
    };
};

/**
 * Retrieve single Drone Video details by ID
 */
export const getDroneVideoById = async (id) => {
    const video = findRecordById("drone_videos", id);
    if (!video) {
        const err = new Error("Drone video record not found");
        err.statusCode = 404;
        throw err;
    }

    let mpObj = null;
    if (video.missingPersonId) {
        const mp = findRecordById("missing_persons", video.missingPersonId);
        if (mp) {
            mpObj = {
                _id: mp._id,
                name: mp.name,
                caseId: mp.caseId,
                age: mp.age,
                gender: mp.gender,
                photoUrl: mp.photoUrl,
                status: mp.status
            };
        }
    }

    return {
        ...video,
        missingPersonId: mpObj
    };
};

/**
 * Retrieve detected person candidates for a specific Drone Video
 */
export const getDroneVideoDetections = async (droneVideoId) => {
    const videoExists = findRecordById("drone_videos", droneVideoId);
    if (!videoExists) {
        const err = new Error("Drone video record not found");
        err.statusCode = 404;
        throw err;
    }

    const { records: rawDetections } = findRecords("person_detections", (d) => d.droneVideoId === droneVideoId, {
        sortField: "confidence",
        sortOrder: "desc"
    });

    const detections = rawDetections.map(det => {
        let mpObj = null;
        if (det.missingPersonId) {
            const mp = findRecordById("missing_persons", det.missingPersonId);
            if (mp) {
                mpObj = { _id: mp._id, name: mp.name, caseId: mp.caseId };
            }
        }
        return {
            ...det,
            missingPersonId: mpObj
        };
    });

    return detections;
};

export default {
    createDroneVideo,
    getAllDroneVideos,
    getDroneVideoById,
    getDroneVideoDetections
};

