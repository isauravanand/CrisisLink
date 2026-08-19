import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import * as missingPersonService from "../services/missingPerson.service.js";

/**
 * Controller: Register a new Missing Person case (POST /api/missing-persons)
 */
export const createMissingPerson = asyncHandler(async (req, res) => {
    if (!req.file) {
        return errorResponse(res, "Validation failed", 400, [
            { field: "photo", message: "A clear photograph is required for missing person registration" }
        ]);
    }

    const {
        name,
        age,
        gender,
        description,
        lastSeenLocation,
        lastSeenAt,
        clothingDescription,
        identifyingFeatures,
        contactName,
        contactPhone
    } = req.body;

    // Field Validations
    const errors = [];
    if (!name || name.trim().length === 0) {
        errors.push({ field: "name", message: "Full name is required" });
    }

    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 120) {
        errors.push({ field: "age", message: "Valid age between 1 and 120 is required" });
    }

    if (!lastSeenAt || isNaN(Date.parse(lastSeenAt))) {
        errors.push({ field: "lastSeenAt", message: "Valid last seen date and time is required" });
    }

    // Parse location object if passed as stringified JSON or body fields
    let locationObj = { latitude: 28.6139, longitude: 77.2090, address: "Delhi" };
    if (typeof lastSeenLocation === "string") {
        try {
            locationObj = JSON.parse(lastSeenLocation);
        } catch {
            // Keep default
        }
    } else if (lastSeenLocation && typeof lastSeenLocation === "object") {
        locationObj = lastSeenLocation;
    }

    if (errors.length > 0) {
        return errorResponse(res, "Validation failed", 400, errors);
    }

    // Relative public photo URL
    const photoUrl = `/uploads/missing-persons/${req.file.filename}`;

    const newCase = await missingPersonService.createMissingPersonCase({
        name: name.trim(),
        age: parsedAge,
        gender: gender || "Prefer not to say",
        photoUrl,
        description: description || "",
        lastSeenLocation: {
            latitude: parseFloat(locationObj.latitude) || 28.6139,
            longitude: parseFloat(locationObj.longitude) || 77.2090,
            address: locationObj.address || ""
        },
        lastSeenAt: new Date(lastSeenAt),
        clothingDescription: clothingDescription || "",
        identifyingFeatures: identifyingFeatures || "",
        contactName: contactName ? contactName.trim() : "",
        contactPhone: contactPhone ? contactPhone.trim() : ""
    });

    return successResponse(res, newCase, "Missing person case registered successfully", 201);
});

/**
 * Controller: Get all missing person cases with pagination & filters (GET /api/missing-persons)
 */
export const getMissingPersons = asyncHandler(async (req, res) => {
    const result = await missingPersonService.getAllMissingPersons(req.query);
    return successResponse(res, result, "Missing person cases retrieved successfully", 200);
});

/**
 * Controller: Get active missing person cases (GET /api/missing-persons/active)
 */
export const getActiveMissingPersons = asyncHandler(async (req, res) => {
    const result = await missingPersonService.getActiveMissingPersons(req.query);
    return successResponse(res, result, "Active missing person cases retrieved successfully", 200);
});

/**
 * Controller: Get single missing person case by ID (GET /api/missing-persons/:id)
 */
export const getMissingPersonById = asyncHandler(async (req, res) => {
    const caseRecord = await missingPersonService.getMissingPersonById(req.params.id);
    return successResponse(res, caseRecord, "Missing person case details retrieved successfully", 200);
});

/**
 * Controller: Update missing person status (PATCH /api/missing-persons/:id/status)
 */
export const updateMissingPersonStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!status) {
        return errorResponse(res, "Validation failed", 400, [
            { field: "status", message: "Status is required" }
        ]);
    }

    const updatedCase = await missingPersonService.updateMissingPersonStatus(req.params.id, status);
    return successResponse(res, updatedCase, "Missing person case status updated successfully", 200);
});

export default {
    createMissingPerson,
    getMissingPersons,
    getActiveMissingPersons,
    getMissingPersonById,
    updateMissingPersonStatus
};
