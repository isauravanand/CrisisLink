import { Router } from "express";
import { uploadDroneVideoFile } from "../middleware/droneVideoUpload.middleware.js";
import {
    uploadDroneVideo,
    getDroneVideos,
    getDroneVideoById,
    getDroneVideoDetections
} from "../controllers/droneVideo.controller.js";
import {
    processLiveFrame,
    startLiveSession,
    stopLiveSession
} from "../controllers/liveSearch.controller.js";
import { requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// Apply requireAdmin to all drone video endpoints
router.use(requireAdmin);

// Live Camera Search endpoints
router.post("/live-frame", processLiveFrame);
router.post("/live-session/start", startLiveSession);
router.post("/live-session/stop", stopLiveSession);

// Upload Drone Video file & launch async person detection (MODE 1 Fallback)
router.post("/", uploadDroneVideoFile.single("video"), uploadDroneVideo);

// Get list of drone videos
router.get("/", getDroneVideos);

// Get drone video details
router.get("/:id", getDroneVideoById);

// Get detected candidate frames
router.get("/:id/detections", getDroneVideoDetections);

export default router;
