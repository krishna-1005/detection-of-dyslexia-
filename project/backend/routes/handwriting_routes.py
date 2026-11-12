"""
Cognilex AI - Handwriting Intelligence Backend Routes
Exposes REST endpoints for single-word recognition, batch worksheet analysis,
and health/model-info telemetry.
"""

import sys
from pathlib import Path
from flask import Blueprint, request, jsonify

# Ensure workspace root is in sys.path for ml_handwriting imports
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

from ml_handwriting.recognition.service import (
    recognize_handwriting,
    batch_recognize_handwriting,
    get_recognition_health,
)
from ml_handwriting.config import (
    TROCR_MODEL_NAME,
    DEVICE,
    STANDARD_IMAGE_WIDTH,
    STANDARD_IMAGE_HEIGHT,
)

handwriting_bp = Blueprint("handwriting", __name__)


@handwriting_bp.route("/api/handwriting/health", methods=["GET"])
def health():
    """Returns service readiness and runtime device telemetry."""
    try:
        health_info = get_recognition_health()
        return jsonify(health_info), 200
    except Exception as e:
        return jsonify({
            "service": "Cognilex Handwriting Recognition Service",
            "status": "degraded",
            "error": str(e)
        }), 500


@handwriting_bp.route("/api/handwriting/model-info", methods=["GET"])
def model_info():
    """Returns architectural metadata and capabilities."""
    health_info = get_recognition_health()
    return jsonify({
        "model_name": TROCR_MODEL_NAME,
        "engine_architecture": "Microsoft TrOCR (Transformer Vision Encoder + RoBERTa Decoder)",
        "hardware_device": DEVICE,
        "runtime_status": health_info.get("model_runtime_status", "unknown"),
        "is_model_loaded": health_info.get("is_model_loaded", False),
        "target_canvas": f"{STANDARD_IMAGE_WIDTH}x{STANDARD_IMAGE_HEIGHT}",
        "supported_features": [
            "Handwritten Word Transcription",
            "Aspect-Ratio Preserving Normalization",
            "Contour Baseline Deskewing",
            "Token Confidence Estimation",
            "Uncertainty & Anomaly Detection",
            "Character Error Rate (CER) Benchmarking"
        ],
        "research_status": "Exploratory Research & Screening Tool (Not a clinical diagnosis)"
    }), 200


@handwriting_bp.route("/api/handwriting/analyze", methods=["POST"])
def analyze_single_word():
    """
    Accepts a single handwritten word image and returns recognized text,
    confidence metrics, and uncertainty flags.
    """
    expected_word = request.form.get("expected_word") or request.args.get("expected_word")
    preprocess_flag = request.form.get("preprocess", "true").lower() in ("true", "1", "yes")

    image_bytes = None

    # Check multipart file upload
    if "file" in request.files:
        upload = request.files["file"]
        if upload.filename != "":
            image_bytes = upload.read()
    elif "image" in request.files:
        upload = request.files["image"]
        if upload.filename != "":
            image_bytes = upload.read()

    # Check JSON body with base64 or path
    if image_bytes is None and request.is_json:
        data = request.get_json() or {}
        expected_word = expected_word or data.get("expected_word")
        preprocess_flag = data.get("preprocess", preprocess_flag)

        image_path = data.get("image_path")
        if image_path:
            p = Path(image_path)
            if p.exists():
                with open(p, "rb") as f:
                    image_bytes = f.read()

        if image_bytes is None and data.get("image_base64"):
            import base64
            b64_str = data["image_base64"]
            if "," in b64_str:
                b64_str = b64_str.split(",")[1]
            try:
                image_bytes = base64.b64decode(b64_str)
            except Exception as e:
                return jsonify({"error": f"Invalid base64 encoding: {e}", "status": "error"}), 400

    if not image_bytes:
        return jsonify({
            "error": "No image provided. Please upload an image file via multipart form-data (key 'file') or JSON 'image_path'/'image_base64'.",
            "status": "error",
            "is_uncertain": True,
            "uncertainty_reasons": ["MISSING_IMAGE_INPUT"]
        }), 400

    try:
        result = recognize_handwriting(
            image_input=image_bytes,
            expected_word=expected_word,
            preprocess=preprocess_flag
        )
        status_code = 200 if result.get("status") == "success" else 422
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({
            "error": str(e),
            "status": "error",
            "is_uncertain": True,
            "uncertainty_reasons": ["UNCAUGHT_SERVER_EXCEPTION"]
        }), 500


@handwriting_bp.route("/api/handwriting/batch-analyze", methods=["POST"])
def batch_analyze():
    """
    Accepts multiple image files for multi-word worksheet analysis.
    """
    files = request.files.getlist("files") or request.files.getlist("images")
    if not files:
        return jsonify({
            "error": "No files provided. Send multi-part files with key 'files'.",
            "status": "error"
        }), 400

    preprocess_flag = request.form.get("preprocess", "true").lower() in ("true", "1", "yes")
    expected_words_raw = request.form.get("expected_words", "")
    expected_words = [w.strip() for w in expected_words_raw.split(",")] if expected_words_raw else None

    image_byte_list = [f.read() for f in files if f.filename != ""]

    if not image_byte_list:
        return jsonify({"error": "All uploaded files were empty.", "status": "error"}), 400

    try:
        batch_result = batch_recognize_handwriting(
            image_inputs=image_byte_list,
            expected_words=expected_words,
            preprocess=preprocess_flag
        )
        return jsonify(batch_result), 200
    except Exception as e:
        return jsonify({"error": str(e), "status": "error"}), 500

