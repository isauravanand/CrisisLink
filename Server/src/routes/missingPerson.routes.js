import { Router } from "express";
import {
    createMissingPerson,
    getMissingPersons,
    getActiveMissingPersons,
    getMissingPersonById,
    updateMissingPersonStatus
} from "../controllers/missingPerson.controller.js";
import { trackMissingPerson } from "../controllers/missingPersonTracking.controller.js";
import { uploadMissingPersonPhoto } from "../middleware/upload.middleware.js";
import { requireAdmin } from "../middleware/auth.middleware.js";
import trackRateLimiter from "../middleware/rateLimiter.middleware.js";

const router = Router();

// PUBLIC: Register missing person (with photo upload)
router.post("/", uploadMissingPersonPhoto.single("photo"), createMissingPerson);

// PUBLIC: Track missing person case (Rate limited)
router.post("/track", trackRateLimiter, trackMissingPerson);

// PROTECTED ADMIN: Get active missing person cases
router.get("/active", requireAdmin, getActiveMissingPersons);

// PROTECTED ADMIN: Get all missing person cases
router.get("/", requireAdmin, getMissingPersons);

// PROTECTED ADMIN: Get single missing person case by ID
router.get("/:id", requireAdmin, getMissingPersonById);

// PROTECTED ADMIN: Update missing person status
router.patch("/:id/status", requireAdmin, updateMissingPersonStatus);

export default router;
