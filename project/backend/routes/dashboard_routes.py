from flask import Blueprint, jsonify, g
from middleware.auth import require_auth, get_user_record

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route("/api/dashboard", methods=["GET"])
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
