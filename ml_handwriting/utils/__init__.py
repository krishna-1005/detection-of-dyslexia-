"""
Cognilex AI - Handwriting Utilities Module
"""

from ml_handwriting.utils.metrics import (
    levenshtein_distance,
    character_error_rate,
    word_error_rate,
    exact_match_accuracy,
)
from ml_handwriting.utils.dataset_loader import (
    validate_annotation_record,
    HandwritingDatasetLoader,
)

__all__ = [
    "levenshtein_distance",
    "character_error_rate",
    "word_error_rate",
    "exact_match_accuracy",
    "validate_annotation_record",
    "HandwritingDatasetLoader",
]

