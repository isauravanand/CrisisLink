import { EmergencyService } from "../services/emergency.service.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { performSystemReset } from "../../scripts/resetData.js";

/**
 * @desc    Reset all system data (Emergencies, Missing Persons, Drone Videos, Uploads)
 * @route   POST /api/emergencies/reset-system-data
 * @access  Protected Admin
 */
export const resetSystemData = asyncHandler(async (req, res) => {
    const result = await performSystemReset();
    return successResponse(
        res,
        result,
        "System data reset complete: All emergencies, missing persons, drone videos, and media uploads cleared.",
        200
    );
});

/**
 * @desc    Create a new emergency report
 * @route   POST /api/emergencies
 * @access  Public
 */
export const createEmergency = asyncHandler(async (req, res) => {
    let payload = { ...req.body };

    // Handle FormData stringified location parsing
    if (typeof payload.location === "string") {
        try {
            payload.location = JSON.parse(payload.location);
        } catch {
            payload.location = { latitude: 28.6139, longitude: 77.2090, address: "User Report Location" };
        }
    }

    // Attach uploaded injury photo URL if present
    if (req.file) {
        payload.photoUrl = `/uploads/injuries/${req.file.filename}`;
        payload.injuryPhotoUrl = payload.photoUrl;
    }

    const emergency = await EmergencyService.createEmergency(payload);
    return successResponse(res, emergency, "Emergency report & AI automated reply generated successfully", 201);
});

/**
 * @desc    Public incident status tracking (Case ID only)
 * @route   POST /api/emergencies/track
 * @access  Public (Rate-Limited)
 */
export const trackEmergency = asyncHandler(async (req, res) => {
    const { caseId } = req.body;
    if (!caseId) {
        return errorResponse(res, "Case ID is required", 400);
    }
    const trackedData = await EmergencyService.trackEmergency(caseId);
    return successResponse(res, trackedData, "Incident status verified successfully", 200);
});

/**
 * @desc    Refresh public incident status via short-lived tracking session token
 * @route   GET /api/emergencies/track/session
 * @access  Public
 */
export const refreshTrackedEmergency = asyncHandler(async (req, res) => {
    let token = null;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
        return errorResponse(res, "Tracking session token is missing", 401);
    }
    const trackedData = await EmergencyService.getTrackedEmergencyBySession(token);
    return successResponse(res, trackedData, "Incident status refreshed successfully", 200);
});

/**
 * @desc    Get all emergency reports (with whitelisted filtering, sorting & pagination)
 * @route   GET /api/emergencies
 * @access  Protected Admin
 */
export const getEmergencies = asyncHandler(async (req, res) => {
    const queryParams = req.sanitizedQuery || req.query;
    const result = await EmergencyService.getAllEmergencies(queryParams);
    return successResponse(res, result, "Emergency reports retrieved successfully", 200);
});

/**
 * @desc    Get active emergencies (REPORTED, INVESTIGATING, IN_PROGRESS)
 * @route   GET /api/emergencies/active
 * @access  Protected Admin
 */
export const getActiveEmergencies = asyncHandler(async (req, res) => {
    const queryParams = req.sanitizedQuery || req.query;
    const result = await EmergencyService.getActiveEmergencies(queryParams);
    return successResponse(res, result, "Active emergencies retrieved successfully", 200);
});

/**
 * @desc    Get responder dashboard aggregate statistics
 * @route   GET /api/emergencies/stats
 * @access  Protected Admin
 */
export const getEmergencyStats = asyncHandler(async (req, res) => {
    const stats = await EmergencyService.getEmergencyStats();
    return successResponse(res, stats, "Emergency statistics retrieved successfully", 200);
});

/**
 * @desc    Get single emergency report by ID
 * @route   GET /api/emergencies/:id
 * @access  Protected Admin
 */
export const getEmergencyById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const emergency = await EmergencyService.getEmergencyById(id);
    return successResponse(res, emergency, "Emergency report retrieved successfully", 200);
});

/**
 * @desc    Update emergency status
 * @route   PATCH /api/emergencies/:id/status
 * @access  Protected Admin
 */
export const updateEmergencyStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const updatedEmergency = await EmergencyService.updateEmergencyStatus(id, status);
    return successResponse(res, updatedEmergency, `Emergency status updated to '${status}' successfully`, 200);
});

export default {
    createEmergency,
    trackEmergency,
    refreshTrackedEmergency,
    getEmergencies,
    getActiveEmergencies,
    getEmergencyStats,
    getEmergencyById,
    updateEmergencyStatus,
    resetSystemData
};
