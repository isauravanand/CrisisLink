import { Router } from "express";
import {
    getOperationsMap,
    getNoZoneData,
    getCaseTimeline,
    getMissingPersonSightings
} from "../controllers/operations.controller.js";
import { requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// GET /api/operations/no-zone - Public No Zone Area map data, danger zones & relief supplies
router.get("/operations/no-zone", getNoZoneData);

// Apply requireAdmin to protected operations & timeline endpoints
router.use(requireAdmin);

// GET /api/operations/map - Operational map markers with valid coordinates
router.get("/operations/map", getOperationsMap);

// GET /api/cases/:id/timeline - Chronological audit timeline events
router.get("/cases/:id/timeline", getCaseTimeline);

// GET /api/missing-persons/:id/sightings - Chronological location history & candidate sightings
router.get("/missing-persons/:id/sightings", getMissingPersonSightings);

export default router;

