import dotenv from "dotenv";
import mongoose from "mongoose";
import readline from "readline";
import connectDB from "../config/db.js";

// Import all LifeLine models
import Emergency from "../models/Emergency.js";
import MissingPerson from "../models/MissingPerson.js";
import DroneVideo from "../models/DroneVideo.js";
import PersonDetection from "../models/PersonDetection.js";
import MatchCandidate from "../models/MatchCandidate.js";
import CaseEvent from "../models/CaseEvent.js";
import Admin from "../models/Admin.js";

dotenv.config();

const env = process.env.NODE_ENV || "development";

// Safety check 1: Refuse to run in production
if (env === "production") {
    console.error("ERROR: Database reset command is strictly forbidden in PRODUCTION environment!");
    process.exit(1);
}

const collectionsToClear = [
    { name: "CaseEvent", model: CaseEvent },
    { name: "DroneVideo", model: DroneVideo },
    { name: "Emergency", model: Emergency },
    { name: "MatchCandidate", model: MatchCandidate },
    { name: "MissingPerson", model: MissingPerson },
    { name: "PersonDetection", model: PersonDetection },
    { name: "Admin", model: Admin }
];

const performReset = async () => {
    try {
        console.log("\n==================================================");
        console.log("WARNING: DEVELOPMENT DATABASE RESET");
        console.log("==================================================");
        console.log(`Environment: ${env}`);
        console.log(`MongoDB URI: ${process.env.MONGODB_URI || "mongodb://localhost:27017/lifeline_ai"}\n`);
        console.log("Collections to clear:");
        collectionsToClear.forEach((col) => console.log(`- ${col.name}`));
        console.log("==================================================\n");

        const shouldReset = process.env.CONFIRM_DB_RESET === "true";

        if (!shouldReset) {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            const answer = await new Promise((resolve) => {
                rl.question("Continue? (y/N): ", (ans) => {
                    rl.close();
                    resolve(ans.trim().toLowerCase());
                });
            });

            if (answer !== "y" && answer !== "yes") {
                console.log("Database reset cancelled by user.");
                process.exit(0);
            }
        } else {
            console.log("CONFIRM_DB_RESET=true detected. Proceeding automatically...\n");
        }

        // Connect to MongoDB
        await connectDB();

        console.log("\nClearing LifeLine application data...");
        for (const col of collectionsToClear) {
            const result = await col.model.deleteMany({});
            console.log(`- Cleared ${col.name} (${result.deletedCount} documents deleted)`);
        }

        console.log("\n==================================================");
        console.log("SUCCESS: Development database reset completed.");
        console.log("==================================================\n");

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error("\nDatabase reset failed:", error);
        await mongoose.connection.close();
        process.exit(1);
    }
};

performReset();
