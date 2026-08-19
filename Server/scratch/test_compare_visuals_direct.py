import os
import json
import subprocess

def test_direct_visual_comparison():
    ref_photo = os.path.abspath("Server/uploads/missing-persons/missing-person-1786621537335-44815436.jpg")
    output_dir = os.path.abspath("Server/uploads/crops")
    frame_path = os.path.abspath("Server/uploads/detections/det_test_frame_6a800680c52f94b89f7a167b_f15.jpg")


    detections_data = [
        {
            "id": "det_test_101",
            "frame_path": frame_path,
            "frame_url": "/uploads/detections/det_test_frame_6a800680c52f94b89f7a167b_f15.jpg",
            "timestamp_seconds": 15.0,
            "bounding_box": {"x": 250, "y": 150, "width": 140, "height": 230}
        }
    ]

    temp_json = os.path.abspath("scratch/temp_test_detections.json")
    with open(temp_json, "w", encoding="utf-8") as f:
        json.dump(detections_data, f)

    cmd = [
        "python", "Server/src/scripts/compare_visuals.py",
        "--reference", ref_photo,
        "--detections-json", temp_json,
        "--output-dir", output_dir,
        "--threshold", "0.1",
        "--top-k", "5"
    ]

    res = subprocess.run(cmd, capture_output=True, text=True)
    print("Return code:", res.returncode)
    print("Output stdout:", res.stdout)
    print("Output stderr:", res.stderr)

if __name__ == "__main__":
    test_direct_visual_comparison()
