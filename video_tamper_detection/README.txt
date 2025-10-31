Video Tamper Detection - CPU-friendly starter project

How to run:
1) Create a virtual env:
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # mac/linux
   source venv/bin/activate

2) Install deps:
   pip install -r requirements.txt

3) Put some videos in:
   data/pristine/     --> original videos
   data/tampered/     --> tampered videos (for training)

4) Train (optional):
   python train.py

5) Run the Flask app (for uploads and quick inference):
   python app.py
   Then open http://127.0.0.1:5000

Notes:
- The model is lightweight and CPU-friendly but training on CPU will be slow.
- The Flask endpoint uses OpenCV to extract first 16 frames and compute a single tamper score.
