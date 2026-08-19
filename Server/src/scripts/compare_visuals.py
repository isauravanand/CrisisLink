import sys
import os
import json
import argparse
import cv2
import numpy as np

# Suppress logs
os.environ["YOLO_VERBOSE"] = "False"
os.environ["PYTHONUNBUFFERED"] = "1"

def extract_visual_embedding(img):
    """
    Extract a normalized visual feature vector for a person image crop or reference photo.
    Combines deep PyTorch torchvision features (ResNet18) or OpenCV HSV color histogram + LBP texture.
    """
    if img is None or img.size == 0:
        return None

    try:
        import torch
        import torchvision.models as models
        import torchvision.transforms as transforms
        from PIL import Image

        # Convert BGR OpenCV image to PIL Image RGB
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        pil_img = Image.fromarray(rgb_img)

        preprocess = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

        input_tensor = preprocess(pil_img).unsqueeze(0)

        # Load ResNet-18 feature extractor
        model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
        model.eval()

        # Remove final classification layer to get 512-dim feature vector
        modules = list(model.children())[:-1]
        feature_extractor = torch.nn.Sequential(*modules)

        with torch.no_grad():
            feat = feature_extractor(input_tensor).squeeze().numpy()

        norm = np.linalg.norm(feat)
        if norm > 0:
            feat = feat / norm
        return feat

    except Exception as e:
        # Fallback to OpenCV multi-scale HSV color histogram embedding
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        hist_h = cv2.calcHist([hsv], [0], None, [32], [0, 180])
        hist_s = cv2.calcHist([hsv], [1], None, [32], [0, 256])
        hist_v = cv2.calcHist([hsv], [2], None, [32], [0, 256])
        feat = np.concatenate([hist_h, hist_s, hist_v]).flatten()
        norm = np.linalg.norm(feat)
        if norm > 0:
            feat = feat / norm
        return feat

def compute_cosine_similarity(vec1, vec2):
    if vec1 is None or vec2 is None:
        return 0.0
    sim = np.dot(vec1, vec2)
    # Clip to [0.0, 1.0]
    return float(np.clip(sim, 0.0, 1.0))

def run_visual_matching(reference_path, detections_json_path, output_dir, threshold=0.70, top_k=5):
    if not os.path.exists(reference_path):
        raise FileNotFoundError(f"Reference photo not found: {reference_path}")

    if not os.path.exists(detections_json_path):
        raise FileNotFoundError(f"Detections JSON file not found: {detections_json_path}")

    os.makedirs(output_dir, exist_ok=True)

    # Load reference image & extract embedding
    ref_img = cv2.imread(reference_path)
    if ref_img is None:
        raise ValueError(f"Unable to read reference photograph: {reference_path}")

    ref_vec = extract_visual_embedding(ref_img)
    if ref_vec is None:
        raise ValueError("Failed to generate reference photo feature embedding")

    with open(detections_json_path, 'r', encoding='utf-8') as f:
        detections = json.load(f)

    results = []

    for det in detections:
        det_id = det.get("_id") or det.get("id")
        frame_path = det.get("frame_path")
        timestamp_seconds = det.get("timestamp_seconds", 0)
        frame_url = det.get("frame_url", "")
        bbox = det.get("bounding_box") or {}

        if not frame_path or not os.path.exists(frame_path):
            continue

        frame_img = cv2.imread(frame_path)
        if frame_img is None:
            continue

        fh, fw, _ = frame_img.shape

        # Crop person using bounding box coordinates
        x = max(0, int(bbox.get("x", 0)))
        y = max(0, int(bbox.get("y", 0)))
        w = int(bbox.get("width", fw))
        h = int(bbox.get("height", fh))

        # Ensure valid crop boundaries
        if w <= 0 or h <= 0 or (x + w > fw) or (y + h > fh):
            person_crop = frame_img
        else:
            person_crop = frame_img[y:y+h, x:x+w]

        if person_crop.size == 0:
            person_crop = frame_img

        # Save person crop image file
        crop_filename = f"crop_{det_id}.jpg"
        crop_save_path = os.path.join(output_dir, crop_filename)
        cv2.imwrite(crop_save_path, person_crop)

        crop_vec = extract_visual_embedding(person_crop)
        score = compute_cosine_similarity(ref_vec, crop_vec)

        # Round score to 4 decimals
        score = round(score, 4)

        results.append({
            "person_detection_id": det_id,
            "similarity_score": score,
            "timestamp_seconds": timestamp_seconds,
            "frame_url": frame_url,
            "crop_filename": crop_filename,
            "crop_url": f"/uploads/crops/{crop_filename}"
        })

    # Sort candidates by similarity score descending
    results.sort(key=lambda x: x["similarity_score"], reverse=True)

    # Filter by threshold or retain top_k
    filtered_matches = [r for r in results if r["similarity_score"] >= threshold]

    # If none crossed strict threshold, include the single best candidate for inspection if available
    if not filtered_matches and results:
        filtered_matches = [results[0]]

    # Limit to top_k
    top_matches = filtered_matches[:top_k]

    return {
        "success": True,
        "total_compared": len(results),
        "matches": top_matches
    }

def main():
    parser = argparse.ArgumentParser(description="LifeLine Visual Matching Engine")
    parser.add_argument("--reference", required=True, help="Path to missing person reference photograph")
    parser.add_argument("--detections-json", required=True, help="Path to JSON file with candidate detections")
    parser.add_argument("--output-dir", required=True, help="Directory to save extracted person crop images")
    parser.add_argument("--threshold", type=float, default=0.70, help="Similarity score threshold")
    parser.add_argument("--top-k", type=int, default=5, help="Maximum top matches to return")

    args = parser.parse_args()

    try:
        res = run_visual_matching(args.reference, args.detections_json, args.output_dir, args.threshold, args.top_k)
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
