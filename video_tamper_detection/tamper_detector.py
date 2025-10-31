import cv2
import numpy as np
import os
from skimage.metrics import structural_similarity as ssim
from test_video import predict_video


def analyze_video(video_path):
    """
    Analyze a video for potential tampering.
    Combines rule-based (blur/freeze) and CNN-based detection.
    Returns metadata, metrics, and classification result.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"error": "Cannot open video file"}

    # Video metadata
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    duration = frame_count / fps if fps > 0 else 0

    blur_scores = []
    freeze_count = 0
    ret, prev_frame = cap.read()

    if not ret:
        cap.release()
        return {"error": "Could not read frames from video"}

    prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)

    # --- Frame analysis ---
    for _ in range(1, frame_count):
        ret, frame = cap.read()
        if not ret:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # 1️⃣ Blur metric (variance of Laplacian)
        blur = cv2.Laplacian(gray, cv2.CV_64F).var()
        blur_scores.append(blur)

        # 2️⃣ Frozen frame detection using SSIM
        similarity = ssim(prev_gray, gray)
        if similarity > 0.98:  # Nearly identical frame → frozen
            freeze_count += 1

        prev_gray = gray

    cap.release()

    # --- Compute averages ---
    avg_blur = np.mean(blur_scores) if blur_scores else 0
    std_blur = np.std(blur_scores) if blur_scores else 0

    # --- Rule-based classification ---
    is_blurry = avg_blur < 70  # can be tuned
    is_frozen = freeze_count > (0.2 * frame_count)  # 20% freeze threshold
    rule_tampered = is_blurry or is_frozen

    # --- CNN prediction ---
    try:
        cnn_prediction = predict_video("model.pth", video_path)
    except Exception as e:
        cnn_prediction = f"Model error: {str(e)}"

    # --- Final decision logic ---
    final_tampered = (
        "Tampered"
        if rule_tampered or cnn_prediction == "Fake (Tampered)"
        else "Not Tampered"
    )

    # --- Reasons for flagging ---
    reasons = []
    if is_blurry:
        reasons.append("Excessive blur detected")
    if is_frozen:
        reasons.append("Frozen frames detected")
    if cnn_prediction == "Fake (Tampered)":
        reasons.append("CNN model indicates tampering")
    if not reasons:
        reasons.append("No visible tampering detected")

    # --- Final structured result ---
    result = {
        "file": os.path.basename(video_path),
        "fps": round(fps, 2),
        "total_frames": frame_count,
        "duration_sec": round(duration, 2),
        "avg_blur": round(avg_blur, 2),
        "blur_stddev": round(std_blur, 2),
        "freeze_frames": freeze_count,
        "cnn_prediction": cnn_prediction,
        "final_decision": final_tampered,
        "reason": reasons,
    }

    return result
