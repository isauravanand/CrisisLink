import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import readline from "readline";
import {
    createRecord,
    findRecordById,
    updateRecordById
} from "../utils/fileStorage.js";
import { logCaseEvent } from "./timeline.service.js";

// Persistent Daemon Process Instance
let daemonProcess = null;
let daemonRl = null;
let requestQueue = [];

const initDaemonProcess = () => {
    if (daemonProcess && !daemonProcess.killed) {
        return daemonProcess;
    }

    const daemonScript = path.join(process.cwd(), "src", "scripts", "live_matcher_daemon.py");
    console.log("[LiveSearchService] Starting persistent Python detection daemon...");

    daemonProcess = spawn("python", [daemonScript], {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, PYTHONUNBUFFERED: "1" }
    });

    daemonRl = readline.createInterface({
        input: daemonProcess.stdout,
        crlfDelay: Infinity
    });

    daemonRl.on("line", (line) => {
        const currentReq = requestQueue.shift();
        if (currentReq) {
            try {
                const json = JSON.parse(line);
                currentReq.resolve(json);
            } catch (err) {
                currentReq.reject(new Error("Failed to parse daemon response JSON"));
            }
        }
    });

    daemonProcess.stderr.on("data", (data) => {
        const msg = data.toString().trim();
        if (msg) console.log("[LiveDaemon]", msg);
    });

    daemonProcess.on("exit", (code) => {
        console.warn(`[LiveSearchService] Python daemon exited with code ${code}. Cleaning up queues.`);
        while (requestQueue.length > 0) {
            const req = requestQueue.shift();
            req.reject(new Error("Python detection daemon exited unexpectedly"));
        }
        daemonProcess = null;
        daemonRl = null;
    });

    return daemonProcess;
};

const sendDaemonRequest = (payload) => {
    return new Promise((resolve, reject) => {
        try {
            const proc = initDaemonProcess();
            requestQueue.push({ resolve, reject });
            proc.stdin.write(JSON.stringify(payload) + "\n");
        } catch (err) {
            reject(err);
        }
    });
};

/**
 * Process a single live camera frame sent from the frontend simulated drone interface.
 */
