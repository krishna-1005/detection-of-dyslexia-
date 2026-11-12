"""
Unit tests for Handwriting Preprocessing Pipeline:
Grayscale conversion, noise removal, binarization, skew detection, deskewing,
bounding-box cropping, canvas normalization, and controlled augmentation.
"""

import numpy as np
import cv2
import pytest
from PIL import Image

from ml_handwriting.config import (
    STANDARD_IMAGE_HEIGHT,
    STANDARD_IMAGE_WIDTH,
    TEST_SAMPLES_DIR,
)
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
)


class TestImageCleaning:

    def test_to_grayscale_from_bgr(self):
        bgr = np.zeros((100, 100, 3), dtype=np.uint8)
        bgr[:, :] = (100, 150, 200)
        gray = to_grayscale(bgr)
        assert len(gray.shape) == 2
        assert gray.shape == (100, 100)
        assert gray.dtype == np.uint8

    def test_to_grayscale_from_rgba(self):
        rgba = np.full((100, 100, 4), 255, dtype=np.uint8)
        gray = to_grayscale(rgba)
        assert len(gray.shape) == 2
        assert gray.shape == (100, 100)

    def test_to_grayscale_idempotent_on_gray(self):
        original_gray = np.full((50, 50), 128, dtype=np.uint8)
        res = to_grayscale(original_gray)
        assert np.array_equal(original_gray, res)

    def test_remove_noise_methods(self):
        noisy = np.random.randint(0, 255, (100, 100), dtype=np.uint8)
        for method in ["bilateral", "gaussian", "median", "combined"]:
            denoised = remove_noise(noisy, method=method)
            assert denoised.shape == (100, 100)
            assert denoised.dtype == np.uint8

    def test_binarize_adaptive(self):
        img = np.full((100, 100), 200, dtype=np.uint8)
        img[40:60, 40:60] = 30  # Dark ink square

        # Normal white paper mode (dark ink = 0, paper = 255)
        binary_white = binarize_adaptive(img, method="otsu", invert=False)
        assert binary_white[50, 50] == 0
        assert binary_white[10, 10] == 255

        # Inverted ink mask mode (white ink = 255, background = 0)
        binary_mask = binarize_adaptive(img, method="otsu", invert=True)
        assert binary_mask[50, 50] == 255
        assert binary_mask[10, 10] == 0


class TestImageNormalization:

    def test_deskew_angle_recovery(self):
        # Create an image with known synthetic tilt
        h, w = 150, 300
        canvas = np.zeros((h, w), dtype=np.uint8)
        # Draw horizontal ink line representing text line
        cv2.line(canvas, (40, 75), (260, 75), 255, thickness=12)

        # Rotate by -3 degrees
        known_angle = -3.0
        m = cv2.getRotationMatrix2D((w / 2, h / 2), known_angle, 1.0)
        tilted = cv2.warpAffine(canvas, m, (w, h), borderValue=0)

        # Estimate skew
        estimated = estimate_skew_angle(tilted)
        # Should be close to known angle within 1.5 degree tolerance
        assert abs(abs(estimated) - abs(known_angle)) <= 1.5

    def test_ink_bounding_box_and_crop(self):
        mask = np.zeros((200, 400), dtype=np.uint8)
        # Ink rectangle from x=100 to 200, y=50 to 90
        mask[50:90, 100:200] = 255

        bbox = get_ink_bounding_box(mask, padding=10)
        x, y, bw, bh = bbox

        assert x == 90
        assert y == 40
        assert bw == 120
        assert bh == 60

        cropped = crop_to_bounding_box(mask, bbox)
        assert cropped.shape == (60, 120)

    def test_normalize_and_pad_dimensions(self):
        small_img = np.full((50, 150), 100, dtype=np.uint8)
        normalized = normalize_and_pad(
            small_img,
            target_height=STANDARD_IMAGE_HEIGHT,
            target_width=STANDARD_IMAGE_WIDTH,
            background_color=255
        )
        assert normalized.shape == (STANDARD_IMAGE_HEIGHT, STANDARD_IMAGE_WIDTH)
        assert normalized.dtype == np.uint8

    def test_full_pipeline_on_synthetic_image(self):
        synth_img = TEST_SAMPLES_DIR / "SYNTH_001_SCOOL.png"
        assert synth_img.exists(), "Calibration sample should exist before running test"

        res = normalize_handwriting_pipeline(synth_img)
        assert res["original"] is not None
        assert res["normalized_gray"].shape == (STANDARD_IMAGE_HEIGHT, STANDARD_IMAGE_WIDTH)
        assert res["normalized_mask"].shape == (STANDARD_IMAGE_HEIGHT, STANDARD_IMAGE_WIDTH)
        assert isinstance(res["skew_angle"], float)


class TestControlledAugmentation:

    def test_rotation_safety_bounds(self):
        augmenter = ControlledHandwritingAugmenter(seed=123)
        img = np.full((128, 384), 255, dtype=np.uint8)
        img[50:80, 50:200] = 30  # stroke

        # Perform multiple augmentations
        for _ in range(5):
            aug = augmenter.random_rotation(img, max_angle=4.0)
            assert aug.shape == (128, 384)
            # Ensure not all pixels became white
            assert np.min(aug) < 100

    def test_augmentation_pipeline_invariants(self):
        augmenter = ControlledHandwritingAugmenter(seed=42)
        img = np.full((128, 384), 245, dtype=np.uint8)
        cv2.putText(img, "TEST", (60, 80), cv2.FONT_HERSHEY_SIMPLEX, 1.5, 20, 3)

        aug = augmenter.augment(img)
        # Dimensions must remain invariant
        assert aug.shape == img.shape
        # Array must remain valid uint8
        assert aug.dtype == np.uint8

