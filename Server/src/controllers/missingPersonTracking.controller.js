import MissingPerson from "../models/MissingPerson.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * Public Missing Person Case Tracking Status Mapper
 */
const getPublicMissingPersonStatusMessage = (status) => {
    switch (status) {
        case "ACTIVE":
            return "Search operation is actively underway across the operational sector.";
        case "POSSIBLE_MATCH":
            return "A potential sighting has been detected and is currently being reviewed by response teams.";
        case "FOUND":
            return "The missing person has been located and confirmed safe.";
        case "CLOSED":
            return "This missing person case has been formally closed.";
        default:
            return "Case status is under active responder review.";
    }
};

/**
 * @desc    Public Missing Person Case Tracking
 * @route   POST /api/missing-persons/track
 * @access  Public (Rate Limited)
 */
export const trackMissingPerson = asyncHandler(async (req, res) => {
    const { caseId } = req.body;
    if (!caseId || typeof caseId !== "string" || caseId.trim().length === 0) {
        return errorResponse(res, "Invalid case ID or tracking credentials.", 401);
    }

    const cleanCaseId = caseId.trim().toUpperCase();
    const mpCase = await MissingPerson.findOne({ caseId: cleanCaseId }).lean();

    if (!mpCase) {
        return errorResponse(res, "Invalid case ID or tracking credentials.", 401);
    }

    // Prepare strictly sanitized public data payload
    const publicPayload = {
        caseId: mpCase.caseId,
        name: mpCase.name,
        age: mpCase.age,
        gender: mpCase.gender,
        status: mpCase.status,
        publicMessage: getPublicMissingPersonStatusMessage(mpCase.status),
        lastSeenArea: mpCase.lastSeenLocation?.address || "Target Sector Location",
        lastSeenAt: mpCase.lastSeenAt,
        lastUpdated: mpCase.updatedAt,
        createdAt: mpCase.createdAt
    };

    return successResponse(res, publicPayload, "Missing person status retrieved successfully", 200);
});

export default {
    trackMissingPerson
};
