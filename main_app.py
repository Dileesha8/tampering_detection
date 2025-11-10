from flask import Flask, render_template, jsonify
from flask_cors import CORS
import subprocess
import sys
import os
from pathlib import Path

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
CORS(app)

# Folder paths
BASE_DIR = Path(__file__).parent
WATERMARK_APP = BASE_DIR / "video_watermark" / "app.py"
TAMPER_APP = BASE_DIR / "video_tamper_detection" / "app.py"

# Launch both sub-apps automatically
def launch_subapps():
    print("🚀 Launching sub-applications...")

    # Start video_watermark app (port 8000)
    subprocess.Popen([sys.executable, str(WATERMARK_APP)], cwd=WATERMARK_APP.parent)

    # Start video_tamper_detection app (port 8001)
    subprocess.Popen([sys.executable, str(TAMPER_APP)], cwd=TAMPER_APP.parent)

    print("✅ Both sub-apps are running.")

@app.route("/")
def index():
    """Main landing page"""
    return render_template("main_index.html")

@app.route("/watermark")
def watermark_page():
    """Open the watermarking tool (already running on port 8000)"""
    return jsonify({"redirect": "http://127.0.0.1:8000"})

@app.route("/tamper-detection")
def tamper_detection_page():
    """Open the tamper detection tool (already running on port 8001)"""
    return jsonify({"redirect": "http://127.0.0.1:8001"})

@app.route("/health")
def health():
    """Check sub-app status"""
    return jsonify({
        "status": "healthy",
        "services": {
            "watermark": "http://127.0.0.1:8000",
            "tamper_detection": "http://127.0.0.1:8001"
        }
    })

if __name__ == "__main__":
    launch_subapps()
    app.run(host="0.0.0.0", port=5000, debug=True)
