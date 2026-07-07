import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from textblob import TextBlob
import re
import docx
import PyPDF2
import io

# Get the absolute path of the current directory (project/backend)
basedir = os.path.abspath(os.path.dirname(__file__))
env_path = os.path.join(basedir, '.env')

# Force load the .env file
if os.path.exists(env_path):
    print(f"DEBUG: Found .env file at {env_path}")
    load_dotenv(env_path, override=True)
else:
    print(f"DEBUG: .env file NOT FOUND at {env_path}")

from model.llm_agent import analyze_with_llm, simplify_for_dyslexia
from model.detection_agent import analyze_text as analyze_with_agent
import json
import uuid

app = Flask(__name__)
# Enhanced CORS for development
CORS(app, resources={r"/api/*": {
    "origins": "*",
    "methods": ["GET", "POST", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"]
}})

USERS_FILE = os.path.join(basedir, 'users.json')

def load_users():
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_users(users):
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f)

@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
        
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    patient_id = data.get("patientId")

    if not all([name, email, password]):
        missing = [f for f in ["name", "email", "password"] if not data.get(f)]
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

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
