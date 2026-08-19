import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import { HospitalService } from "../services/hospital.service.js";

/**
 * @desc    ACT Action: AI Criticality Evaluation & Hospital Assignment
 * @route   POST /api/emergencies/:id/act-assign-hospital
 * @access  Protected Admin
 */
export const actAndAssignHospital = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { hospitalId } = req.body || {};

    const result = await HospitalService.actAndAssignHospital(id, hospitalId);
    return successResponse(
        res,
        result,
        `ACT Successful: AI assigned emergency #${id} to ${result.assignedHospital.name}`,
        200
    );
});

/**
 * @desc    Get all regional hospitals with optional distance computation
 * @route   GET /api/hospitals
 * @access  Public / Protected Admin
 */
export const getHospitals = asyncHandler(async (req, res) => {
    const lat = Number(req.query.lat) || 28.6139;
    const lng = Number(req.query.lng) || 77.2090;

    const hospitals = HospitalService.getHospitalsForLocation(lat, lng);
    return successResponse(res, { hospitals }, "Hospitals list retrieved successfully", 200);
});

export default {
    actAndAssignHospital,
    getHospitals
};
