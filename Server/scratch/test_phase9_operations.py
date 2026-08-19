import requests
import json

BASE_URL = "http://localhost:5000/api"

def test_phase9_operations():
    # 1. Test GET /api/operations/map
    map_res = requests.get(f"{BASE_URL}/operations/map")
    print("1. GET /api/operations/map status:", map_res.status_code)
    points = map_res.json().get("data", {}).get("points", [])
    print(f"Retrieved {len(points)} operational map point(s) with verified GPS coordinates.")
    if points:
        print("Sample Map Point:", points[0])

    # 2. Get a missing person case ID
    mp_res = requests.get(f"{BASE_URL}/missing-persons")
    mp_cases = mp_res.json().get("data", {}).get("cases", [])
    if mp_cases:
        mp = mp_cases[0]
        mp_id = mp["_id"]
        case_id = mp["caseId"]

        # 3. Test GET /api/cases/:id/timeline
        tl_res = requests.get(f"{BASE_URL}/cases/{case_id}/timeline")
        print(f"2. GET /api/cases/{case_id}/timeline status:", tl_res.status_code)
        events = tl_res.json().get("data", {}).get("events", [])
        print(f"Retrieved {len(events)} timeline audit event(s) for case {case_id}.")
        for ev in events:
            print(f" - [{ev['eventType']}] {ev['description']} ({ev['timestamp']})")

        # 4. Test GET /api/missing-persons/:id/sightings
        sg_res = requests.get(f"{BASE_URL}/missing-persons/{mp_id}/sightings")
        print(f"3. GET /api/missing-persons/{mp_id}/sightings status:", sg_res.status_code)
        history = sg_res.json().get("data", {}).get("history", [])
        print(f"Retrieved {len(history)} location sighting history record(s).")
        for s in history:
            print(f" - [{s['sightingType']}] {s['label']}: {s['description']}")

if __name__ == "__main__":
    test_phase9_operations()
