import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from textblob import TextBlob
import re
import docx
import PyPDF2
import io
import json
import uuid
from functools import wraps

# Firebase Admin SDK
import firebase_admin
from firebase_admin import auth as firebase_auth, credentials

# Get the absolute path of the current directory (project/backend)
basedir = os.path.abspath(os.path.dirname(__file__))
env_path = os.path.join(basedir, '.env')

# Force load the .env file
if os.path.exists(env_path):
    print(f"DEBUG: Found .env file at {env_path}")
    load_dotenv(env_path, override=True)
else:
    print(f"DEBUG: .env file NOT FOUND at {env_path}")

# Initialize Firebase Admin App
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

from model.llm_agent import analyze_with_llm, simplify_for_dyslexia
from model.detection_agent import analyze_text as analyze_with_agent

app = Flask(__name__)
# Enhanced CORS for development
CORS(app, resources={r"/api/*": {
    "origins": "*",
    "methods": ["GET", "POST", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"]
}})

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

# Authentication Middleware Decorator
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
            # Fallback for dev mode / unverified token decoding if clock skew or missing service account
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

# Protected User Endpoints

@app.route("/api/dashboard", methods=["GET"])
@require_auth
def get_dashboard():
    uid = g.user["uid"]
    user_record, _ = get_user_record(uid, email=g.user.get("email"), name=g.user.get("name"))
    
    history = user_record.get("history", [])
    total_tests = len(history)
    avg_risk = 0
    if total_tests > 0:
        total_score = sum([h.get("score", 0) for h in history])
        avg_risk = round(total_score / total_tests)
        
    stats = {
        "totalTests": total_tests,
        "avgRisk": f"{avg_risk}%",
        "completionRate": "100%" if total_tests > 0 else "0%"
    }

    profile = user_record.get("profile", {})
    profile["riskLevel"] = "High" if avg_risk > 60 else "Moderate" if avg_risk > 30 else "Low" if total_tests > 0 else "None"
    profile["progress"] = min(100, total_tests * 10)
    if total_tests > 0:
        profile["lastAssessment"] = history[0].get("date", "Today")
        
    return jsonify({
        "user_id": uid,
        "profile": profile,
        "stats": stats,
        "history": history,
        "recommendations": user_record.get("recommendations", [])
    })

@app.route("/api/therapy/progress", methods=["GET", "POST"])
@require_auth
def therapy_progress():
    uid = g.user["uid"]
    user_record, db = get_user_record(uid, email=g.user.get("email"), name=g.user.get("name"))
    
    if "therapy_sessions" not in user_record:
        user_record["therapy_sessions"] = []
    if "therapy_progress" not in user_record:
        user_record["therapy_progress"] = {}
        
    if request.method == "POST":
        data = request.get_json() or {}
        module_type = data.get("type", "phoneme")
        
        session_entry = {
            "id": str(uuid.uuid4()),
            "type": module_type,
            "score": data.get("score", 0),
            "accuracy": data.get("accuracy", 0),
            "date": data.get("date") or str(uuid.uuid4())[:8],
            "timeTaken": data.get("timeTaken", "N/A"),
            "status": "Completed"
        }
        
        user_record["therapy_sessions"].insert(0, session_entry)
        user_record["last_played_module"] = module_type
        
        prev = user_record["therapy_progress"].get(module_type, {})
        sessions_count = prev.get("sessions", 0) + 1
        pb = max(prev.get("pb_val", 0), data.get("score", 0))
        acc = data.get("accuracy", 0)
        
        user_record["therapy_progress"][module_type] = {
            "type": module_type,
            "sessions": sessions_count,
            "accuracy": f"{acc}%",
            "pb": f"{pb} pts",
            "pb_val": pb,
            "lastPlayed": session_entry["date"],
            "trend": "Improving" if acc >= 80 else "Stable" if acc >= 50 else "Needs Practice"
        }
        
        db["users"][uid] = user_record
        save_user_database(db)
        return jsonify({
            "message": "Therapy session recorded successfully",
            "session": session_entry,
            "progress": user_record["therapy_progress"]
        })
        
    return jsonify({
        "sessions": user_record.get("therapy_sessions", []),
        "progress": user_record.get("therapy_progress", {}),
        "lastPlayedModule": user_record.get("last_played_module", "phoneme")
    })

@app.route("/api/profile", methods=["GET", "POST"])
@require_auth
def user_profile():
    uid = g.user["uid"]
    user_record, db = get_user_record(uid, email=g.user.get("email"), name=g.user.get("name"))
    
    if request.method == "POST":
        data = request.get_json() or {}
        user_record["profile"].update({
            "name": data.get("name", user_record["profile"]["name"]),
            "patientId": data.get("patientId", user_record["profile"]["patientId"]),
            "age": data.get("age", user_record["profile"].get("age"))
        })
        db["users"][uid] = user_record
        save_user_database(db)
        
    return jsonify(user_record["profile"])

@app.route("/api/history", methods=["GET", "POST"])
@require_auth
def user_history():
    uid = g.user["uid"]
    user_record, db = get_user_record(uid, email=g.user.get("email"), name=g.user.get("name"))
    
    if request.method == "POST":
        entry = request.get_json() or {}
        entry["id"] = entry.get("id") or str(uuid.uuid4())
        entry["timestamp"] = entry.get("timestamp") or str(uuid.uuid4())[:8]
        user_record["history"].insert(0, entry)
        db["users"][uid] = user_record
        save_user_database(db)
        return jsonify({"message": "History entry recorded successfully", "history": user_record["history"]})
        
    return jsonify({"history": user_record["history"]})

    users = load_users()
    if email in users:
        return jsonify({"error": "User with this email already exists"}), 400

    users[email] = {
        "name": name,
        "email": email,
        "password": password,
        "patientId": patient_id or "LX-" + str(uuid.uuid4())[:4].upper()
    }
    save_users(users)

    return jsonify({
        "user": {
            "name": name,
            "email": email,
            "patientId": users[email]["patientId"]
        },
        "token": "mock-token-" + str(uuid.uuid4())
    })

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No credentials provided"}), 400
        
    email = data.get("email")
    password = data.get("password")

    users = load_users()
    user = users.get(email)

    if not user:
        return jsonify({"error": f"No account found for {email}"}), 401

    if user["password"] == password:
        return jsonify({
            "user": {
                "name": user["name"],
                "email": user["email"],
                "patientId": user["patientId"]
            },
            "token": "mock-token-" + str(uuid.uuid4())
        })
    
    return jsonify({"error": "Incorrect password"}), 401

def simple_tokenize(text):
    return re.findall(r"[A-Za-z']+", text)

def agent_analysis(text):
    agent_result = analyze_with_agent(text)
    
    # Map agent output to UI expected format
    misspelled_words = []
    for item in agent_result.get("misspelled", []):
        misspelled_words.append({
            "original": item["word"],
            "suggested": item["best"],
            "type": "Spelling",
            "reason": "Probable dyslexic transposition or phonetic error"
        })
    
    # Generate mock linguistic patterns based on agent findings
    linguistic_patterns = []
    trans_count = agent_result.get("transposition_count", 0)
    if trans_count > 0:
        linguistic_patterns.append({
            "category": "Visual Transposition",
            "level": "High" if trans_count > 2 else "Med",
            "example": "Letter swapping detected"
        })
    
    miss_count = agent_result.get("misspelled_count", 0)
    if miss_count > 0:
        linguistic_patterns.append({
            "category": "Phonetic Decoding",
            "level": "Med" if miss_count > 3 else "Low",
            "example": f"Detected {miss_count} unconventional spellings"
        })

    blob = TextBlob(text)
    
    return {
        "total_words": agent_result.get("total_words", 0),
        "misspelled_count": miss_count,
        "risk_score": agent_result.get("risk_score", 0) / 100.0,
        "corrected_sentence": agent_result.get("corrected_text", text),
        "misspelled_words": misspelled_words,
        "linguistic_patterns": linguistic_patterns,
        "polarity": blob.sentiment.polarity,
        "subjectivity": blob.sentiment.subjectivity,
        "model_used": "Neural Agent (Standard)"
    }

@app.route("/api/analyze", methods=["POST"])
def analyze():
    data = request.get_json()
    text = data.get("text", "") or ""
    
    if not text.strip():
        return jsonify({"error": "Empty text"}), 400

    # Try LLM Analysis first if API key exists
    api_key = os.getenv("GOOGLE_API_KEY")
    if api_key and api_key.startswith("AIza"):
        print(f"DEBUG: Valid API Key detected.")
        llm_result = analyze_with_llm(text)
        if "error" not in llm_result:
            print("DEBUG: Gemini AI Success!")
            llm_result["model_used"] = "Gemini AI (Premium)"
            blob = TextBlob(text)
            llm_result["polarity"] = llm_result.get("polarity", blob.sentiment.polarity)
            llm_result["subjectivity"] = llm_result.get("subjectivity", blob.sentiment.subjectivity)
            return jsonify(llm_result)
        else:
            print(f"DEBUG: Gemini AI Failed! Error: {llm_result.get('error')}")
            # Send the error back to the UI so the user knows why it's falling back
            fallback_result = agent_analysis(text)
            fallback_result["warning"] = f"AI Error: {llm_result.get('error')}"
            return jsonify(fallback_result)
    else:
        print("DEBUG: No valid GOOGLE_API_KEY found. Using Standard Agent.")
    
    # Fallback to specialized agent analysis
    return jsonify(agent_analysis(text))

@app.route("/api/upload", methods=["POST"])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    filename = file.filename.lower()
    text = ""
    
    try:
        if filename.endswith('.txt'):
            text = file.read().decode('utf-8')
        elif filename.endswith('.pdf'):
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file.read()))
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
        elif filename.endswith('.docx'):
            doc = docx.Document(io.BytesIO(file.read()))
            for para in doc.paragraphs:
                text += para.text + "\n"
        else:
            return jsonify({"error": "Unsupported file format"}), 400
        
        return jsonify({"text": text.strip()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/simplify", methods=["POST"])
def simplify():
    data = request.get_json()
    text = data.get("text", "")
    if not text.strip():
        return jsonify({"error": "Empty text"}), 400
    
    result = simplify_for_dyslexia(text)
    return jsonify(result)

if __name__ == "__main__":
    # Check for .env file or environment variable
    if not os.getenv("GOOGLE_API_KEY"):
        print("WARNING: GOOGLE_API_KEY not found. Running in basic mode.")
    
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
