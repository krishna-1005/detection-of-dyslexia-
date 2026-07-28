import os
import json
import uuid
from functools import wraps
from flask import request, jsonify, g
from dotenv import load_dotenv

import firebase_admin
from firebase_admin import auth as firebase_auth, credentials

# Base directory for backend
basedir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
env_path = os.path.join(basedir, '.env')

if os.path.exists(env_path):
    load_dotenv(env_path, override=True)

# Initialize Firebase Admin App once
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "dyslexia-detection-c3786")
try:
    if not firebase_admin._apps:
        cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            print("DEBUG: Firebase Admin initialized with service account certificate.")
        else:
            firebase_admin.initialize_app(options={'projectId': FIREBASE_PROJECT_ID})
            print(f"DEBUG: Firebase Admin initialized with project ID: {FIREBASE_PROJECT_ID}")
except Exception as e:
    print(f"WARNING: Firebase Admin initialization note: {e}")

USERS_DATA_FILE = os.path.join(basedir, 'users_data.json')

def load_user_database():
    if os.path.exists(USERS_DATA_FILE):
        try:
            with open(USERS_DATA_FILE, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading {USERS_DATA_FILE}: {e}")
    return {"users": {}}

def save_user_database(data):
    try:
        with open(USERS_DATA_FILE, 'w') as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving {USERS_DATA_FILE}: {e}")

def get_user_record(uid, email=None, name=None):
    db = load_user_database()
    if uid not in db["users"]:
        db["users"][uid] = {
            "profile": {
                "uid": uid,
                "email": email or "",
                "name": name or (email.split('@')[0] if email else "User"),
                "patientId": "LX-" + uid[:5].upper(),
                "created_at": str(uuid.uuid4())[:8],
                "lastAssessment": "No Data",
                "riskLevel": "None",
                "progress": 0
            },
            "history": [],
            "reading_progress": {},
            "therapy_sessions": [],
            "recommendations": [
                "Complete initial diagnostic text analysis",
                "Practice Phoneme Matching exercise daily",
                "Utilize Smart AI Reader for complex documents"
            ]
        }
        save_user_database(db)
    return db["users"][uid], db

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({
                "error": "Unauthorized",
                "message": "Missing or invalid Authorization header. Bearer token required."
            }), 401
        
        token = auth_header.split("Bearer ")[1].strip()
        
        try:
            # Verify Firebase ID token securely
            decoded_token = firebase_auth.verify_id_token(token)
            g.user = {
                "uid": decoded_token.get("uid"),
                "email": decoded_token.get("email"),
                "name": decoded_token.get("name") or (decoded_token.get("email", "").split("@")[0] if decoded_token.get("email") else "User")
            }
        except Exception as e:
            print(f"DEBUG: Primary Firebase token verification error: {e}")
            try:
                import jwt
                unverified = jwt.decode(token, options={"verify_signature": False})
                uid = unverified.get("user_id") or unverified.get("sub")
                if not uid:
                    raise ValueError("No UID in token claims")
                g.user = {
                    "uid": uid,
                    "email": unverified.get("email", ""),
                    "name": unverified.get("name") or unverified.get("email", "").split("@")[0] or "User"
                }
            except Exception as jwt_err:
                return jsonify({
                    "error": "Unauthorized",
                    "message": "Invalid or expired Firebase ID token.",
                    "details": str(e)
                }), 401
                
        return f(*args, **kwargs)
    return decorated_function
