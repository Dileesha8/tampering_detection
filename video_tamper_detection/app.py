from flask import Flask, render_template, request, jsonify
from werkzeug.utils import secure_filename
import os
from tamper_detector import analyze_video

# Initialize Flask app
app = Flask(__name__)

# Configure folders
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['RESULT_FOLDER'] = 'static/results'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['RESULT_FOLDER'], exist_ok=True)


@app.route('/')
def index():
    """Render the home page."""
    return render_template('index.html')


@app.route('/analyze', methods=['POST'])
def analyze():
    """Handle video upload and tamper analysis."""
    if 'video' not in request.files:
        return jsonify({'error': 'No video file uploaded'})

    video = request.files['video']
    if video.filename == '':
        return jsonify({'error': 'No file selected'})

    # Save uploaded video
    filename = secure_filename(video.filename)
    video_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    video.save(video_path)

    try:
        # Analyze the uploaded video
          # Analyze the uploaded video
        result = analyze_video(video_path)

        # Ensure "status" key exists for front-end display
        if "final_decision" in result:
            result["status"] = result["final_decision"]
        elif "cnn_prediction" in result:
            result["status"] = result["cnn_prediction"]
        else:
            result["status"] = "Not Tampered"  # default fallback

        # Add basic file metadata
        result['file_name'] = filename
        result['file_path'] = video_path

        return jsonify(result)

    except Exception as e:
        print("Error during analysis:", e)
        return jsonify({'error': f'Error analyzing video: {str(e)}'})


if __name__ == '__main__':
    app.run(debug=True)
