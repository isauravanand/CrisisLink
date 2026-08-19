import cv2
import numpy as np
import os
import requests

BASE_URL = "http://localhost:5000/api"

def create_synthetic_detections_test():
    os.makedirs("uploads/detections", exist_ok=True)
    os.makedirs("uploads/crops", exist_ok=True)

    # 1. Get first missing person case
    res = requests.get(f"{BASE_URL}/missing-persons")
    mp_cases = res.json().get("data", {}).get("cases", [])
    if not mp_cases:
        print("No missing person case found.")
        return

    mp_id = mp_cases[0]["_id"]
    photo_url = mp_cases[0]["photoUrl"]
    print(f"Testing for Missing Person: {mp_cases[0]['name']} (ID: {mp_id})")

    # 2. Get first completed drone video
    v_res = requests.get(f"{BASE_URL}/drone-videos")
    videos = v_res.json().get("data", {}).get("videos", [])
    completed_vids = [v for v in videos if v["status"] == "COMPLETED"]
    if not completed_vids:
        print("No completed drone video found.")
        return

    vid_id = completed_vids[0]["_id"]

    # 3. Create a synthetic detection frame image on disk mimicking a drone search frame
    frame_filename = f"det_test_frame_{vid_id}_f15.jpg"
    frame_disk_path = os.path.abspath(f"uploads/detections/{frame_filename}")
    frame_url = f"/uploads/detections/{frame_filename}"

    # Create a 640x480 synthetic frame with person figure
    frame = np.full((480, 640, 3), (35, 45, 35), dtype=np.uint8)
    cv2.rectangle(frame, (250, 150), (390, 380), (0, 220, 100), 2)
    cv2.putText(frame, "PERSON DETECTED 91%", (250, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 220, 100), 2)
    cv2.imwrite(frame_disk_path, frame)

    # Insert synthetic PersonDetection into MongoDB via direct Mongoose connection or test script
    print("Created synthetic detection frame image at:", frame_disk_path)

if __name__ == "__main__":
    create_synthetic_detections_test()
