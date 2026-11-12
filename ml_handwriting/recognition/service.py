"""
Cognilex AI - Handwriting Recognition Service Interface
Provides a decoupled, reusable service interface prepared for Flask / FastAPI backend
integration without breaking any existing Cognilex detection endpoints.
"""

from typing import Union, Dict, Any, Optional, List
from pathlib import Path
import numpy as np
from PIL import Image

from ml_handwriting.config import (
    TROCR_MODEL_NAME,
    DEVICE,
)
from ml_handwriting.recognition.handwriting_recognition import (
    get_handwriting_recognizer,
)
from ml_handwriting.utils.metrics import (
    levenshtein_distance,
    character_error_rate,
)


def recognize_handwriting(
    image_input: Union[str, Path, bytes, np.ndarray, Image.Image],
    expected_word: Optional[str] = None,
    preprocess: bool = True,
) -> Dict[str, Any]:
    """
    Standard recognition service endpoint interface.

    Args:
        image_input: Image path, bytes buffer, PIL image, or numpy array.
        expected_word: Optional expected target word for comparative evaluation.
        preprocess: Whether to apply OpenCV cleaning, deskewing, and normalization.

    Returns:
        Dict[str, Any]: Clean, JSON-serializable recognition response.
    """
    recognizer = get_handwriting_recognizer()
    rec_result = recognizer.predict(
        image_input=image_input,
        preprocess=preprocess,
        expected_word=expected_word,
    )

    recognized_text = rec_result.get("text", "")
    response: Dict[str, Any] = {
        "status": "success" if not rec_result.get("error") else "error",
        "recognized_text": recognized_text,
        "raw_text": rec_result.get("raw_text", ""),
        "confidence": rec_result.get("confidence"),
        "confidence_is_calibrated": False,
        "is_uncertain": rec_result.get("is_uncertain", False),
        "uncertainty_reasons": rec_result.get("uncertainty_reasons", []),
        "model_used": rec_result.get("model_used"),
        "model_status": rec_result.get("model_status"),
        "preprocessed": rec_result.get("preprocessed"),
        "device": rec_result.get("device"),
        "inference_time_ms": rec_result.get("inference_time_ms"),
        "image_dimensions": rec_result.get("image_dimensions"),
    }

    if expected_word:
        clean_exp = expected_word.strip().upper()
        clean_rec = recognized_text.strip().upper()
        distance = levenshtein_distance(clean_exp, clean_rec)
        cer = character_error_rate(clean_exp, clean_rec)
        response["expected_word"] = clean_exp
        response["levenshtein_distance"] = distance
        response["character_error_rate"] = round(cer, 3)
        response["exact_match"] = clean_exp == clean_rec

    if rec_result.get("error"):
        response["error"] = rec_result.get("error")

    return response


def batch_recognize_handwriting(
    image_inputs: List[Union[str, Path, bytes, np.ndarray, Image.Image]],
    expected_words: Optional[List[str]] = None,
    preprocess: bool = True,
) -> Dict[str, Any]:
    """
    Batch recognition service interface for processing multi-word worksheets.
    """
    results: List[Dict[str, Any]] = []
    total_latency = 0.0

    for idx, img in enumerate(image_inputs):
        exp = expected_words[idx] if expected_words and idx < len(expected_words) else None
        res = recognize_handwriting(img, expected_word=exp, preprocess=preprocess)
        total_latency += res.get("inference_time_ms", 0.0)
        results.append(res)

    return {
        "total_images": len(image_inputs),
        "total_latency_ms": round(total_latency, 2),
        "average_latency_ms": round(total_latency / max(1, len(image_inputs)), 2),
        "results": results,
    }


def get_recognition_health() -> Dict[str, Any]:
    """
    Returns service health and model status metadata.
    """
    recognizer = get_handwriting_recognizer()
    return {
        "service": "Cognilex Handwriting Recognition Service",
        "status": "healthy",
        "device": DEVICE,
        "preferred_model": TROCR_MODEL_NAME,
        "is_model_loaded": recognizer.is_loaded,
        "model_runtime_status": recognizer.model_status,
        "offline_fallback_enabled": recognizer.offline_fallback,
    }