export const processLiveFrame = async ({ missingPersonId, imageBase64, location = {} }) => {
    if (!missingPersonId) {
        const err = new Error("Missing person ID is required for live camera search.");
        err.statusCode = 400;
        throw err;
    }

    if (!imageBase64 || typeof imageBase64 !== "string") {
        const err = new Error("Valid base64 image data is required.");
        err.statusCode = 400;
        throw err;
    }

    // 1. Verify Missing Person Target
    const mpCase = findRecordById("missing_persons", missingPersonId);
    if (!mpCase) {
        const err = new Error("Target missing person record not found.");
        err.statusCode = 404;
        throw err;
    }

    if (!mpCase.photoUrl) {
        const err = new Error("Missing person record lacks a reference photograph.");
        err.statusCode = 400;
        throw err;
    }

    // 2. Decode base64 image and save to disk
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const uploadsFramesDir = path.join(process.cwd(), "uploads", "frames");
    const uploadsCropsDir = path.join(process.cwd(), "uploads", "crops");
    fs.mkdirSync(uploadsFramesDir, { recursive: true });
    fs.mkdirSync(uploadsCropsDir, { recursive: true });

    const timestamp = Date.now();
    const frameFilename = `live_frame_${timestamp}.jpg`;
    const framePath = path.join(uploadsFramesDir, frameFilename);

    fs.writeFileSync(framePath, buffer);

    // 3. Resolve Reference Photo Absolute Path
    const relativeRefPath = mpCase.photoUrl.replace(/^\/uploads\//, "uploads/");
    const referencePhotoPath = path.join(process.cwd(), relativeRefPath);

    if (!fs.existsSync(referencePhotoPath)) {
        // Clean up frame file if ref photo missing
        if (fs.existsSync(framePath)) fs.unlinkSync(framePath);
        const err = new Error(`Reference photo file missing on server filesystem: ${relativeRefPath}`);
        err.statusCode = 404;
        throw err;
    }

    // 4. Send Request to Persistent Python Daemon
    const threshold = parseFloat(process.env.VISUAL_MATCH_THRESHOLD) || 0.30;

    try {
        const resultJson = await sendDaemonRequest({
            frame: framePath,
            reference: referencePhotoPath,
            crops_dir: uploadsCropsDir,
            frames_dir: uploadsFramesDir,
            threshold,
            name: mpCase.name || "Missing Person"
        });

        if (!resultJson.success) {
            if (fs.existsSync(framePath)) fs.unlinkSync(framePath);
            throw new Error(resultJson.error || "Live camera visual matching script failed.");
        }

        const personsDetected = resultJson.persons_detected || 0;
        const bestMatch = resultJson.best_match;
        const allCandidates = resultJson.all_candidates || [];

        if (personsDetected === 0 || !bestMatch) {
            // Clean up un-matched frame file to save disk space
            if (fs.existsSync(framePath)) fs.unlinkSync(framePath);
            return {
                personsDetected: 0,
                hasPossibleMatch: false,
                allCandidates: [],
                message: "No person detected in live frame view."
            };
        }

        const similarityScore = parseFloat(bestMatch.similarity_score);
        const hasMatch = resultJson.has_possible_match || similarityScore >= threshold;

        if (!hasMatch) {
            // Clean up un-matched frame file to save disk space
            if (fs.existsSync(framePath)) fs.unlinkSync(framePath);
            return {
                personsDetected,
                hasPossibleMatch: false,
                similarityScore,
                cropUrl: bestMatch.crop_url,
                annotatedFrameUrl: resultJson.annotated_frame_url,
                allCandidates,
                message: `Person detected (${personsDetected}), visual similarity (${(similarityScore * 100).toFixed(0)}%) below threshold.`
            };
        }

        // 5. Create MatchCandidate in local file storage for valid matches
        const candidateRecord = createRecord("match_candidates", {
            missingPersonId: mpCase._id,
            source: "LIVE_CAMERA",
            sightingLocation: {
                latitude: location.latitude || null,
                longitude: location.longitude || null,
                address: location.address || "Live Mobile Camera GPS Sighting"
            },
            frameUrl: resultJson.annotated_frame_url || `/uploads/frames/${frameFilename}`,
            personCropUrl: bestMatch.crop_url,
            timestampSeconds: 0,
            similarityScore,
            status: "PENDING_REVIEW"
        });

        // 6. Update MissingPerson status to POSSIBLE_MATCH if ACTIVE
        if (mpCase.status === "ACTIVE") {
            updateRecordById("missing_persons", mpCase._id, { status: "POSSIBLE_MATCH" });
        }

        // 7. Log Case Timeline Event
        await logCaseEvent({
            caseId: mpCase.caseId,
            caseType: "MISSING_PERSON",
            eventType: "POSSIBLE_MATCH_CREATED",
            description: `Live camera search detected possible match for ${mpCase.name} (Similarity: ${(similarityScore * 100).toFixed(1)}%).`,
            metadata: {
                matchCandidateId: candidateRecord._id,
                similarityScore,
                source: "LIVE_CAMERA",
                location
            }
        });

        return {
            personsDetected,
            hasPossibleMatch: true,
            matchCandidate: candidateRecord,
            allCandidates,
            annotatedFrameUrl: resultJson.annotated_frame_url,
            missingPerson: {
                id: mpCase._id,
                caseId: mpCase.caseId,
                name: mpCase.name
            }
        };

    } catch (err) {
        if (fs.existsSync(framePath)) fs.unlinkSync(framePath);
        console.error("Live frame processing error:", err);
        throw err;
    }
};

export default {
    processLiveFrame
};


