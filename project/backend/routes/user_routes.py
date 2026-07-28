import uuid
from flask import Blueprint, request, jsonify, g
from middleware.auth import require_auth, get_user_record, save_user_database

user_bp = Blueprint('user', __name__)

@user_bp.route("/api/profile", methods=["GET", "POST"])
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

@user_bp.route("/api/history", methods=["GET", "POST"])
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
