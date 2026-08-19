import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import {
    createRecord,
    findRecordById,
    updateRecordById
} from "../utils/fileStorage.js";
import { logCaseEvent } from "./timeline.service.js";

const execFileAsync = promisify(execFile);

/**
 * Background Asynchronous Drone Video Processing Service
 */
export const processDroneVideo = async (droneVideoId) => {
    try {
        const droneVideo = findRecordById("drone_videos", droneVideoId);
        if (!droneVideo) {
            console.error(`[VideoProcessor] DroneVideo with ID ${droneVideoId} not found.`);
            return;
        }

        // 1. Update Status to PROCESSING
        updateRecordById("drone_videos", droneVideoId, {
            status: "PROCESSING",
            processingStartedAt: new Date().toISOString(),
            error: null
        });

        // Prepare absolute paths
        const relativePath = droneVideo.videoUrl.replace(/^\/uploads\//, "uploads/");
        const absoluteVideoPath = path.join(process.cwd(), relativePath);

        const detectionsOutputDir = path.join(process.cwd(), "uploads", "detections");
        if (!fs.existsSync(detectionsOutputDir)) {
            fs.mkdirSync(detectionsOutputDir, { recursive: true });
        }

        const scriptPath = path.join(process.cwd(), "src", "scripts", "detect_persons.py");

        const interval = parseFloat(process.env.VIDEO_FRAME_INTERVAL) || 1.0;
        const threshold = parseFloat(process.env.PERSON_DETECTION_THRESHOLD) || 0.40;

        console.log(`[VideoProcessor] Starting analysis on ${droneVideo.filename} (Interval: ${interval}s, Threshold: ${threshold})`);

        // 2. Invoke Python Script
        const { stdout, stderr } = await execFileAsync("python", [
            scriptPath,
            "--video", absoluteVideoPath,
            "--output-dir", detectionsOutputDir,
            "--interval", String(interval),
            "--threshold", String(threshold)
        ], { maxBuffer: 10 * 1024 * 1024 });

        if (stderr && stderr.trim().length > 0) {
            console.warn(`[VideoProcessor] Python warning/stderr:`, stderr);
        }

        // 3. Parse Detection Results Safely
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("Invalid output format from person detector script");
        }
        const resultJson = JSON.parse(jsonMatch[0]);

        if (!resultJson || !resultJson.success) {
            throw new Error(resultJson?.error || "Python person detector returned failed status");
        }

        // 4. Save Detections
        const detections = resultJson.detections || [];
        const createdDetections = [];

        for (const det of detections) {
            const frameUrl = `/uploads/detections/${det.frame_filename}`;
            const detectionRecord = createRecord("person_detections", {
                droneVideoId: droneVideo._id,
                missingPersonId: droneVideo.missingPersonId || null,
                frameUrl,
                timestampSeconds: det.timestamp_seconds,
                frameNumber: det.frame_number,
                confidence: det.confidence,
                boundingBox: det.bounding_box
            });
            createdDetections.push(detectionRecord);
        }

        // 5. Update DroneVideo Record to COMPLETED
        updateRecordById("drone_videos", droneVideoId, {
            status: "COMPLETED",
            duration: resultJson.duration_seconds || 0,
            totalFrames: resultJson.total_video_frames || 0,
            processedFrames: resultJson.total_frames_sampled || 0,
            personDetectionsCount: createdDetections.length,
            processingCompletedAt: new Date().toISOString()
        });

        if (droneVideo.caseId) {
            await logCaseEvent({
                caseId: droneVideo.caseId,
                caseType: "MISSING_PERSON",
                eventType: "VIDEO_PROCESSING_COMPLETED",
                description: `Drone video processing completed. Extracted ${createdDetections.length} candidate person detection frame(s).`,
                metadata: { droneVideoId: droneVideo._id, detectionsCount: createdDetections.length }
            });
        }

        console.log(`[VideoProcessor] Completed analysis on ${droneVideo.filename}. Detected ${createdDetections.length} candidate frame(s).`);

    } catch (err) {
        console.error(`[VideoProcessor] Processing failed for ID ${droneVideoId}:`, err);
        try {
            updateRecordById("drone_videos", droneVideoId, {
                status: "FAILED",
                error: err.message || "Video analysis encountered an error"
            });
        } catch (updateErr) {
            console.error(`[VideoProcessor] Failed to update error status for ${droneVideoId}:`, updateErr);
        }
    }
};

export default {
    processDroneVideo
};

