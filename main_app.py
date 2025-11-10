from flask import Flask, render_template, request, jsonify, send_file, redirect, url_for
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import sys
from pathlib import Path

# Add subdirectories to path
sys.path.insert(0, str(Path(__file__).parent / 'video_watermark'))
sys.path.insert(0, str(Path(__file__).parent / 'video_tamper_detection'))

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['PROCESSED_FOLDER'] = 'processed'

CORS(app)

# Ensure directories exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['PROCESSED_FOLDER'], exist_ok=True)

ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    """Main landing page with two options"""
    return render_template('main_index.html')

@app.route('/watermark')
def watermark_page():
    """Redirect to watermark functionality"""
    return redirect('http://localhost:8000')

@app.route('/tamper-detection')
def tamper_detection_page():
    """Redirect to tamper detection functionality"""
    return redirect('http://localhost:8001')

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'services': {
            'watermark': 'http://localhost:8000',
            'tamper_detection': 'http://localhost:8001'
        }
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
