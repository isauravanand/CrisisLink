import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import * as matchingService from "../services/matching.service.js";

/**
 * Controller: Initiate visual matching search (POST /api/missing-persons/:id/search)
 */
export const startVisualSearch = asyncHandler(async (req, res) => {
    const { droneVideoId } = req.body;
    const missingPersonId = req.params.id;

    if (!droneVideoId || droneVideoId.trim().length === 0) {
        return errorResponse(res, "Validation failed", 400, [
            { field: "droneVideoId", message: "Drone video ID is required for visual search" }
        ]);
    }

    const searchResult = await matchingService.startVisualSearch({
        missingPersonId,
        droneVideoId
    });

    return successResponse(res, searchResult, "Visual search completed successfully", 200);
});

/**
 * Controller: Get candidate matches for missing person (GET /api/missing-persons/:id/matches)
 */
export const getMatchCandidates = asyncHandler(async (req, res) => {
    const missingPersonId = req.params.id;
    const matches = await matchingService.getMatchCandidates(missingPersonId);
    return successResponse(res, { matches }, "Match candidates retrieved successfully", 200);
});

/**
 * Controller: Update match candidate status (PATCH /api/matches/:id/status)
 */
export const updateMatchCandidateStatus = asyncHandler(async (req, res) => {
    const matchId = req.params.id;
    const { status } = req.body;

    if (!status) {
        return errorResponse(res, "Validation failed", 400, [
            { field: "status", message: "Status is required (PENDING_REVIEW, CONFIRMED, REJECTED)" }
        ]);
    }

    const updatedMatch = await matchingService.updateMatchCandidateStatus(matchId, status);
    return successResponse(res, updatedMatch, `Match candidate status updated to ${status}`, 200);
});

export default {
    startVisualSearch,
    getMatchCandidates,
    updateMatchCandidateStatus
};
