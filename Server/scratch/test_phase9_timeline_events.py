import requests

BASE_URL = "http://localhost:5000/api"

def test_timeline_event_creation():
    # 1. Fetch missing persons
    res = requests.get(f"{BASE_URL}/missing-persons")
    mp_cases = res.json().get("data", {}).get("cases", [])
    if not mp_cases:
        print("No missing person case found.")
        return

    mp_id = mp_cases[0]["_id"]
    case_id = mp_cases[0]["caseId"]
    print(f"Testing timeline for case {case_id} ({mp_cases[0]['name']})")

    # 2. Get a completed drone video
    v_res = requests.get(f"{BASE_URL}/drone-videos")
    videos = v_res.json().get("data", {}).get("videos", [])
    completed_vids = [v for v in videos if v["status"] == "COMPLETED"]

    if completed_vids:
        vid_id = completed_vids[0]["_id"]
        # Trigger visual search
        print("Triggering visual search...")
        s_res = requests.post(f"{BASE_URL}/missing-persons/{mp_id}/search", json={"droneVideoId": vid_id})
        print("Search status:", s_res.status_code)

    # 3. Check timeline
    tl_res = requests.get(f"{BASE_URL}/cases/{case_id}/timeline")
    events = tl_res.json().get("data", {}).get("events", [])
    print(f"Timeline events count for {case_id}: {len(events)}")
    for ev in events:
        print(f" - [{ev['eventType']}] {ev['description']} ({ev['timestamp']})")

if __name__ == "__main__":
    test_timeline_event_creation()
