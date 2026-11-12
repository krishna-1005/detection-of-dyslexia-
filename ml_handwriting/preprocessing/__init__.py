"""
Cognilex AI - Handwriting Preprocessing Module
"""

from ml_handwriting.preprocessing.image_cleaning import (
    load_image,
    to_grayscale,
    remove_noise,
    binarize_adaptive,
    clean_handwriting_image,
)
from ml_handwriting.preprocessing.image_normalization import (
    estimate_skew_angle,
    deskew_image,
    get_ink_bounding_box,
    crop_to_bounding_box,
    normalize_and_pad,
    normalize_handwriting_pipeline,
)
from ml_handwriting.preprocessing.augmentation import (
    ControlledHandwritingAugmenter,
    augment_image,
)

__all__ = [
    "load_image",
    "to_grayscale",
    "remove_noise",
    "binarize_adaptive",
    "clean_handwriting_image",
    "estimate_skew_angle",
    "deskew_image",
    "get_ink_bounding_box",
    "crop_to_bounding_box",
    "normalize_and_pad",
    "normalize_handwriting_pipeline",
    "ControlledHandwritingAugmenter",
    "augment_image",
]

