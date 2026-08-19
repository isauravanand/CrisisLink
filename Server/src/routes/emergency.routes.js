import express from "express";
import {
    createEmergency,
    trackEmergency,
    refreshTrackedEmergency,
    getActiveEmergencies,
    getEmergencies,
    getEmergencyById,
    getEmergencyStats,
    updateEmergencyStatus,
    resetSystemData
} from "../controllers/emergency.controller.js";
import {
    actAndAssignHospital,
    getHospitals
} from "../controllers/hospital.controller.js";
import {
    validateCreateEmergency,
    validateEmergencyQuery,
    validateUpdateStatus
} from "../middleware/validateEmergency.middleware.js";
import { uploadInjuryPhoto } from "../middleware/upload.middleware.js";
import { requireAdmin } from "../middleware/auth.middleware.js";
import trackRateLimiter from "../middleware/rateLimiter.middleware.js";

const router = express.Router();

// Base route: /api/emergencies

// 1. PUBLIC: Submit emergency report with optional photo upload & AI automated reply
router.post("/", uploadInjuryPhoto.single("photo"), validateCreateEmergency, createEmergency);

// 2. PUBLIC: Incident tracking verification (Rate-Limited)
router.post("/track", trackRateLimiter, trackEmergency);

// 3. PUBLIC: Incident status refresh via session token
router.get("/track/session", refreshTrackedEmergency);

// 4. PUBLIC: Get hospitals directory
router.get("/hospitals", getHospitals);

// 5. PROTECTED ADMIN: Query emergencies list
router.get("/", requireAdmin, validateEmergencyQuery, getEmergencies);

// 6. PROTECTED ADMIN: Aggregate stats endpoint
router.get("/stats", requireAdmin, getEmergencyStats);

// 7. PROTECTED ADMIN: Active emergencies endpoint
router.get("/active", requireAdmin, validateEmergencyQuery, getActiveEmergencies);

// 8. PROTECTED ADMIN: Single emergency details
router.get("/:id", requireAdmin, getEmergencyById);

// 9. PROTECTED ADMIN: Emergency status update
router.patch("/:id/status", requireAdmin, validateUpdateStatus, updateEmergencyStatus);

// 10. PROTECTED ADMIN: ACT Action - AI Criticality Evaluation & Hospital Assignment
router.post("/:id/act-assign-hospital", requireAdmin, actAndAssignHospital);

// 11. PROTECTED ADMIN: System Data Reset
router.post("/reset-system-data", requireAdmin, resetSystemData);

export default router;

