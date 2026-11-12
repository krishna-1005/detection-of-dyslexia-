"""
Unit tests for Handwriting Recognition Engine:
TrOCR model initialization, input validation, offline handling,
confidence calculation, uncertainty detection, and mocked neural inference.
"""

from pathlib import Path
from unittest.mock import MagicMock, patch
import numpy as np
import pytest
import torch
from PIL import Image

from ml_handwriting.config import (
    TEST_SAMPLES_DIR,
    TROCR_MODEL_NAME,
)
from ml_handwriting.recognition.handwriting_recognition import (
    TrOCRHandwritingRecognizer,
    get_handwriting_recognizer,
)
from ml_handwriting.recognition.service import (
    recognize_handwriting,
    batch_recognize_handwriting,
    get_recognition_health,
)


class TestRecognitionEngine:

    @pytest.fixture
    def recognizer(self):
        # Lazy loaded recognizer with offline fallback
        return TrOCRHandwritingRecognizer(
            model_name=TROCR_MODEL_NAME,
            device="cpu",
            lazy_load=True,
            offline_fallback=True
        )

    def test_recognizer_initialization_defaults(self, recognizer):
        assert recognizer.model_name == TROCR_MODEL_NAME
        assert recognizer.device == "cpu"
        assert recognizer.is_loaded is False
        assert recognizer.model_status == "uninitialized"

    def test_offline_fallback_mode(self, recognizer):
        # load_model with allow_network_download=False should safely enter offline fallback
        loaded = recognizer.load_model(allow_network_download=False)
        assert recognizer.model_status in ["offline_fallback_active", "ready_trocr_pretrained"]

    def test_invalid_image_path(self, recognizer):
        res = recognizer.predict("non_existent_file_path_12345.png")
        assert res["is_uncertain"] is True
        assert "error" in res
        assert any("CORRUPT_OR_UNREADABLE" in r for r in res["uncertainty_reasons"])

    def test_empty_image_handling(self, recognizer):
        empty_img = np.zeros((0, 0), dtype=np.uint8)
        res = recognizer.predict(empty_img)
        assert res["is_uncertain"] is True
        assert any("EMPTY_IMAGE" in r for r in res["uncertainty_reasons"])

    def test_low_contrast_image_handling(self, recognizer):
        # Solid white square has 0 standard deviation (contrast)
        blank = np.full((100, 100), 255, dtype=np.uint8)
        res = recognizer.predict(blank)
        assert res["is_uncertain"] is True
        assert any("LOW_IMAGE_CONTRAST" in r for r in res["uncertainty_reasons"])

    def test_recognition_output_schema(self, recognizer):
        sample_img = TEST_SAMPLES_DIR / "SYNTH_001_SCOOL.png"
        res = recognizer.predict(sample_img, preprocess=False)

        # Check required schema keys
        required_keys = [
            "text",
            "raw_text",
            "confidence",
            "is_uncertain",
            "uncertainty_reasons",
            "model_used",
            "model_status",
            "preprocessed",
            "inference_time_ms",
            "image_dimensions",
            "contrast_std",
        ]
        for key in required_keys:
            assert key in res, f"Missing key in recognition output: {key}"

        assert isinstance(res["text"], str)
        assert isinstance(res["is_uncertain"], bool)
        assert isinstance(res["uncertainty_reasons"], list)

    def test_preprocessing_compatibility(self, recognizer):
        sample_img = TEST_SAMPLES_DIR / "SYNTH_002_FRIENB.png"
        res_raw = recognizer.predict(sample_img, preprocess=False)
        res_prep = recognizer.predict(sample_img, preprocess=True)

        assert res_raw["preprocessed"] is False
        assert res_prep["preprocessed"] is True
        assert res_prep["image_dimensions"] == res_raw["image_dimensions"]

    def test_mocked_neural_trocr_inference(self, recognizer):
        """
        Mocks TrOCR neural forward pass to verify token probability
        and sequence decoding logic without redownloading 1.3GB model weights.
        """
        # Create mock processor and model
        mock_processor = MagicMock()
        mock_model = MagicMock()

        # Mock processor return tensor
        mock_pixel_values = torch.zeros((1, 3, 384, 384))
        mock_processor.return_value = MagicMock(pixel_values=mock_pixel_values)

        # Mock model generate return
        mock_sequences = torch.tensor([[0, 101, 102]])  # token IDs
        # Mock logits for 2 generated tokens (vocab size 1000)
        mock_scores = [
            torch.randn((1, 1000)),
            torch.randn((1, 1000)),
        ]
        mock_model.generate.return_value = MagicMock(
            sequences=mock_sequences,
            scores=mock_scores
        )

        mock_processor.batch_decode.return_value = ["MOCKED_PREDICTION"]

        recognizer.processor = mock_processor
        recognizer.model = mock_model
        recognizer.is_loaded = True
        recognizer.model_status = "ready_trocr_pretrained"

        sample_img = TEST_SAMPLES_DIR / "SYNTH_004_PLAY.png"
        res = recognizer.predict(sample_img, preprocess=False)

        assert res["text"] == "MOCKED_PREDICTION"
        assert res["model_status"] == "ready_trocr_pretrained"
        assert res["confidence"] is not None
        assert 0.0 <= res["confidence"] <= 1.0


class TestRecognitionService:

    def test_service_recognize_handwriting(self):
        sample_img = TEST_SAMPLES_DIR / "SYNTH_001_SCOOL.png"
        res = recognize_handwriting(
            image_input=sample_img,
            expected_word="SCHOOL",
            preprocess=True
        )
        assert res["status"] == "success"
        assert "recognized_text" in res
        assert res["expected_word"] == "SCHOOL"
        assert "levenshtein_distance" in res
        assert "character_error_rate" in res
        assert "exact_match" in res

    def test_batch_recognize_handwriting(self):
        samples = [
            TEST_SAMPLES_DIR / "SYNTH_001_SCOOL.png",
            TEST_SAMPLES_DIR / "SYNTH_002_FRIENB.png",
        ]
        expected = ["SCHOOL", "FRIEND"]
        res = batch_recognize_handwriting(samples, expected_words=expected, preprocess=True)

        assert res["total_images"] == 2
        assert len(res["results"]) == 2
        assert res["results"][0]["expected_word"] == "SCHOOL"
        assert res["results"][1]["expected_word"] == "FRIEND"

    def test_get_recognition_health(self):
        health = get_recognition_health()
        assert health["status"] == "healthy"
        assert health["preferred_model"] == TROCR_MODEL_NAME
        assert "offline_fallback_enabled" in health

