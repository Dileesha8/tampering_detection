import torch
import cv2
import numpy as np
from torchvision import transforms
from train import EnhancedVideoQualityCNN

def predict_video(model_path, video_path):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = EnhancedVideoQualityCNN().to(device)
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.eval()

    transform = transforms.Compose([
        transforms.ToPILImage(),
        transforms.Resize((128, 128)),
        transforms.ToTensor(),
    ])

    cap = cv2.VideoCapture(video_path)
    frames = []
    for _ in range(5):
        ret, frame = cap.read()
        if not ret:
            break
        frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    cap.release()

    preds = []
    for f in frames:
        tensor = transform(f).unsqueeze(0).to(device)
        with torch.no_grad():
            out = model(tensor)
            pred = torch.argmax(out, 1).item()
            preds.append(pred)

    final_pred = int(np.mean(preds) > 0.5)
    return "Fake (Tampered)" if final_pred == 1 else "Real"
