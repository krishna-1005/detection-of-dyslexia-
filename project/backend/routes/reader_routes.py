from flask import Blueprint, request, jsonify
from model.llm_agent import simplify_for_dyslexia

reader_bp = Blueprint('reader', __name__)

@reader_bp.route("/api/simplify", methods=["POST"])
def simplify():
    data = request.get_json() or {}
    text = data.get("text", "")
    if not text.strip():
        return jsonify({"error": "Empty text"}), 400
    
    result = simplify_for_dyslexia(text)
    return jsonify(result)
