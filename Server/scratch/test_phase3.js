import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../src/config/db.js";
import Emergency from "../src/models/Emergency.js";
import { EmergencyService } from "../src/services/emergency.service.js";

dotenv.config();

const runPhase3Tests = async () => {
    console.log("=== Testing Phase 3: Responder Dashboard Backend APIs ===");

    await connectDB();

    // Clear existing test emergencies if needed or work with current DB
    console.log("\n1. Seeding mock emergency records for testing...");

    const seedData = [
        {
            description: "Major apartment fire with trapped residents",
            emergencyType: "FIRE",
            victimCount: 4,
            location: { latitude: 28.6, longitude: 77.2 },
            priorityScore: 90,
            priorityLevel: "CRITICAL",
            status: "REPORTED"
        },
        {
            description: "Flash flood trapping elderly residents in house",
            emergencyType: "FLOOD",
            victimCount: 2,
            location: { latitude: 28.61, longitude: 77.21 },
            priorityScore: 95,
            priorityLevel: "CRITICAL",
            status: "IN_PROGRESS"
        },
        {
            description: "Road accident on highway with severe bleeding",
            emergencyType: "ACCIDENT",
            victimCount: 1,
            location: { latitude: 28.62, longitude: 77.22 },
            priorityScore: 70,
            priorityLevel: "HIGH",
            status: "INVESTIGATING"
        },
        {
            description: "Minor medical assistance request",
            emergencyType: "MEDICAL",
            victimCount: 1,
            location: { latitude: 28.63, longitude: 77.23 },
            priorityScore: 30,
            priorityLevel: "LOW",
            status: "RESOLVED"
        },
        {
            description: "Trail search for lost hiker",
            emergencyType: "TRAIL_SEARCH",
            victimCount: 1,
            location: { latitude: 28.64, longitude: 77.24 },
            priorityScore: 50,
            priorityLevel: "MEDIUM",
            status: "DISMISSED"
        }
    ];

    await Emergency.insertMany(seedData);
    console.log("✅ Seeded 5 test emergencies.");

    // Test 2: GET /api/emergencies pagination & default priority sort
    console.log("\n2. Testing GET /api/emergencies (Whitelisted Priority Sort & Pagination)...");
    const listResult = await EmergencyService.getAllEmergencies({ page: 1, limit: 10, sortField: "priorityScore", sortOrder: -1 });
    console.log(`Total emergencies: ${listResult.pagination.total}`);
    console.log(`First emergency priority: ${listResult.emergencies[0].priorityScore} (${listResult.emergencies[0].emergencyType})`);

    if (listResult.emergencies[0].priorityScore >= listResult.emergencies[1].priorityScore) {
        console.log("✅ Priority sort (descending) PASSED");
    } else {
        console.error("❌ Priority sort FAILED");
    }

    // Test 3: GET /api/emergencies/active
    console.log("\n3. Testing GET /api/emergencies/active...");
    const activeResult = await EmergencyService.getActiveEmergencies({ page: 1, limit: 10 });
    console.log(`Active count returned: ${activeResult.emergencies.length}`);
    const nonActiveCount = activeResult.emergencies.filter(e => e.status === "RESOLVED" || e.status === "DISMISSED").length;

    if (nonActiveCount === 0) {
        console.log("✅ Active emergencies filter PASSED (Only REPORTED, INVESTIGATING, IN_PROGRESS)");
    } else {
        console.error("❌ Active emergencies filter FAILED");
    }

    // Test 4: GET /api/emergencies/stats
    console.log("\n4. Testing GET /api/emergencies/stats (MongoDB Aggregation)...");
    const stats = await EmergencyService.getEmergencyStats();
    console.log("Stats output:", JSON.stringify(stats, null, 2));

    if (stats.total >= 5 && stats.active >= 3 && stats.byType.FIRE >= 1) {
        console.log("✅ Aggregation stats PASSED");
    } else {
        console.error("❌ Aggregation stats FAILED");
    }

    // Test 5: Status Transition Check
    console.log("\n5. Testing Status Update Transition Safety...");
    const resolvedEmergency = listResult.emergencies.find(e => e.status === "RESOLVED");
    if (resolvedEmergency) {
        try {
            await EmergencyService.updateEmergencyStatus(resolvedEmergency._id, "IN_PROGRESS");
            console.error("❌ Status transition check FAILED (Allowed transitioning resolved back to active)");
        } catch (err) {
            console.log(`✅ Status transition safety check PASSED (${err.message})`);
        }
    }

    console.log("\n🎉 Phase 3 Verification Complete!");
    await mongoose.connection.close();
};

runPhase3Tests().catch(err => {
    console.error("Error during test run:", err);
    mongoose.connection.close();
});
