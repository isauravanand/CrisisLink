import sys
import os
import json
import argparse
import cv2
import numpy as np

# Suppress verbose logs
os.environ["YOLO_VERBOSE"] = "False"
os.environ["PYTHONUNBUFFERED"] = "1"

# Pre-load PyTorch ResNet-18, YOLO, and OpenCV Face Cascade in RAM
_resnet_feature_extractor = None
_yolo_model = None
_face_cascade = None
_ref_embedding_cache = {}

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
        sys.stderr.write(f"[Daemon] ResNet load warning: {e}\n")
        sys.stderr.flush()
        return None

def get_yolo_model():
    global _yolo_model
    if _yolo_model is not None:
        return _yolo_model
    from ultralytics import YOLO
    _yolo_model = YOLO('yolov8n.pt')
    return _yolo_model

def get_face_cascade():
    global _face_cascade
    if _face_cascade is not None:
        return _face_cascade
    try:
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        _face_cascade = cv2.CascadeClassifier(cascade_path)
    except Exception as e:
        _face_cascade = None
    return _face_cascade

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

def get_cached_reference_embedding(ref_path):
    global _ref_embedding_cache
    if not os.path.exists(ref_path):
        return None

    mtime = os.path.getmtime(ref_path)
    cached = _ref_embedding_cache.get(ref_path)
    if cached and cached.get("mtime") == mtime:
        return cached.get("vec")

    ref_img = cv2.imread(ref_path)
    if ref_img is None:
        return None

    ref_vec = extract_visual_embedding(ref_img)
    if ref_vec is not None:
        _ref_embedding_cache[ref_path] = {"mtime": mtime, "vec": ref_vec}
    return ref_vec

def process_frame_request(req):
    frame_path = req.get("frame")
    reference_path = req.get("reference")
    output_crops_dir = req.get("crops_dir")
    output_frames_dir = req.get("frames_dir")
    threshold = float(req.get("threshold", 0.20))
    person_name = req.get("name", "Missing Person")

    if not frame_path or not os.path.exists(frame_path):
        return {"success": False, "error": f"Frame path invalid: {frame_path}"}
    if not reference_path or not os.path.exists(reference_path):
        return {"success": False, "error": f"Reference path invalid: {reference_path}"}

    os.makedirs(output_crops_dir, exist_ok=True)
    os.makedirs(output_frames_dir, exist_ok=True)

    yolo = get_yolo_model()
    face_cascade = get_face_cascade()
    ref_vec = get_cached_reference_embedding(reference_path)

    frame_img = cv2.imread(frame_path)
    if frame_img is None:
        return {"success": False, "error": "Failed to read input frame image"}

    fh, fw, _ = frame_img.shape

    raw_candidates = []

    # 1. Run YOLO person detection (COCO class 0)
    try:
        results = yolo.predict(source=frame_img, classes=[0], verbose=False)
        for r in results:
            boxes = r.boxes
            for idx, box in enumerate(boxes):
                conf = float(box.conf[0])
                if conf >= 0.20:
                    xywh = box.xywh[0].tolist()
                    x = max(0, int(xywh[0] - xywh[2] / 2))
                    y = max(0, int(xywh[1] - xywh[3] / 2))
                    w = min(fw - x, int(xywh[2]))
                    h = min(fh - y, int(xywh[3]))
                    if w > 10 and h > 10:
                        raw_candidates.append({"x": x, "y": y, "w": w, "h": h, "conf": round(conf, 4), "type": "person"})
    except Exception as yolo_err:
        sys.stderr.write(f"[Daemon] YOLO predict error: {yolo_err}\n")

    # 2. Run OpenCV Haar Cascade Face Detection as complementary detector for close-up webcam faces
    if face_cascade is not None:
        try:
            gray = cv2.cvtColor(frame_img, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(30, 30))
            for (fx, fy, fw_c, fh_c) in faces:
                # Add padding around face box for body/head context
                pad_x = int(fw_c * 0.3)
                pad_y = int(fh_c * 0.4)
                x = max(0, fx - pad_x)
                y = max(0, fy - pad_y)
                w = min(fw - x, fw_c + 2 * pad_x)
                h = min(fh - y, fh_c + 2 * pad_y)

                # Check if face overlaps existing YOLO box
                overlap = False
                for existing in raw_candidates:
                    if abs(existing["x"] - x) < 50 and abs(existing["y"] - y) < 50:
                        overlap = True
                        break
                if not overlap:
                    raw_candidates.append({"x": x, "y": y, "w": w, "h": h, "conf": 0.85, "type": "face"})
        except Exception as face_err:
            sys.stderr.write(f"[Daemon] Face cascade error: {face_err}\n")

    person_candidates = []
    annotated_frame = frame_img.copy()
    timestamp_str = os.path.splitext(os.path.basename(frame_path))[0]

    for idx, cand in enumerate(raw_candidates):
        x, y, w, h = cand["x"], cand["y"], cand["w"], cand["h"]
        crop_img = frame_img[y:y+h, x:x+w]
        crop_vec = extract_visual_embedding(crop_img)
        score = compute_similarity(ref_vec, crop_vec)
        score = round(score, 4)

        crop_filename = f"crop_{timestamp_str}_{idx}.jpg"
        crop_path = os.path.join(output_crops_dir, crop_filename)
        cv2.imwrite(crop_path, crop_img)

        # Annotate frame
        sim_pct = int(score * 100)
        box_color = (0, 220, 100) if score >= threshold else (0, 165, 255)
        cv2.rectangle(annotated_frame, (x, y), (x + w, y + h), box_color, 3)

        display_label = f"{person_name} | {sim_pct}% MATCH" if score >= threshold else f"Person #{idx+1} | {sim_pct}%"
        cv2.putText(annotated_frame, display_label, (x, max(25, y - 10)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.65, box_color, 2)

        person_candidates.append({
            "person_idx": idx + 1,
            "name": person_name,
            "confidence": cand["conf"],
            "bounding_box": {"x": x, "y": y, "width": w, "height": h},
            "similarity_score": score,
            "crop_filename": crop_filename,
            "crop_url": f"/uploads/crops/{crop_filename}"
        })

    # Save annotated frame
    annotated_filename = f"ann_{timestamp_str}.jpg"
    annotated_path = os.path.join(output_frames_dir, annotated_filename)
    cv2.imwrite(annotated_path, annotated_frame)

    person_candidates.sort(key=lambda c: c["similarity_score"], reverse=True)
    has_match = len(person_candidates) > 0 and (person_candidates[0]["similarity_score"] >= threshold or len(person_candidates) > 0)
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
    # Warm up models on process launch
    get_resnet_feature_extractor()
    get_yolo_model()
    get_face_cascade()

    sys.stderr.write("[LiveDaemon] Pre-loaded YOLO, ResNet, and Face Cascade models into memory. Ready for requests.\n")
    sys.stderr.flush()

    # Read line-delimited JSON requests from stdin loop
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            res = process_frame_request(req)
        except Exception as e:
            res = {"success": False, "error": str(e)}

        sys.stdout.write(json.dumps(res) + "\n")
        sys.stdout.flush()

if __name__ == "__main__":
    main()

