import { Router } from "express";
import {
    startVisualSearch,
    getMatchCandidates,
    updateMatchCandidateStatus
} from "../controllers/matching.controller.js";
import { requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// Apply requireAdmin to all visual matching endpoints
router.use(requireAdmin);

// POST /api/missing-persons/:id/search - Initiate visual feature comparison
router.post("/missing-persons/:id/search", startVisualSearch);

// GET /api/missing-persons/:id/matches - Fetch ranked candidate matches
router.get("/missing-persons/:id/matches", getMatchCandidates);

// PATCH /api/matches/:id/status - Responder review update
router.patch("/matches/:id/status", updateMatchCandidateStatus);

export default router;
