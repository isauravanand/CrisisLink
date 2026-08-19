const BASE_URL = "http://localhost:5000/api";

const runTests = async () => {
    console.log("==================================================");
    console.log("RUNNING PUBLIC INCIDENT TRACKING VERIFICATION TESTS");
    console.log("==================================================\n");

    // TEST 1: Create Emergency Report
    console.log("[TEST 1]: Create Emergency Report (POST /api/emergencies)");
    const createRes = await fetch(`${BASE_URL}/emergencies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            description: "Test flash flood trapped 2 citizens in vehicle.",
            emergencyType: "FLOOD",
            victimCount: 2,
            location: { latitude: 28.6139, longitude: 77.2090, address: "Connaught Place, Delhi" }
        })
    });
    const createData = await createRes.json();
    console.log("Status:", createRes.status);
    console.log("Payload:", {
        success: createData.success,
        caseId: createData.data?.caseId,
        trackingCode: createData.data?.trackingCode,
        priorityLevel: createData.data?.priorityLevel,
        trackingTokenHash: createData.data?.trackingTokenHash // Should be undefined!
    });

    const caseIdA = createData.data?.caseId;
    const trackingCodeA = createData.data?.trackingCode;

    if (!caseIdA || !trackingCodeA || createData.data?.trackingTokenHash !== undefined) {
        console.error("FAIL: Test 1 failed!");
        process.exit(1);
    }
    console.log("PASS: Test 1 succeeded!\n");

    // TEST 2: Track Emergency with Correct Credentials
    console.log("[TEST 2]: Track Emergency with Correct Credentials (POST /api/emergencies/track)");
    const trackRes = await fetch(`${BASE_URL}/emergencies/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: caseIdA, trackingCode: trackingCodeA })
    });
    const trackData = await trackRes.json();
    console.log("Status:", trackRes.status);
    console.log("Data returned:", trackData.data);
    if (trackRes.status !== 200 || !trackData.data?.sessionToken || trackData.data?.trackingTokenHash !== undefined) {
        console.error("FAIL: Test 2 failed!");
        process.exit(1);
    }
    console.log("PASS: Test 2 succeeded!\n");

    // TEST 3: Track Emergency with Wrong Tracking Code
    console.log("[TEST 3]: Track Emergency with Wrong Tracking Code");
    const wrongCodeRes = await fetch(`${BASE_URL}/emergencies/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: caseIdA, trackingCode: "WRONG-1234" })
    });
    const wrongCodeData = await wrongCodeRes.json();
    console.log("Status:", wrongCodeRes.status, "Message:", wrongCodeData.message);
    if (wrongCodeRes.status !== 401 || wrongCodeData.message !== "Invalid case ID or tracking code.") {
        console.error("FAIL: Test 3 failed!");
        process.exit(1);
    }
    console.log("PASS: Test 3 succeeded!\n");

    // TEST 4: Track Emergency with Non-Existent Case ID
    console.log("[TEST 4]: Track Emergency with Non-Existent Case ID");
    const wrongCaseRes = await fetch(`${BASE_URL}/emergencies/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: "LF-2026-FAKE1", trackingCode: trackingCodeA })
    });
    const wrongCaseData = await wrongCaseRes.json();
    console.log("Status:", wrongCaseRes.status, "Message:", wrongCaseData.message);
    if (wrongCaseRes.status !== 401 || wrongCaseData.message !== "Invalid case ID or tracking code.") {
        console.error("FAIL: Test 4 failed!");
        process.exit(1);
    }
    console.log("PASS: Test 4 succeeded!\n");

    // TEST 5: Session Refresh API (GET /api/emergencies/track/session)
    console.log("[TEST 5]: Session Refresh (GET /api/emergencies/track/session)");
    const refreshRes = await fetch(`${BASE_URL}/emergencies/track/session`, {
        headers: { "Authorization": `Bearer ${trackData.data.sessionToken}` }
    });
    const refreshData = await refreshRes.json();
    console.log("Status:", refreshRes.status, "Data:", refreshData.data);
    if (refreshRes.status !== 200 || refreshData.data?.caseId !== caseIdA) {
        console.error("FAIL: Test 5 failed!");
        process.exit(1);
    }
    console.log("PASS: Test 5 succeeded!\n");

    // TEST 6: Unauthenticated Access to Admin API (GET /api/emergencies)
    console.log("[TEST 6]: Unauthenticated Admin Endpoint Protection (GET /api/emergencies)");
    const adminRes = await fetch(`${BASE_URL}/emergencies`);
    const adminData = await adminRes.json();
    console.log("Status:", adminRes.status, "Message:", adminData.message);
    if (adminRes.status !== 401) {
        console.error("FAIL: Test 6 failed!");
        process.exit(1);
    }
    console.log("PASS: Test 6 succeeded!\n");

    console.log("==================================================");
    console.log("ALL BACKEND INTEGRATION TESTS PASSED CLEANLY!");
    console.log("==================================================");
};

runTests().catch(err => {
    console.error("Test execution error:", err);
    process.exit(1);
});
