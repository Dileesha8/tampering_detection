import os
import cv2
import torch
from torch.utils.data import Dataset
from torchvision import transforms

class VideoFrameDataset(Dataset):
    def __init__(self, root_dir, transform=None):
        self.root_dir = root_dir
        self.transform = transform
        self.samples = []

        for label, folder in enumerate(["real", "fake"]):
            folder_path = os.path.join(root_dir, folder)
            for file in os.listdir(folder_path):
                if file.endswith(('.mp4', '.avi', '.mov')):
                    self.samples.append((os.path.join(folder_path, file), label))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        video_path, label = self.samples[idx]
        cap = cv2.VideoCapture(video_path)
        frames = []

        for _ in range(5):  # take first 5 frames
            ret, frame = cap.read()
            if not ret:
                break
            frame = cv2.resize(frame, (128, 128))
            frames.append(frame)
        cap.release()

        if len(frames) == 0:
            frames = [np.zeros((128, 128, 3), dtype=np.uint8)]

        frame = frames[len(frames)//2]  # middle frame
        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        if self.transform:
            frame = self.transform(frame)

        return frame, torch.tensor(label, dtype=torch.long)
