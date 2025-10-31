"""
tamper_detection.py
Practical tampering-detection module for the open-video-watermark project.

Install dependencies:
    pip install opencv-python-headless scikit-image numpy tqdm
"""

import cv2
import os
import hashlib
import numpy as np
from skimage.metrics import structural_similarity as ssim
from tqdm import tqdm
import json
import logging

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# ---- Tunable thresholds ----
SSIM_CUT_THRESHOLD = 0.45
SSIM_DROP_THRESHOLD = 0.7
MIN_ORB_MATCHES = 30
FRAME_HASH_DUPLICATE_RATIO = 0.05


def _frame_md5(frame):
    """Compute md5 hash for a single BGR frame."""
    h = hashlib.md5()
    h.update(frame.tobytes())
    return h.hexdigest()


def _to_gray(frame):
    return cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)


def _ssim(a_gray, b_gray):
    """Compute SSIM between two grayscale images."""
    val = ssim(a_gray, b_gray, data_range=255)
    return float(val)


def _orb_geometric_check(ref_gray, query_gray, min_matches=MIN_ORB_MATCHES):
    """Use ORB + Homography to check geometric consistency."""
    orb = cv2.ORB_create(500)
    kp1, des1 = orb.detectAndCompute(ref_gray, None)
    kp2, des2 = orb.detectAndCompute(query_gray, None)
    if des1 is None or des2 is None:
        return {"matches": 0, "geom_ok": False, "reason": "no_descriptors"}

    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    matches = bf.match(des1, des2)
    matches = sorted(matches, key=lambda x: x.distance)
    match_count = len(matches)
    if match_count < min_matches:
        return {"matches": match_count, "geom_ok": False, "reason": "too_few_matches"}

    pts1 = np.float32([kp1[m.queryIdx].pt for m in matches]).reshape(-1, 1, 2)
    pts2 = np.float32([kp2[m.trainIdx].pt for m in matches]).reshape(-1, 1, 2)
    try:
        H, mask = cv2.findHomography(pts1, pts2, cv2.RANSAC, 5.0)
        if H is None:
            return {"matches": match_count, "geom_ok": False, "reason": "homography_fail"}
        inliers = int(mask.sum())
        inlier_ratio = inliers / match_count
        geom_ok = inlier_ratio > 0.4
        return {"matches": match_count, "inliers": inliers,
                "inlier_ratio": inlier_ratio, "geom_ok": geom_ok}
    except Exception as e:
        return {"matches": match_count, "geom_ok": False, "reason": str(e)}


def analyze_video_for_tampering(video_path, ref_frame_interval=30, max_frames=3000):
    """Analyze a video for possible tampering."""
    if not os.path.exists(video_path):
        raise FileNotFoundError(video_path)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise IOError("Cannot open video")

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    analyze_frames = min(total_frames, max_frames)

    hashes = []
    ssim_pairs = []
    issues = []
    sampled_frames = []

    prev_gray = None

    pbar = tqdm(total=analyze_frames, desc="Analyzing video", unit="frame")
    for i in range(analyze_frames):
        ret, frame = cap.read()
        if not ret:
            issues.append({"type": "early_end", "frame": i})
            break

        h = _frame_md5(frame)
        hashes.append(h)
        gray = _to_gray(frame)

        if prev_gray is not None:
            s = _ssim(prev_gray, gray)
            ssim_pairs.append((i - 1, i, s))
            if s < SSIM_CUT_THRESHOLD:
                issues.append({"type": "cut_or_insert", "frames": (i - 1, i), "ssim": s})
            elif s < SSIM_DROP_THRESHOLD:
                issues.append({"type": "quality_drop", "frames": (i - 1, i), "ssim": s})

        if i % ref_frame_interval == 0:
            sampled_frames.append((i, gray))

        prev_gray = gray
        pbar.update(1)
    pbar.close()
    cap.release()

    unique_hashes = len(set(hashes))
    dup_ratio = 1.0 - (unique_hashes / len(hashes))
    if dup_ratio > FRAME_HASH_DUPLICATE_RATIO:
        issues.append({"type": "repeated_frames", "ratio": dup_ratio})

    # geometric check between first and last sampled frame
    if len(sampled_frames) >= 2:
        ref_idx, ref_gray = sampled_frames[0]
        idx, gray = sampled_frames[-1]
        geom = _orb_geometric_check(ref_gray, gray)
        if not geom["geom_ok"]:
            issues.append({"type": "geometric_change", "frames": (ref_idx, idx)})

    report = {
        "video": os.path.basename(video_path),
        "fps": fps,
        "frames_analyzed": analyze_frames,
        "issues": issues,
        "summary": {"ok": len(issues) == 0, "issue_count": len(issues)},
    }

    return report


# CLI usage
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Analyze a video for tampering.")
    parser.add_argument("video", help="Path to video file")
    args = parser.parse_args()
    r = analyze_video_for_tampering(args.video)
    print(json.dumps(r, indent=2))
