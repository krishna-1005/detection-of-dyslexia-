import os
import json
import base64
import requests
from flask import Blueprint, request, jsonify

pronunciation_bp = Blueprint('pronunciation', __name__)

# Must match PASS_THRESHOLD in vediogen.js (frontend) so both sides agree on Pass/Fail.
PASS_THRESHOLD = 95


@pronunciation_bp.route("/api/pronunciation-assessment", methods=["POST"])
def assess_pronunciation():
    """
    Receives recorded audio (base64) + the target/reference sentence from the
    frontend, forwards it to Azure's Pronunciation Assessment REST API (so the
    Azure key never touches the browser), and returns structured word-level
    scoring: accuracy, error type (None / Mispronunciation / Omission / Insertion),
    and an overall Pass/Fail verdict.

    Expects JSON body: { "audioBase64": "...", "referenceText": "..." }
    """
    data = request.get_json() or {}
    audio_base64 = data.get("audioBase64")
    reference_text = data.get("referenceText")

    if not audio_base64 or not reference_text:
        return jsonify({"error": "Missing audioBase64 or referenceText in request body."}), 400

    # Azure credentials — read from .env (never hardcoded), same pattern as GOOGLE_API_KEY in app.py
    azure_key = os.getenv("AZURE_SPEECH_KEY")
    azure_region = os.getenv("AZURE_SPEECH_REGION")

    if not azure_key or not azure_region:
        print("DEBUG: AZURE_SPEECH_KEY or AZURE_SPEECH_REGION not set in .env")
        return jsonify({"error": "Server is missing Azure Speech configuration."}), 500

    try:
        audio_bytes = base64.b64decode(audio_base64)
    except Exception:
        return jsonify({"error": "Invalid base64 audio data."}), 400

    # Azure's Pronunciation Assessment parameters, sent as a base64 JSON header
    pron_params = {
        "ReferenceText": reference_text,
        "GradingSystem": "HundredMark",
        "Granularity": "Word",
        "Dimension": "Comprehensive",
        "EnableMiscue": True,  # lets Azure flag omissions/insertions, not just mispronunciations
    }
    pron_header = base64.b64encode(json.dumps(pron_params).encode("utf-8")).decode("utf-8")

    azure_url = (
        f"https://{azure_region}.stt.speech.microsoft.com/speech/recognition/"
        f"conversation/cognitiveservices/v1?language=en-US"
    )

    headers = {
        "Ocp-Apim-Subscription-Key": azure_key,
        "Content-Type": "audio/webm; codecs=opus",  # matches browser MediaRecorder default output
        "Pronunciation-Assessment": pron_header,
        "Accept": "application/json",
    }

    try:
        azure_resp = requests.post(azure_url, headers=headers, data=audio_bytes, timeout=15)
        azure_resp.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"DEBUG: Azure pronunciation request failed: {e}")
        return jsonify({"error": "Azure pronunciation assessment request failed.", "detail": str(e)}), 502

    result = azure_resp.json()
    nbest = result.get("NBest") or []

    if not nbest:
        return jsonify({"error": "Azure did not return a usable pronunciation result.", "raw": result}), 502

    best = nbest[0]
    words_raw = best.get("Words", [])
    words = []
    for w in words_raw:
        pa = w.get("PronunciationAssessment", {})
        words.append({
            "word": w.get("Word"),
            "accuracyScore": pa.get("AccuracyScore", 0),
            "errorType": pa.get("ErrorType", "None"),  # None | Mispronunciation | Omission | Insertion
        })

    overall_pa = best.get("PronunciationAssessment", {})
    overall_accuracy = round(overall_pa.get("AccuracyScore", 0))
    pronunciation_score = round(overall_pa.get("PronScore", overall_accuracy))

    return jsonify({
        "accuracy": overall_accuracy,
        "pronunciationScore": pronunciation_score,
        "passStatus": "Pass" if overall_accuracy >= PASS_THRESHOLD else "Fail",
        "recognizedText": best.get("Display") or best.get("Lexical") or "",
        "words": words,
    })