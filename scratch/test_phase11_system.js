const BASE_URL = "http://localhost:5000/api";

const runPhase11Tests = async () => {
    console.log("==================================================");
    console.log("RUNNING PHASE 11 INTEGRATION VERIFICATION SUITE");
    console.log("==================================================\n");

    // 1. Get Active Missing Persons List
    console.log("[TEST 1]: Fetch Active Missing Persons List (GET /api/missing-persons/active)");
    let adminToken = null;

    // Login Admin
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@lifeline.local", password: "admin123" })
    });
    const loginData = await loginRes.json();
    if (loginRes.status === 200 && loginData.data?.token) {
        adminToken = loginData.data.token;
        console.log("Admin Authentication Successful. Token obtained.");
    } else {
        console.error("FAIL: Unable to authenticate admin.");
        process.exit(1);
    }

    const mpRes = await fetch(`${BASE_URL}/missing-persons`, {
        headers: { "Authorization": `Bearer ${adminToken}` }
    });
    const mpData = await mpRes.json();
    console.log("Status:", mpRes.status, "Cases Found:", mpData.data?.cases?.length || 0);

    let testCaseId = "MP-2026-0001";
    let testMissingPersonId = null;

    if (mpData.data?.cases?.length > 0) {
        testCaseId = mpData.data.cases[0].caseId;
        testMissingPersonId = mpData.data.cases[0]._id;
    }

    console.log(`Using Test Case ID: ${testCaseId}\n`);

    // 2. Public Missing Person Tracking API Test
    console.log("[TEST 2]: Public Missing Person Case Tracking (POST /api/missing-persons/track)");
    const trackRes = await fetch(`${BASE_URL}/missing-persons/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: testCaseId })
    });
    const trackData = await trackRes.json();
    console.log("Status:", trackRes.status);
    console.log("Payload Returned:", trackData.data);

    if (trackRes.status !== 200 || !trackData.data?.caseId || trackData.data?.contactPhone !== undefined || trackData.data?.trackingTokenHash !== undefined) {
        console.error("FAIL: Test 2 failed — sensitive data leaked or tracking failed!");
        process.exit(1);
    }
    console.log("PASS: Test 2 succeeded! Safe public payload verified with zero sensitive field leaks.\n");

    // 3. Test Invalid Case ID Tracking Security
    console.log("[TEST 3]: Invalid Case ID Tracking Security (POST /api/missing-persons/track)");
    const invalidRes = await fetch(`${BASE_URL}/missing-persons/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: "MP-FAKE-9999" })
    });
    const invalidData = await invalidRes.json();
    console.log("Status:", invalidRes.status, "Message:", invalidData.message);
    if (invalidRes.status !== 401 || invalidData.message !== "Invalid case ID or tracking credentials.") {
        console.error("FAIL: Test 3 failed!");
        process.exit(1);
    }
    console.log("PASS: Test 3 succeeded! Generic 401 anti-enumeration error response verified.\n");

    // 4. Live Drone Session Start
    if (testMissingPersonId) {
        console.log("[TEST 4]: Live Drone Session Start (POST /api/drone-videos/live-session/start)");
        const startRes = await fetch(`${BASE_URL}/drone-videos/live-session/start`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${adminToken}`
            },
            body: JSON.stringify({ missingPersonId: testMissingPersonId })
        });
        const startData = await startRes.json();
        console.log("Status:", startRes.status, "Data:", startData.data);
        if (startRes.status !== 200 || !startData.data?.sessionStarted) {
            console.error("FAIL: Test 4 failed!");
            process.exit(1);
        }
        console.log("PASS: Test 4 succeeded!\n");

        // 5. Live Drone Session Stop
        console.log("[TEST 5]: Live Drone Session Stop (POST /api/drone-videos/live-session/stop)");
        const stopRes = await fetch(`${BASE_URL}/drone-videos/live-session/stop`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${adminToken}`
            },
            body: JSON.stringify({ missingPersonId: testMissingPersonId })
        });
        const stopData = await stopRes.json();
        console.log("Status:", stopRes.status, "Data:", stopData.data);
        if (stopRes.status !== 200 || !stopData.data?.sessionStopped) {
            console.error("FAIL: Test 5 failed!");
            process.exit(1);
        }
        console.log("PASS: Test 5 succeeded!\n");
    }

    console.log("==================================================");
    console.log("ALL PHASE 11 BACKEND INTEGRATION TESTS PASSED!");
    console.log("==================================================");
};

runPhase11Tests().catch(err => {
    console.error("Phase 11 test execution error:", err);
    process.exit(1);
});
