import os
from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

basedir = os.path.abspath(os.path.dirname(__file__))
env_path = os.path.join(basedir, '.env')

if os.path.exists(env_path):
    print(f"DEBUG: Found .env file at {env_path}")
    load_dotenv(env_path, override=True)
else:
    print(f"DEBUG: .env file NOT FOUND at {env_path}")

from routes.dashboard_routes import dashboard_bp
from routes.therapy_routes import therapy_bp
from routes.user_routes import user_bp
from routes.detect_routes import detect_bp
from routes.reader_routes import reader_bp
from routes.pronunciation_routes import pronunciation_bp  # NEW: Azure pronunciation assessment
from routes.chat_routes import chat_bp

app = Flask(__name__)

# Enhanced CORS for development
CORS(app, resources={r"/api/*": {
    "origins": "*",
    "methods": ["GET", "POST", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"]
}})

# Register Blueprints
app.register_blueprint(dashboard_bp)
app.register_blueprint(therapy_bp)
app.register_blueprint(user_bp)
app.register_blueprint(detect_bp)
app.register_blueprint(reader_bp)
app.register_blueprint(pronunciation_bp)  # NEW: Azure pronunciation assessment
app.register_blueprint(chat_bp)

if __name__ == "__main__":
    if not os.getenv("GOOGLE_API_KEY"):
        print("WARNING: GOOGLE_API_KEY not found. Running in basic mode.")
    if not os.getenv("AZURE_SPEECH_KEY"):
        print("WARNING: AZURE_SPEECH_KEY not found. Pronunciation assessment will not work.")

    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)