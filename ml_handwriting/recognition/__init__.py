"""
Cognilex AI - Handwriting Recognition Module
"""

from ml_handwriting.recognition.handwriting_recognition import (
    TrOCRHandwritingRecognizer,
    get_handwriting_recognizer,
)
from ml_handwriting.recognition.service import (
    recognize_handwriting,
    batch_recognize_handwriting,
    get_recognition_health,
)

__all__ = [
    "TrOCRHandwritingRecognizer",
    "get_handwriting_recognizer",
    "recognize_handwriting",
    "batch_recognize_handwriting",
    "get_recognition_health",
]

