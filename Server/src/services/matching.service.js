import path from "path";
import fs from "fs";
import {
    createRecord,
    findRecords,
    findRecordById,
    updateRecordById,
    readData,
    writeData
} from "../utils/fileStorage.js";
import { compareVisuals } from "./visualMatcher.service.js";
import { logCaseEvent } from "./timeline.service.js";

/**
 * Execute visual search between a MissingPerson reference photo and DroneVideo candidate person crops
 */
export const startVisualSearch = async ({ missingPersonId, droneVideoId }) => {
    // 1. Validate Missing Person Case
    const mpCase = findRecordById("missing_persons", missingPersonId);
    if (!mpCase) {
        const err = new Error("Missing person record not found");
        err.statusCode = 404;
        throw err;
    }

    if (!mpCase.photoUrl) {
        const err = new Error("Missing person record lacks a reference photograph");
        err.statusCode = 400;
        throw err;
    }

    // Log VISUAL_SEARCH_STARTED event
    await logCaseEvent({
        caseId: mpCase.caseId,
        caseType: "MISSING_PERSON",
        eventType: "VISUAL_SEARCH_STARTED",
        description: `Visual feature matching search initiated against drone footage.`,
        metadata: { missingPersonId: mpCase._id, droneVideoId }
    });

    // 2. Validate Drone Video Record
    const droneVideo = findRecordById("drone_videos", droneVideoId);
    if (!droneVideo) {
        const err = new Error("Drone video record not found");
        err.statusCode = 404;
        throw err;
    }

    if (droneVideo.status !== "COMPLETED") {
        const err = new Error("Drone video analysis must be completed before visual search.");
        err.statusCode = 400;
        throw err;
    }

    // 3. Load Person Detections for Video
    const { records: detections } = findRecords("person_detections", d => d.droneVideoId === droneVideoId);
    if (!detections || detections.length === 0) {
        return {
            missingPersonId,
            droneVideoId,
            totalCompared: 0,
            matchesCount: 0,
            matches: [],
            message: "No candidate person detections found in selected search footage."
        };
    }

    // 4. Resolve Absolute File Paths
    const relativeRefPath = mpCase.photoUrl.replace(/^\/uploads\//, "uploads/");
    const referencePhotoPath = path.join(process.cwd(), relativeRefPath);

    if (!fs.existsSync(referencePhotoPath)) {
        const err = new Error(`Reference photo file missing on server filesystem: ${relativeRefPath}`);
        err.statusCode = 404;
        throw err;
    }

    const outputCropsDir = path.join(process.cwd(), "uploads", "crops");
    const threshold = parseFloat(process.env.VISUAL_MATCH_THRESHOLD) || 0.40;
    const topK = parseInt(process.env.TOP_K_MATCHES, 10) || 5;

    // 5. Run Visual Feature Embedding Comparison
    const compResult = await compareVisuals({
        referencePhotoPath,
        detections,
        outputDir: outputCropsDir,
        threshold,
        topK
    });

    const matchesOutput = compResult.matches || [];
    const savedCandidates = [];

    // 6. Save or Update Match Candidates in File Storage
    const existingCandidates = readData("match_candidates");
    for (const match of matchesOutput) {
        const existingIdx = existingCandidates.findIndex(c =>
            c.missingPersonId === mpCase._id &&
            c.droneVideoId === droneVideo._id &&
            c.personDetectionId === match.person_detection_id
        );

        let candidateRecord;
        const candidateData = {
            missingPersonId: mpCase._id,
            droneVideoId: droneVideo._id,
            personDetectionId: match.person_detection_id,
            frameUrl: match.frame_url,
            personCropUrl: match.crop_url,
            timestampSeconds: match.timestamp_seconds,
            similarityScore: match.similarity_score,
            status: "PENDING_REVIEW"
        };

        if (existingIdx !== -1) {
            candidateRecord = updateRecordById("match_candidates", existingCandidates[existingIdx]._id, candidateData);
        } else {
            candidateRecord = createRecord("match_candidates", candidateData);
        }

        savedCandidates.push(candidateRecord);

        // Log POSSIBLE_MATCH_CREATED event for candidate
        await logCaseEvent({
            caseId: mpCase.caseId,
            caseType: "MISSING_PERSON",
            eventType: "POSSIBLE_MATCH_CREATED",
            description: `Possible visual match candidate detected (Similarity: ${match.similarity_score}).`,
            metadata: {
                matchCandidateId: candidateRecord._id,
                similarityScore: match.similarity_score,
                timestampSeconds: match.timestamp_seconds
            }
        });
    }

    // Optionally update missing person case status to POSSIBLE_MATCH if currently ACTIVE
    if (savedCandidates.length > 0 && mpCase.status === "ACTIVE") {
        updateRecordById("missing_persons", mpCase._id, { status: "POSSIBLE_MATCH" });
    }

    return {
        missingPersonId: mpCase._id,
        droneVideoId: droneVideo._id,
        totalCompared: compResult.total_compared,
        matchesCount: savedCandidates.length,
        matches: savedCandidates
    };
};

/**
 * Retrieve ranked match candidates for a missing person case
 */
export const getMatchCandidates = async (missingPersonId) => {
    const mpExists = findRecordById("missing_persons", missingPersonId);
    if (!mpExists) {
        const err = new Error("Missing person record not found");
        err.statusCode = 404;
        throw err;
    }

    const { records: rawMatches } = findRecords("match_candidates", c => c.missingPersonId === missingPersonId, {
        sortField: "similarityScore",
        sortOrder: "desc"
    });

    const matches = rawMatches.map(mc => {
        const droneVideo = findRecordById("drone_videos", mc.droneVideoId);
        const personDetection = findRecordById("person_detections", mc.personDetectionId);

        return {
            ...mc,
            droneVideoId: droneVideo ? {
                _id: droneVideo._id,
                filename: droneVideo.filename,
                videoUrl: droneVideo.videoUrl,
                createdAt: droneVideo.createdAt
            } : null,
            personDetectionId: personDetection ? {
                _id: personDetection._id,
                confidence: personDetection.confidence,
                boundingBox: personDetection.boundingBox,
                frameNumber: personDetection.frameNumber
            } : null
        };
    });

    return matches;
};

/**
 * Update candidate review status (PENDING_REVIEW, CONFIRMED, REJECTED)
 */
export const updateMatchCandidateStatus = async (matchId, status) => {
    const validStatuses = ["PENDING_REVIEW", "CONFIRMED", "REJECTED"];
    if (!validStatuses.includes(status)) {
        const err = new Error("Invalid status. Allowed values: PENDING_REVIEW, CONFIRMED, REJECTED");
        err.statusCode = 400;
        throw err;
    }

    const updatedCandidate = updateRecordById("match_candidates", matchId, { status });
    if (!updatedCandidate) {
        const err = new Error("Match candidate record not found");
        err.statusCode = 404;
        throw err;
    }

    const mpCase = findRecordById("missing_persons", updatedCandidate.missingPersonId);
    const populatedCandidate = {
        ...updatedCandidate,
        missingPersonId: mpCase ? {
            _id: mpCase._id,
            caseId: mpCase.caseId,
            name: mpCase.name,
            status: mpCase.status
        } : null
    };

    // Log MATCH_CONFIRMED or MATCH_REJECTED event
    if (mpCase && mpCase.caseId) {
        const eventType = status === "CONFIRMED" ? "MATCH_CONFIRMED" : status === "REJECTED" ? "MATCH_REJECTED" : "CASE_STATUS_CHANGED";
        await logCaseEvent({
            caseId: mpCase.caseId,
            caseType: "MISSING_PERSON",
            eventType,
            description: `Responder ${status.toLowerCase()} candidate sighting match (Similarity: ${updatedCandidate.similarityScore}).`,
            metadata: { matchCandidateId: updatedCandidate._id, similarityScore: updatedCandidate.similarityScore }
        });
    }

    return populatedCandidate;
};

export default {
    startVisualSearch,
    getMatchCandidates,
    updateMatchCandidateStatus
};

