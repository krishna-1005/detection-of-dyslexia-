import os
import io
from flask import Blueprint, request, jsonify
from textblob import TextBlob
import docx
import PyPDF2

from model.llm_agent import analyze_with_llm
from model.detection_agent import analyze_text as analyze_with_agent

detect_bp = Blueprint('detect', __name__)

def agent_analysis(text):
    agent_result = analyze_with_agent(text)
    
    misspelled_words = []
    for item in agent_result.get("misspelled", []):
        misspelled_words.append({
            "original": item["word"],
            "suggested": item["best"],
            "type": "Spelling",
            "reason": "Probable dyslexic transposition or phonetic error"
        })
    
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

@detect_bp.route("/api/analyze", methods=["POST"])
def analyze():
    data = request.get_json() or {}
    text = data.get("text", "") or ""
    
    if not text.strip():
        return jsonify({"error": "Empty text"}), 400

    api_key = os.getenv("GOOGLE_API_KEY")
    if api_key and api_key.startswith("AIza"):
        print("DEBUG: Valid API Key detected.")
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
            fallback_result = agent_analysis(text)
            fallback_result["warning"] = f"AI Error: {llm_result.get('error')}"
            return jsonify(fallback_result)
    else:
        print("DEBUG: No valid GOOGLE_API_KEY found. Using Standard Agent.")
    
    return jsonify(agent_analysis(text))

@detect_bp.route("/api/upload", methods=["POST"])
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
