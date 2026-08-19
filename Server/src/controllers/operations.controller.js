import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import * as operationsService from "../services/operations.service.js";
import * as timelineService from "../services/timeline.service.js";
import * as noZoneService from "../services/noZone.service.js";

/**
 * Controller: Get operational map markers with valid coordinates (GET /api/operations/map)
 */
export const getOperationsMap = asyncHandler(async (req, res) => {
    const points = await operationsService.getOperationsMapPoints();
    return successResponse(res, { points }, "Operations map points retrieved successfully", 200);
});

/**
 * Controller: Get No Zone Area telemetry with danger zones & supplies (GET /api/operations/no-zone)
 */
export const getNoZoneData = asyncHandler(async (req, res) => {
    const data = await noZoneService.getNoZoneData();
    return successResponse(res, data, "No zone area telemetry retrieved successfully", 200);
});

/**
 * Controller: Get chronological case audit timeline events (GET /api/cases/:id/timeline)
 */
export const getCaseTimeline = asyncHandler(async (req, res) => {
    const caseId = req.params.id;
    const events = await timelineService.getCaseTimeline(caseId);
    return successResponse(res, { events }, "Case timeline events retrieved successfully", 200);
});

/**
 * Controller: Get chronological location history & sightings (GET /api/missing-persons/:id/sightings)
 */
export const getMissingPersonSightings = asyncHandler(async (req, res) => {
    const missingPersonId = req.params.id;
    const history = await operationsService.getMissingPersonSightings(missingPersonId);
    return successResponse(res, { history }, "Missing person sightings retrieved successfully", 200);
});

export default {
    getOperationsMap,
    getNoZoneData,
    getCaseTimeline,
    getMissingPersonSightings
};

