import cv2
import numpy as np
import os

def create_sample_video():
    os.makedirs("scratch", exist_ok=True)
    video_path = os.path.abspath("scratch/test_drone_footage.mp4")

    fps = 30
    duration_sec = 3
    width, height = 640, 480

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(video_path, fourcc, fps, (width, height))

    num_frames = fps * duration_sec

    for i in range(num_frames):
        # Create a neutral dark background frame mimicking aerial video
        frame = np.full((height, width, 3), (30, 35, 40), dtype=np.uint8)

        # Draw grid lines
        for y in range(0, height, 80):
            cv2.line(frame, (0, y), (width, y), (45, 50, 55), 1)
        for x in range(0, width, 80):
            cv2.line(frame, (x, 0), (x, height), (45, 50, 55), 1)

        # Text overlay simulating telemetry
        cv2.putText(frame, f"DRONE TELEMETRY - ALT 45M - FRAME {i+1}", (20, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 200, 255), 1)

        out.write(frame)

    out.release()
    print(f"Sample test video created at: {video_path}")
    return video_path

if __name__ == "__main__":
    create_sample_video()
