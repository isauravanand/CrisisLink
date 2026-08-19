import { processLiveFrame as processLiveFrameService } from "../services/liveSearch.service.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { findRecordById } from "../utils/fileStorage.js";
import { logCaseEvent } from "../services/timeline.service.js";

/**
 * @desc    Process a live camera frame for real-time YOLO detection & visual matching
 * @route   POST /api/drone-videos/live-frame
 * @access  Protected Admin
 */
export const processLiveFrame = asyncHandler(async (req, res) => {
    const { missingPersonId, image, location } = req.body;
    if (!missingPersonId || !image) {
        return errorResponse(res, "Missing person ID and image data are required.", 400);
    }

    const result = await processLiveFrameService({ missingPersonId, imageBase64: image, location });
    return successResponse(res, result, "Live frame processed successfully", 200);
});

/**
 * @desc    Start a live drone search session
 * @route   POST /api/drone-videos/live-session/start
 * @access  Protected Admin
 */
export const startLiveSession = asyncHandler(async (req, res) => {
    const { missingPersonId } = req.body;
    if (!missingPersonId) {
        return errorResponse(res, "Missing person ID is required to start live search session.", 400);
    }

    const mpCase = findRecordById("missing_persons", missingPersonId);
    if (!mpCase) {
        return errorResponse(res, "Target missing person record not found.", 404);
    }

    await logCaseEvent({
        caseId: mpCase.caseId,
        caseType: "MISSING_PERSON",
        eventType: "LIVE_SEARCH_STARTED",
        description: `Simulated drone live camera search session initiated for ${mpCase.name}.`,
        metadata: { missingPersonId: mpCase._id }
    });

    return successResponse(res, {
        sessionStarted: true,
        caseId: mpCase.caseId,
        name: mpCase.name
    }, "Live search session started", 200);
});

/**
 * @desc    Stop a live drone search session
 * @route   POST /api/drone-videos/live-session/stop
 * @access  Protected Admin
 */
export const stopLiveSession = asyncHandler(async (req, res) => {
    const { missingPersonId } = req.body;
    if (missingPersonId) {
        const mpCase = findRecordById("missing_persons", missingPersonId);
        if (mpCase) {
            await logCaseEvent({
                caseId: mpCase.caseId,
                caseType: "MISSING_PERSON",
                eventType: "LIVE_SEARCH_STOPPED",
                description: `Simulated drone live camera search session stopped for ${mpCase.name}.`,
                metadata: { missingPersonId: mpCase._id }
            });
        }
    }

    return successResponse(res, { sessionStopped: true }, "Live search session stopped", 200);
});

export default {
    processLiveFrame,
    startLiveSession,
    stopLiveSession
};

