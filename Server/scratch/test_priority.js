import { PriorityService } from "../src/services/priority/priority.service.js";

console.log("=== Testing LifeLine AI Priority Engine ===");

// Test 1: Critical Flood Scenario
const criticalAnalysis = {
    emergencyType: "flood",
    victimCount: 1,
    immediateDanger: true,
    elderly: true,
    child: false,
    mobilityIssue: true,
    injury: false,
    bleeding: false,
    trapped: true,
    waterRising: true,
    summary: "Elderly person with mobility limitations trapped in flooded building."
};

const result1 = PriorityService.calculatePriority(criticalAnalysis, 1);
console.log("\n[Test 1] Critical Flood Scenario:");
console.log("Score:", result1.priorityScore);
console.log("Level:", result1.priorityLevel);
console.log("Breakdown:", result1.breakdown);

if (result1.priorityScore >= 80 && result1.priorityLevel === "CRITICAL") {
    console.log("✅ Test 1 PASSED: Classified as CRITICAL");
} else {
    console.error("❌ Test 1 FAILED");
    process.exit(1);
}

// Test 2: Low Priority Scenario
const lowAnalysis = {
    emergencyType: "other",
    victimCount: 1,
    immediateDanger: false,
    elderly: false,
    child: false,
    mobilityIssue: false,
    injury: false,
    bleeding: false,
    trapped: false,
    waterRising: false,
    summary: "General inquiry."
};

const result2 = PriorityService.calculatePriority(lowAnalysis, 1);
console.log("\n[Test 2] Low Priority Scenario:");
console.log("Score:", result2.priorityScore);
console.log("Level:", result2.priorityLevel);

if (result2.priorityLevel === "LOW" || result2.priorityLevel === "MEDIUM") {
    console.log("✅ Test 2 PASSED");
} else {
    console.error("❌ Test 2 FAILED");
    process.exit(1);
}

// Test 3: Multiple Victims & Bleeding Scenario
const highAnalysis = {
    emergencyType: "accident",
    victimCount: 5,
    immediateDanger: false,
    elderly: false,
    child: false,
    mobilityIssue: false,
    injury: true,
    bleeding: true,
    trapped: true,
    waterRising: false,
    summary: "Traffic accident with multiple injured and trapped passengers."
};

const result3 = PriorityService.calculatePriority(highAnalysis, 5);
console.log("\n[Test 3] High Priority Scenario:");
console.log("Score:", result3.priorityScore);
console.log("Level:", result3.priorityLevel);

if (result3.priorityLevel === "HIGH" || result3.priorityLevel === "CRITICAL") {
    console.log("✅ Test 3 PASSED");
} else {
    console.error("❌ Test 3 FAILED");
    process.exit(1);
}

console.log("\n🎉 All Priority Engine unit tests passed successfully!");
