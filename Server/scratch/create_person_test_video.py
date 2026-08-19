import cv2
import numpy as np
import os

def create_person_test_video():
    os.makedirs("scratch", exist_ok=True)
    video_path = os.path.abspath("scratch/test_drone_person_search.mp4")

    fps = 30
    duration_sec = 2
    width, height = 640, 480

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(video_path, fourcc, fps, (width, height))

    num_frames = fps * duration_sec

    for i in range(num_frames):
        # Aerial terrain background
        frame = np.full((height, width, 3), (40, 60, 40), dtype=np.uint8)

        # Draw a synthetic human shape in center
        # Head
        cv2.circle(frame, (320, 200), 20, (200, 180, 160), -1)
        # Body / Shirt
        cv2.rectangle(frame, (295, 220), (345, 320), (220, 50, 50), -1)
        # Trousers
        cv2.rectangle(frame, (300, 320), (318, 410), (30, 30, 150), -1)
        cv2.rectangle(frame, (322, 320), (340, 410), (30, 30, 150), -1)
        # Arms
        cv2.line(frame, (295, 230), (260, 290), (200, 180, 160), 8)
        cv2.line(frame, (345, 230), (380, 290), (200, 180, 160), 8)

        # Telemetry overlay
        cv2.putText(frame, f"AERIAL SEARCH UNIT - LAT 28.61 - FRAME {i+1}", (20, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)

        out.write(frame)

    out.release()
    print(f"Synthetic person search video created at: {video_path}")
    return video_path

if __name__ == "__main__":
    create_person_test_video()
