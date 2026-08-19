import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * Service to execute Python visual feature extraction & cosine similarity matching.
 */
export const compareVisuals = async ({ referencePhotoPath, detections, outputDir, threshold = 0.70, topK = 5 }) => {
    const tempJsonPath = path.join(process.cwd(), "uploads", `temp_detections_${Date.now()}_${Math.round(Math.random() * 1e6)}.json`);

    try {
        // Map detections to format expected by compare_visuals.py
        const mappedDetections = detections.map(det => {
            const relativeFramePath = det.frameUrl.replace(/^\/uploads\//, "uploads/");
            return {
                id: det._id.toString(),
                frame_path: path.join(process.cwd(), relativeFramePath),
                frame_url: det.frameUrl,
                timestamp_seconds: det.timestampSeconds,
                bounding_box: det.boundingBox
            };
        });

        // Write temporary JSON file
        fs.writeFileSync(tempJsonPath, JSON.stringify(mappedDetections, null, 2), "utf-8");

        const scriptPath = path.join(process.cwd(), "src", "scripts", "compare_visuals.py");

        const { stdout, stderr } = await execFileAsync("python", [
            scriptPath,
            "--reference", referencePhotoPath,
            "--detections-json", tempJsonPath,
            "--output-dir", outputDir,
            "--threshold", String(threshold),
            "--top-k", String(topK)
        ], { maxBuffer: 10 * 1024 * 1024 });

        if (stderr && stderr.trim().length > 0) {
            console.warn("[VisualMatcher] Python stderr:", stderr);
        }

        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("Invalid output format returned from visual matcher script");
        }

        const resultJson = JSON.parse(jsonMatch[0]);
        if (!resultJson.success) {
            throw new Error(resultJson.error || "Visual matcher python script failed");
        }

        return resultJson;
    } finally {
        // Cleanup temporary JSON file
        if (fs.existsSync(tempJsonPath)) {
            try {
                fs.unlinkSync(tempJsonPath);
            } catch (cleanupErr) {
                console.warn("[VisualMatcher] Failed to cleanup temp JSON file:", cleanupErr);
            }
        }
    }
};

export default {
    compareVisuals
};
