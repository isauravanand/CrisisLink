import requests
import json

BASE_URL = "http://localhost:5000/api"

def test_phase8_pipeline():
    # 1. Fetch missing persons
    res = requests.get(f"{BASE_URL}/missing-persons")
    print("1. GET /api/missing-persons status:", res.status_code)
    mp_cases = res.json().get("data", {}).get("cases", [])

    if not mp_cases:
        print("No missing person cases found. Unable to run visual search test.")
        return

    mp_id = mp_cases[0]["_id"]
    print(f"Target Missing Person ID: {mp_id} ({mp_cases[0]['name']})")

    # 2. Fetch completed drone videos
    v_res = requests.get(f"{BASE_URL}/drone-videos")
    print("2. GET /api/drone-videos status:", v_res.status_code)
    videos = v_res.json().get("data", {}).get("videos", [])
    completed_vids = [v for v in videos if v["status"] == "COMPLETED"]

    if not completed_vids:
        print("No completed drone videos found.")
        return

    vid_id = completed_vids[0]["_id"]
    print(f"Target Drone Video ID: {vid_id} ({completed_vids[0]['filename']})")

    # 3. Initiate Visual Search POST /api/missing-persons/:id/search
    search_res = requests.post(f"{BASE_URL}/missing-persons/{mp_id}/search", json={"droneVideoId": vid_id})
    print("3. POST /api/missing-persons/:id/search status:", search_res.status_code)
    search_data = search_res.json()
    print("Search Result payload:", search_data)

    # 4. Fetch Ranked Match Candidates GET /api/missing-persons/:id/matches
    matches_res = requests.get(f"{BASE_URL}/missing-persons/{mp_id}/matches")
    print("4. GET /api/missing-persons/:id/matches status:", matches_res.status_code)
    matches = matches_res.json().get("data", {}).get("matches", [])
    print(f"Retrieved {len(matches)} match candidate(s).")

    if matches:
        match_id = matches[0]["_id"]
        # 5. Update Candidate Match Status PATCH /api/matches/:id/status
        patch_res = requests.patch(f"{BASE_URL}/matches/{match_id}/status", json={"status": "CONFIRMED"})
        print("5. PATCH /api/matches/:id/status status:", patch_res.status_code)
        print("Updated Match Candidate:", patch_res.json().get("data"))

if __name__ == "__main__":
    test_phase8_pipeline()
