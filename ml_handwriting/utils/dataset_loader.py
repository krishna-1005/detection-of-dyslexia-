"""
Cognilex AI - Handwriting Analysis Utilities: Dataset Loader & Auditor
Provides standardized annotation validation, leakage-free participant-level
dataset splitting, and comprehensive dataset auditing.
"""

import csv
import json
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional, Set, Union
import numpy as np
import cv2

from ml_handwriting.config import (
    ANNOTATION_REQUIRED_COLUMNS,
    VALID_PARTICIPANT_GROUPS,
    VALID_ANNOTATION_STATUSES,
    SUPPORTED_IMAGE_EXTENSIONS,
    DATASET_DIR,
    RAW_DATA_DIR,
    RANDOM_SEED,
)


def validate_annotation_record(
    record: Dict[str, Any],
    base_dir: Optional[Path] = None
) -> Tuple[bool, List[str]]:
    """
    Validates an individual annotation dictionary against the standardized research schema.

    Returns:
        Tuple[bool, List[str]]: (is_valid, list_of_validation_errors)
    """
    errors = []

    # Check required keys and non-empty values
    for col in ANNOTATION_REQUIRED_COLUMNS:
        if col not in record:
            errors.append(f"Missing required field: '{col}'")
        elif record[col] is None or str(record[col]).strip() == "":
            errors.append(f"Field '{col}' cannot be empty")

    # Validate participant group
    group = str(record.get("participant_group", "")).strip().lower()
    if group and group not in VALID_PARTICIPANT_GROUPS:
        errors.append(
            f"Invalid participant_group '{group}'. Allowed: {sorted(list(VALID_PARTICIPANT_GROUPS))}"
        )

    # Validate annotation status
    status = str(record.get("annotation_status", "")).strip().lower()
    if status and status not in VALID_ANNOTATION_STATUSES:
        errors.append(
            f"Invalid annotation_status '{status}'. Allowed: {sorted(list(VALID_ANNOTATION_STATUSES))}"
        )

    # Validate image path existence
    raw_path_str = str(record.get("image_path", "")).strip()
    if raw_path_str:
        p = Path(raw_path_str)
        if not p.is_absolute() and base_dir is not None:
            # Check relative to base_dir or DATASET_DIR
            resolved_p = (base_dir / p).resolve()
            if not resolved_p.exists():
                # Also check inside raw or test_samples
                resolved_raw = (base_dir / "raw" / p.name).resolve()
                resolved_test = (base_dir / "test_samples" / p.name).resolve()
                if resolved_raw.exists():
                    resolved_p = resolved_raw
                elif resolved_test.exists():
                    resolved_p = resolved_test
                else:
                    errors.append(f"Referenced image file does not exist: {p}")
        elif p.is_absolute() and not p.exists():
            errors.append(f"Referenced image file does not exist: {p}")

    return len(errors) == 0, errors


