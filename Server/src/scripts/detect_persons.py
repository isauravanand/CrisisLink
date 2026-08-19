import sys
import os
import json
import argparse
import cv2

# Disable ultralytics verbose logs & download animations to ensure clean stdout JSON
os.environ["YOLO_VERBOSE"] = "False"
os.environ["PYTHONUNBUFFERED"] = "1"


def run_person_detection(video_path, output_dir, interval=1.0, threshold=0.50):
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")

    os.makedirs(output_dir, exist_ok=True)

    # Import YOLO from ultralytics
    from ultralytics import YOLO

    # Load pre-trained YOLOv8 nano model (COCO weights, auto-downloads on first run if needed)
    model = YOLO('yolov8n.pt')

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Unable to open video file: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    if not fps or fps <= 0:
        fps = 30.0

    total_video_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_seconds = round(total_video_frames / fps, 2) if total_video_frames > 0 else 0.0

    frame_step = max(1, int(round(fps * interval)))

    sampled_count = 0
    frame_idx = 0
    detections_output = []

    video_basename = os.path.splitext(os.path.basename(video_path))[0]

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % frame_step == 0:
            sampled_count += 1
            timestamp_seconds = round(frame_idx / fps, 2)

            # Perform inference filtering specifically for person (COCO class 0)
            results = model.predict(source=frame, classes=[0], verbose=False)

            best_confidence = 0.0
            best_bbox = None
            person_boxes = []

            for r in results:
                boxes = r.boxes
                for box in boxes:
                    conf = float(box.conf[0])
                    if conf >= threshold:
                        xywh = box.xywh[0].tolist() # [x_center, y_center, width, height]
                        # Convert to top-left [x, y, w, h]
                        x = max(0, int(xywh[0] - xywh[2] / 2))
                        y = max(0, int(xywh[1] - xywh[3] / 2))
                        w = int(xywh[2])
                        h = int(xywh[3])

                        person_boxes.append({
                            "confidence": round(conf, 4),
                            "x": x,
                            "y": y,
                            "width": w,
                            "height": h
                        })

                        if conf > best_confidence:
                            best_confidence = conf
                            best_bbox = {"x": x, "y": y, "width": w, "height": h}

            if person_boxes:
                # Save annotated frame image with bounding boxes drawn for responder visual review
                annotated_frame = frame.copy()
                for pbox in person_boxes:
                    bx, by, bw, bh = pbox["x"], pbox["y"], pbox["width"], pbox["height"]
                    conf_pct = int(pbox["confidence"] * 100)
                    # Draw green bounding box & label
                    cv2.rectangle(annotated_frame, (bx, by), (bx + bw, by + bh), (0, 220, 100), 2)
                    label = f"PERSON DETECTED {conf_pct}%"
                    cv2.putText(annotated_frame, label, (bx, max(20, by - 8)),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 220, 100), 2)

                frame_filename = f"det_{video_basename}_f{frame_idx}_t{int(timestamp_seconds)}.jpg"
                save_path = os.path.join(output_dir, frame_filename)
                cv2.imwrite(save_path, annotated_frame)

                detections_output.append({
                    "frame_number": frame_idx,
                    "timestamp_seconds": timestamp_seconds,
                    "confidence": round(best_confidence, 4),
                    "frame_filename": frame_filename,
                    "bounding_box": best_bbox,
                    "all_person_boxes": person_boxes
                })

        frame_idx += 1

    cap.release()

    return {
        "success": True,
        "total_frames_sampled": sampled_count,
        "total_video_frames": total_video_frames,
        "duration_seconds": duration_seconds,
        "detections": detections_output
    }

def main():
    parser = argparse.ArgumentParser(description="LifeLine Drone Video Person Detector")
    parser.add_argument("--video", required=True, help="Path to input video file")
    parser.add_argument("--output-dir", required=True, help="Path to save detection frame images")
    parser.add_argument("--interval", type=float, default=1.0, help="Frame sampling interval in seconds")
    parser.add_argument("--threshold", type=float, default=0.50, help="Person detection confidence threshold")

    args = parser.parse_args()

    try:
        res = run_person_detection(args.video, args.output_dir, args.interval, args.threshold)
        print(json.dumps(res))
        sys.exit(0)
    except Exception as e:
        err_res = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(err_res))
        sys.exit(1)

if __name__ == "__main__":
    main()
