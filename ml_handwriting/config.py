"""
Cognilex AI - Handwriting Analysis & Dyslexia Screening Module
Configuration and Environment Settings
"""

import os
from pathlib import Path
import torch

# Base Paths
MODULE_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = MODULE_ROOT.parent

# Dataset Directories
DATASET_DIR = MODULE_ROOT / "dataset"
RAW_DATA_DIR = DATASET_DIR / "raw"
PROCESSED_DATA_DIR = DATASET_DIR / "processed"
ANNOTATIONS_DIR = DATASET_DIR / "annotations"
TEST_SAMPLES_DIR = DATASET_DIR / "test_samples"

# Model & Artifact Directories
MODELS_DIR = MODULE_ROOT / "models"
SAVED_MODELS_DIR = MODELS_DIR / "saved_models"
REPORTS_DIR = MODULE_ROOT / "reports"

# Ensure runtime directories exist
for directory in [
    RAW_DATA_DIR,
    PROCESSED_DATA_DIR,
    ANNOTATIONS_DIR,
    TEST_SAMPLES_DIR,
    SAVED_MODELS_DIR,
    REPORTS_DIR,
]:
    directory.mkdir(parents=True, exist_ok=True)

# Image Preprocessing Standards
STANDARD_IMAGE_HEIGHT = 128
STANDARD_IMAGE_WIDTH = 384
CHANNELS = 1  # Grayscale default for OCR / feature analysis
TARGET_DPI = 300

# Deskewing Parameters
MAX_SKEW_ANGLE_DEGREES = 20.0
MIN_CONTOUR_AREA_FOR_SKEW = 80.0

# Denoising & Filtering
BILATERAL_D = 9
BILATERAL_SIGMA_COLOR = 75
BILATERAL_SIGMA_SPACE = 75
GAUSSIAN_BLUR_KERNEL = (3, 3)

# Adaptive Thresholding Parameters
ADAPTIVE_BLOCK_SIZE = 19
ADAPTIVE_C = 9

# Controlled Augmentation Parameters (Strict bounds to preserve letter semantics)
AUG_MAX_ROTATION_DEGREES = 4.0      # Must not flip or excessively tilt letters
AUG_BRIGHTNESS_RANGE = (0.85, 1.15)
AUG_CONTRAST_RANGE = (0.85, 1.15)
AUG_MAX_TRANSLATION_PX = 4
AUG_SCALE_RANGE = (0.96, 1.04)

# File Extensions
SUPPORTED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".webp"}

# Standard Annotation Schema Required & Optional Fields
ANNOTATION_REQUIRED_COLUMNS = [
    "image_id",
    "participant_id",
    "expected_word",
    "transcribed_word",
    "participant_group",
    "annotation_status",
    "image_path"
]

ANNOTATION_OPTIONAL_COLUMNS = [
    "character_errors",
    "reversals_present",
    "is_synthetic",
    "notes",
    "created_at"
]

VALID_PARTICIPANT_GROUPS = {"dyslexic", "comparison", "unspecified", "synthetic_control"}
VALID_ANNOTATION_STATUSES = {"verified", "pending", "unverified", "synthetic_calibration"}

# Recognition Engine Configuration
TROCR_MODEL_NAME = "microsoft/trocr-base-handwritten"
TROCR_SMALL_MODEL_NAME = "microsoft/trocr-small-handwritten"
RECOGNITION_CONFIDENCE_THRESHOLD = 0.65
MIN_IMAGE_CONTRAST_STD = 15.0

# Execution Hardware
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
RANDOM_SEED = 42

