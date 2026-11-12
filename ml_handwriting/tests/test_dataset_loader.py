"""
Unit tests for Dataset Loader, Annotation Schema Validation,
and Participant-Level Data Splitting.
"""

import pytest
from pathlib import Path

from ml_handwriting.config import (
    DATASET_DIR,
    ANNOTATIONS_DIR,
    TEST_SAMPLES_DIR,
)
from ml_handwriting.utils.dataset_loader import (
    validate_annotation_record,
    HandwritingDatasetLoader,
)


class TestAnnotationValidation:

    def test_valid_record(self):
        sample_img = TEST_SAMPLES_DIR / "SYNTH_001_SCOOL.png"
        rec = {
            "image_id": "SYNTH_001_SCOOL",
            "participant_id": "SYNTH_P01",
            "expected_word": "SCHOOL",
            "transcribed_word": "SCOOL",
            "participant_group": "synthetic_control",
            "annotation_status": "synthetic_calibration",
            "image_path": str(sample_img),
        }
        is_valid, errors = validate_annotation_record(rec, base_dir=DATASET_DIR)
        assert is_valid is True
        assert len(errors) == 0

    def test_missing_required_field(self):
        rec = {
            "image_id": "SYNTH_001",
            "participant_id": "SYNTH_P01",
            # Missing expected_word
            "transcribed_word": "SCOOL",
            "participant_group": "synthetic_control",
            "annotation_status": "synthetic_calibration",
            "image_path": "test_samples/SYNTH_001_SCOOL.png",
        }
        is_valid, errors = validate_annotation_record(rec, base_dir=DATASET_DIR)
        assert is_valid is False
        assert any("expected_word" in err for err in errors)

    def test_invalid_participant_group(self):
        rec = {
            "image_id": "SYNTH_001",
            "participant_id": "SYNTH_P01",
            "expected_word": "SCHOOL",
            "transcribed_word": "SCOOL",
            "participant_group": "invalid_group_xyz",
            "annotation_status": "synthetic_calibration",
            "image_path": "test_samples/SYNTH_001_SCOOL.png",
        }
        is_valid, errors = validate_annotation_record(rec, base_dir=DATASET_DIR)
        assert is_valid is False
        assert any("participant_group" in err for err in errors)

    def test_invalid_annotation_status(self):
        rec = {
            "image_id": "SYNTH_001",
            "participant_id": "SYNTH_P01",
            "expected_word": "SCHOOL",
            "transcribed_word": "SCOOL",
            "participant_group": "synthetic_control",
            "annotation_status": "non_existent_status",
            "image_path": "test_samples/SYNTH_001_SCOOL.png",
        }
        is_valid, errors = validate_annotation_record(rec, base_dir=DATASET_DIR)
        assert is_valid is False
        assert any("annotation_status" in err for err in errors)

    def test_nonexistent_image_path(self):
        rec = {
            "image_id": "SYNTH_MISSING",
            "participant_id": "SYNTH_P01",
            "expected_word": "SCHOOL",
            "transcribed_word": "SCOOL",
            "participant_group": "synthetic_control",
            "annotation_status": "synthetic_calibration",
            "image_path": "test_samples/does_not_exist_file_999.png",
        }
        is_valid, errors = validate_annotation_record(rec, base_dir=DATASET_DIR)
        assert is_valid is False
        assert any("does not exist" in err for err in errors)


class TestDatasetLoaderAndAudit:

    @pytest.fixture
    def loader(self):
        return HandwritingDatasetLoader(dataset_dir=DATASET_DIR)

    def test_audit_calibration_samples(self, loader):
        manifest_path = ANNOTATIONS_DIR / "synthetic_calibration.csv"
        assert manifest_path.exists(), "synthetic_calibration.csv must exist"

        audit = loader.audit_dataset(annotation_file=manifest_path)
        assert audit["total_annotated_samples"] == 10
        assert audit["valid_records_count"] == 10
        assert audit["invalid_records_count"] == 0
        assert audit["participants_count"] == 5
        assert audit["synthetic_count"] == 10
        assert audit["clinical_real_count"] == 0
        assert len(audit["corrupt_images"]) == 0
        assert len(audit["missing_image_files"]) == 0
        assert audit["dimensions_summary"]["mean_width"] == 384.0
        assert audit["dimensions_summary"]["mean_height"] == 128.0

    def test_split_by_participant_zero_leakage(self, loader):
        manifest_path = ANNOTATIONS_DIR / "synthetic_calibration.csv"
        records = loader.load_annotations(manifest_path)

        train, val, test = loader.split_by_participant(
            records, test_size=0.2, val_size=0.2, random_seed=42
        )

        train_pids = {r["participant_id"] for r in train}
        val_pids = {r["participant_id"] for r in val}
        test_pids = {r["participant_id"] for r in test}

        # Zero participant leakage verification
        assert train_pids.isdisjoint(val_pids), "Participant leakage between train and val!"
        assert train_pids.isdisjoint(test_pids), "Participant leakage between train and test!"
        assert val_pids.isdisjoint(test_pids), "Participant leakage between val and test!"

        # All records accounted for
        assert len(train) + len(val) + len(test) == len(records)

