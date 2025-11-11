from flask import Flask, render_template, jsonify
from flask_cors import CORS
import subprocess
import sys
import os
from pathlib import Path

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
CORS(app)

# Folder paths
BASE_DIR = Path(__file__).resolve().parent
WATERMARK_APP = BASE_DIR / "video_watermark" / "app.py"
TAMPER_APP = BASE_DIR / "video_tamper_detection" / "app.py"

def launch_subapps():
    """Launch child Flask apps on different ports"""
    print("🚀 Launching sub-applications...")

    try:
        subprocess.Popen([sys.executable, str(WATERMARK_APP)], cwd=WATERMARK_APP.parent)
        print("✅ video_watermark running at http://127.0.0.1:8000")

        subprocess.Popen([sys.executable, str(TAMPER_APP)], cwd=TAMPER_APP.parent)
        print("✅ video_tamper_detection running at http://127.0.0.1:8001")
    except Exception as e:
        print(f"❌ Failed to start sub-apps: {e}")

@app.route("/")
def index():
    """Main landing page with options"""
    return render_template("main_index.html")

@app.route("/watermark")
def watermark_page():
    """Redirect to watermark app"""
    return jsonify({"redirect": "http://127.0.0.1:8000"})

@app.route("/tamper-detection")
def tamper_detection_page():
    """Redirect to tamper detection app"""
    return jsonify({"redirect": "http://127.0.0.1:8001"})

@app.route("/health")
def health():
    """Health check for all services"""
    return jsonify({
        "status": "healthy",
        "services": {
            "main_app": "http://127.0.0.1:5000",
            "watermark": "http://127.0.0.1:8000",
            "tamper_detection": "http://127.0.0.1:8001"
        }
    })

if __name__ == "__main__":
    launch_subapps()
    app.run(host="0.0.0.0", port=5000, debug=True)
