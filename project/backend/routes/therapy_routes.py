import uuid
from flask import Blueprint, request, jsonify, g
from middleware.auth import require_auth, get_user_record, save_user_database

therapy_bp = Blueprint('therapy', __name__)

@therapy_bp.route("/api/therapy/progress", methods=["GET", "POST"])
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
