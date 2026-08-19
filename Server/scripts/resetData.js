import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import Emergency from "../src/models/Emergency.js";
import { writeData } from "../src/utils/fileStorage.js";

dotenv.config();

const clearDirectoryFiles = (dirPath) => {
    if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            if (fs.statSync(filePath).isFile()) {
                fs.unlinkSync(filePath);
            }
        }
    }
};

export const performSystemReset = async () => {
    // 1. Reset MongoDB Emergency collection
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/lifeline";
    let isConnectedHere = false;

    if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(mongoUri);
        isConnectedHere = true;
    }

    const emergencyResult = await Emergency.deleteMany({});
    console.log(`[Reset] Cleared ${emergencyResult.deletedCount} emergencies from MongoDB.`);

    // 2. Reset JSON File Storage
    writeData("missing_persons", []);
    writeData("drone_videos", []);
    writeData("match_candidates", []);
    console.log("[Reset] Cleared missing_persons.json, drone_videos.json, and match_candidates.json.");

    // 3. Clear uploaded media folders
    const baseUploadsDir = path.join(process.cwd(), "uploads");
    clearDirectoryFiles(path.join(baseUploadsDir, "missing-persons"));
    clearDirectoryFiles(path.join(baseUploadsDir, "injuries"));
    clearDirectoryFiles(path.join(baseUploadsDir, "drone-videos"));
    console.log("[Reset] Cleaned upload directories: missing-persons, injuries, drone-videos.");

    if (isConnectedHere) {
        await mongoose.disconnect();
    }

    return {
        emergenciesDeleted: emergencyResult.deletedCount,
        jsonReset: ["missing_persons", "drone_videos", "match_candidates"],
        uploadsCleared: true
    };
};

// Execute directly if run as a standalone CLI script
if (process.argv[1] && process.argv[1].includes("resetData.js")) {
    performSystemReset()
        .then((res) => {
            console.log("=========================================");
            console.log(" SYSTEM DATA RESET COMPLETE SUCCESSFULLY");
            console.log("=========================================");
            console.log(res);
            process.exit(0);
        })
        .catch((err) => {
            console.error("[Reset Failed]:", err);
            process.exit(1);
        });
}
