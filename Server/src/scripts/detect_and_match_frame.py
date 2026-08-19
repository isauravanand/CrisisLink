import sys
import os
import json
import argparse
import cv2
import numpy as np

# Suppress verbose logs
os.environ["YOLO_VERBOSE"] = "False"
os.environ["PYTHONUNBUFFERED"] = "1"

# Global PyTorch model cache
_resnet_feature_extractor = None

def get_resnet_feature_extractor():
    global _resnet_feature_extractor
    if _resnet_feature_extractor is not None:
        return _resnet_feature_extractor
    try:
        import torch
        import torchvision.models as models
        model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
        model.eval()
        modules = list(model.children())[:-1]
        _resnet_feature_extractor = torch.nn.Sequential(*modules)
        return _resnet_feature_extractor
    except Exception as e:
        return None

def extract_visual_embedding(img):
    if img is None or img.size == 0:
        return None
    try:
        import torch
        import torchvision.transforms as transforms
        from PIL import Image

        feature_extractor = get_resnet_feature_extractor()
        if feature_extractor is None:
            raise RuntimeError("ResNet feature extractor unavailable")

        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(rgb_img)

        preprocess = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

        input_tensor = preprocess(pil_img).unsqueeze(0)

        with torch.no_grad():
            feat = feature_extractor(input_tensor).squeeze().numpy()

        norm = np.linalg.norm(feat)
        if norm > 0:
            feat = feat / norm
        return feat

    except Exception:
        # Fallback to HSV color histogram
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        hist_h = cv2.calcHist([hsv], [0], None, [32], [0, 180])
        hist_s = cv2.calcHist([hsv], [1], None, [32], [0, 256])
        hist_v = cv2.calcHist([hsv], [2], None, [32], [0, 256])
        feat = np.concatenate([hist_h, hist_s, hist_v]).flatten()
        norm = np.linalg.norm(feat)
        if norm > 0:
            feat = feat / norm
        return feat

def compute_similarity(vec1, vec2):
    if vec1 is None or vec2 is None:
        return 0.0
    sim = np.dot(vec1, vec2)
    return float(np.clip(sim, 0.0, 1.0))

def run_detect_and_match(frame_path, reference_path, output_crops_dir, output_frames_dir, threshold=0.30, person_name="Missing Person"):
    if not os.path.exists(frame_path):
        raise FileNotFoundError(f"Frame image not found: {frame_path}")
    if not os.path.exists(reference_path):
        raise FileNotFoundError(f"Reference photo not found: {reference_path}")

    os.makedirs(output_crops_dir, exist_ok=True)
    os.makedirs(output_frames_dir, exist_ok=True)

    from ultralytics import YOLO

    # 1. Load YOLO model & reference embedding
    yolo_model = YOLO('yolov8n.pt')

    ref_img = cv2.imread(reference_path)
    ref_vec = extract_visual_embedding(ref_img)

    frame_img = cv2.imread(frame_path)
    if frame_img is None:
        raise ValueError("Failed to read input frame image.")

    fh, fw, _ = frame_img.shape

    # 2. Run YOLO person detection (COCO class 0)
    results = yolo_model.predict(source=frame_img, classes=[0], verbose=False)

    person_candidates = []
    annotated_frame = frame_img.copy()

    timestamp_str = os.path.splitext(os.path.basename(frame_path))[0]

    for r in results:
        boxes = r.boxes
        for idx, box in enumerate(boxes):
            conf = float(box.conf[0])
            if conf >= 0.25:
                xywh = box.xywh[0].tolist()
                x = max(0, int(xywh[0] - xywh[2] / 2))
                y = max(0, int(xywh[1] - xywh[3] / 2))
                w = min(fw - x, int(xywh[2]))
                h = min(fh - y, int(xywh[3]))

                if w > 10 and h > 10:
                    crop_img = frame_img[y:y+h, x:x+w]
                    crop_vec = extract_visual_embedding(crop_img)
                    score = compute_similarity(ref_vec, crop_vec)
                    score = round(score, 4)

                    crop_filename = f"crop_{timestamp_str}_{idx}.jpg"
                    crop_path = os.path.join(output_crops_dir, crop_filename)
                    cv2.imwrite(crop_path, crop_img)

                    # Annotate frame with target person name
                    sim_pct = int(score * 100)
                    box_color = (0, 220, 100) if score >= threshold else (0, 165, 255)
                    cv2.rectangle(annotated_frame, (x, y), (x + w, y + h), box_color, 3)

                    display_label = f"{person_name} | {sim_pct}% MATCH" if score >= threshold else f"Person #{idx+1} | {sim_pct}%"
                    cv2.putText(annotated_frame, display_label, (x, max(25, y - 10)),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.65, box_color, 2)

                    person_candidates.append({
                        "person_idx": idx + 1,
                        "name": person_name,
                        "confidence": round(conf, 4),
                        "bounding_box": {"x": x, "y": y, "width": w, "height": h},
                        "similarity_score": score,
                        "crop_filename": crop_filename,
                        "crop_url": f"/uploads/crops/{crop_filename}"
                    })

    # Save annotated frame
    annotated_filename = f"ann_{timestamp_str}.jpg"
    annotated_path = os.path.join(output_frames_dir, annotated_filename)
    cv2.imwrite(annotated_path, annotated_frame)

    # Sort candidates by similarity score descending
    person_candidates.sort(key=lambda c: c["similarity_score"], reverse=True)

    has_match = len(person_candidates) > 0 and person_candidates[0]["similarity_score"] >= threshold
    best_match = person_candidates[0] if person_candidates else None

    return {
        "success": True,
        "persons_detected": len(person_candidates),
        "has_possible_match": has_match,
        "best_match": best_match,
        "annotated_frame_url": f"/uploads/frames/{annotated_filename}",
        "all_candidates": person_candidates
    }

def main():
    parser = argparse.ArgumentParser(description="Live Search Detection & Visual Matching")
    parser.add_argument("--frame", required=True, help="Path to input frame image")
    parser.add_argument("--reference", required=True, help="Path to reference photo image")
    parser.add_argument("--crops-dir", required=True, help="Directory to save person crops")
    parser.add_argument("--frames-dir", required=True, help="Directory to save annotated frames")
    parser.add_argument("--threshold", type=float, default=0.30, help="Similarity threshold")
    parser.add_argument("--name", type=str, default="Missing Person", help="Name of missing person")

    args = parser.parse_args()

    try:
        res = run_detect_and_match(args.frame, args.reference, args.crops_dir, args.frames_dir, args.threshold, args.name)
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