class HandwritingDatasetLoader:
    """
    Standardized dataset loader and integrity manager for handwritten word collections.
    """

    def __init__(self, dataset_dir: Optional[Path] = None):
        self.dataset_dir = Path(dataset_dir) if dataset_dir else DATASET_DIR
        self.raw_dir = self.dataset_dir / "raw"
        self.annotations_dir = self.dataset_dir / "annotations"
        self.test_samples_dir = self.dataset_dir / "test_samples"

    def load_annotations(self, file_path: Union[str, Path]) -> List[Dict[str, Any]]:
        """
        Loads annotations from CSV or JSON file.
        """
        p = Path(file_path)
        if not p.is_absolute():
            # Check relative to annotations directory or dataset_dir
            if (self.annotations_dir / p).exists():
                p = self.annotations_dir / p
            elif (self.dataset_dir / p).exists():
                p = self.dataset_dir / p

        if not p.exists():
            raise FileNotFoundError(f"Annotations file not found: {p}")

        records: List[Dict[str, Any]] = []

        if p.suffix.lower() == ".json":
            with open(p, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    records = data
                elif isinstance(data, dict) and "samples" in data:
                    records = data["samples"]
                else:
                    raise ValueError(f"Unexpected JSON format in {p}")

        elif p.suffix.lower() == ".csv":
            with open(p, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    records.append(dict(row))

        else:
            raise ValueError(f"Unsupported annotations file format: {p.suffix}")

        return records

    def audit_dataset(
        self,
        records: Optional[List[Dict[str, Any]]] = None,
        annotation_file: Optional[Path] = None
    ) -> Dict[str, Any]:
        """
        Performs a full data audit:
        - Schema completeness and missing fields
        - Image readability and corruption detection
        - Image dimension statistics (width/height min, max, avg)
        - Participant counts and group distribution
        - Orphaned images (images without annotation records)

        Returns:
            Dict[str, Any]: Comprehensive inspection report.
        """
        if records is None and annotation_file is not None:
            records = self.load_annotations(annotation_file)
        elif records is None:
            # Check default annotations directory
            default_csv = self.annotations_dir / "annotations.csv"
            default_json = self.annotations_dir / "annotations.json"
            if default_csv.exists():
                records = self.load_annotations(default_csv)
            elif default_json.exists():
                records = self.load_annotations(default_json)
            else:
                records = []

        audit: Dict[str, Any] = {
            "total_annotated_samples": len(records),
            "valid_records_count": 0,
            "invalid_records_count": 0,
            "validation_errors": [],
            "participants_count": 0,
            "unique_participants": [],
            "participant_group_distribution": {},
            "annotation_status_distribution": {},
            "dimensions_summary": {
                "min_width": None,
                "max_width": None,
                "mean_width": None,
                "min_height": None,
                "max_height": None,
                "mean_height": None,
            },
            "corrupt_images": [],
            "missing_image_files": [],
            "orphaned_raw_images": [],
            "synthetic_count": 0,
            "clinical_real_count": 0,
        }

        if not records:
            # Check for orphaned raw images even if no annotations exist
            if self.raw_dir.exists():
                raw_files = [
                    f.name
                    for f in self.raw_dir.iterdir()
                    if f.suffix.lower() in SUPPORTED_IMAGE_EXTENSIONS
                ]
                audit["orphaned_raw_images"] = raw_files
            return audit

        participants: Set[str] = set()
        group_counts: Dict[str, int] = {}
        status_counts: Dict[str, int] = {}
        widths: List[int] = []
        heights: List[int] = []
        referenced_files: Set[str] = set()

        for idx, rec in enumerate(records):
            is_valid, errors = validate_annotation_record(rec, base_dir=self.dataset_dir)
            if not is_valid:
                audit["invalid_records_count"] += 1
                audit["validation_errors"].append({"record_index": idx, "image_id": rec.get("image_id"), "errors": errors})
            else:
                audit["valid_records_count"] += 1

            # Participant tracking
            pid = str(rec.get("participant_id", "")).strip()
            if pid:
                participants.add(pid)

            # Group distribution
            grp = str(rec.get("participant_group", "unspecified")).strip().lower()
            group_counts[grp] = group_counts.get(grp, 0) + 1

            # Status distribution
            st = str(rec.get("annotation_status", "pending")).strip().lower()
            status_counts[st] = status_counts.get(st, 0) + 1

            # Synthetic check
            is_synth = str(rec.get("is_synthetic", "false")).strip().lower() in ("true", "1", "yes") or st == "synthetic_calibration"
            if is_synth:
                audit["synthetic_count"] += 1
            else:
                audit["clinical_real_count"] += 1

            # Inspect image file integrity
            img_path_str = str(rec.get("image_path", "")).strip()
            if img_path_str:
                p = Path(img_path_str)
                if not p.is_absolute():
                    # Resolve relative to dataset directory
                    resolved = (self.dataset_dir / p).resolve()
                    if not resolved.exists():
                        # Try inside raw or test_samples
                        if (self.raw_dir / p.name).exists():
                            resolved = (self.raw_dir / p.name).resolve()
                        elif (self.test_samples_dir / p.name).exists():
                            resolved = (self.test_samples_dir / p.name).resolve()
                else:
                    resolved = p

                if not resolved.exists():
                    audit["missing_image_files"].append(str(p))
                else:
                    referenced_files.add(resolved.name)
                    # Verify readable with OpenCV
                    try:
                        img = cv2.imread(str(resolved))
                        if img is None:
                            audit["corrupt_images"].append(str(resolved))
                        else:
                            h, w = img.shape[:2]
                            widths.append(w)
                            heights.append(h)
                    except Exception as e:
                        audit["corrupt_images"].append(f"{resolved}: {str(e)}")

        audit["participants_count"] = len(participants)
        audit["unique_participants"] = sorted(list(participants))
        audit["participant_group_distribution"] = group_counts
        audit["annotation_status_distribution"] = status_counts

        if widths and heights:
            audit["dimensions_summary"] = {
                "min_width": int(np.min(widths)),
                "max_width": int(np.max(widths)),
                "mean_width": float(round(np.mean(widths), 1)),
                "min_height": int(np.min(heights)),
                "max_height": int(np.max(heights)),
                "mean_height": float(round(np.mean(heights), 1)),
            }

        # Check for unreferenced/orphaned images in raw/
        if self.raw_dir.exists():
            for f in self.raw_dir.iterdir():
                if f.suffix.lower() in SUPPORTED_IMAGE_EXTENSIONS:
                    if f.name not in referenced_files:
                        audit["orphaned_raw_images"].append(f.name)

        return audit

    def split_by_participant(
        self,
        records: List[Dict[str, Any]],
        test_size: float = 0.2,
        val_size: float = 0.1,
        random_seed: int = RANDOM_SEED
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Splits dataset by participant ID to guarantee ZERO participant leakage between splits.
        Crucial research standard for handwriting biometric analysis.

        Returns:
            Tuple: (train_records, val_records, test_records)
        """
        rng = np.random.RandomState(random_seed)

        # Group records by participant
        participant_groups: Dict[str, List[Dict[str, Any]]] = {}
        for rec in records:
            pid = str(rec.get("participant_id", "unspecified"))
            participant_groups.setdefault(pid, []).append(rec)

        unique_pids = list(participant_groups.keys())
        rng.shuffle(unique_pids)

        n_pids = len(unique_pids)
        if n_pids <= 1:
            # Cannot do clean participant split if only 1 participant exists
            return records, [], []

        n_test = max(1, int(n_pids * test_size))
        n_val = max(1, int(n_pids * val_size)) if val_size > 0 else 0

        test_pids = set(unique_pids[:n_test])
        val_pids = set(unique_pids[n_test : n_test + n_val])
        train_pids = set(unique_pids[n_test + n_val :])

        train_records = [r for pid in train_pids for r in participant_groups[pid]]
        val_records = [r for pid in val_pids for r in participant_groups[pid]]
        test_records = [r for pid in test_pids for r in participant_groups[pid]]

        return train_records, val_records, test_records

    def save_annotations_csv(self, records: List[Dict[str, Any]], output_path: Path) -> None:
        """Saves records to CSV with standardized column ordering."""
        if not records:
            return

        all_keys = list(ANNOTATION_REQUIRED_COLUMNS)
        # Collect extra keys
        for rec in records:
            for k in rec.keys():
                if k not in all_keys:
                    all_keys.append(k)

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=all_keys)
            writer.writeheader()
            for rec in records:
                writer.writerow(rec)

    def save_annotations_json(self, records: List[Dict[str, Any]], output_path: Path) -> None:
        """Saves records to structured JSON."""
        output_path.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "version": "1.0",
            "schema": "cognilex_handwriting_annotations_v1",
            "total_samples": len(records),
            "samples": records
        }
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
