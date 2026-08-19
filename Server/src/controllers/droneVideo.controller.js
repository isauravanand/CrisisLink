import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import * as droneVideoService from "../services/droneVideo.service.js";

/**
 * Controller: Upload new drone video (POST /api/drone-videos)
 */
export const uploadDroneVideo = asyncHandler(async (req, res) => {
    if (!req.file) {
        return errorResponse(res, "Validation failed", 400, [
            { field: "video", message: "Drone video file is required (.mp4, .mov, .webm)" }
        ]);
    }

    const { missingPersonId } = req.body;

    const newVideo = await droneVideoService.createDroneVideo({
        file: req.file,
        missingPersonId
    });

    return successResponse(res, newVideo, "Drone search video uploaded successfully. Analysis started.", 201);
});

/**
 * Controller: Get all drone videos with pagination (GET /api/drone-videos)
 */
export const getDroneVideos = asyncHandler(async (req, res) => {
    const result = await droneVideoService.getAllDroneVideos(req.query);
    return successResponse(res, result, "Drone videos retrieved successfully", 200);
});

/**
 * Controller: Get single drone video details (GET /api/drone-videos/:id)
 */
export const getDroneVideoById = asyncHandler(async (req, res) => {
    const video = await droneVideoService.getDroneVideoById(req.params.id);
    return successResponse(res, video, "Drone video details retrieved successfully", 200);
});

/**
 * Controller: Get detected person candidates for video (GET /api/drone-videos/:id/detections)
 */
export const getDroneVideoDetections = asyncHandler(async (req, res) => {
    const detections = await droneVideoService.getDroneVideoDetections(req.params.id);
    return successResponse(res, { detections }, "Person detections retrieved successfully", 200);
});

export default {
    uploadDroneVideo,
    getDroneVideos,
    getDroneVideoById,
    getDroneVideoDetections
};
