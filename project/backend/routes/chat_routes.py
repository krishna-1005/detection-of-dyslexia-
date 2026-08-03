from flask import Blueprint, request, jsonify
from model.llm_agent import chat_with_llm

chat_bp = Blueprint('chat', __name__)

@chat_bp.route("/api/chat", methods=["POST", "OPTIONS"])
def chat():
    # Handle CORS preflight
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    data = request.get_json() or {}
    message = data.get("message", "").strip()
    history = data.get("history", [])

    if not message:
        return jsonify({"error": "Message content cannot be empty."}), 400

    print(f"DEBUG: Chat request received for Groq AI — message: '{message[:50]}...'")
    result = chat_with_llm(message, history)
    
    if "error" in result:
        print(f"DEBUG: Groq AI Error: {result['error']}")
        return jsonify(result), 400
        
    return jsonify(result)

