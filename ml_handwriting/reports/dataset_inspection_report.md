# Cognilex AI - Handwriting Dataset Inspection & Audit Report

**Generated:** 2026-11-06 22:45:29  
**Auditor Engine:** `ml_handwriting.utils.dataset_loader.HandwritingDatasetLoader`  
**Dataset Directory:** `D:\projects\dyslexia\ml_handwriting\dataset`  
**Target Annotations File:** `synthetic_calibration.csv`  

---

## 1. Executive Summary

| Metric | Value | Audit Status |
| :--- | :--- | :--- |
| **Total Ingested Samples** | `10` | ✅ Verified |
| **Schema Valid Records** | `10` | ✅ 100% Compliant |
| **Unique Participants** | `5` | Disjoint participant cohort verified |
| **Synthetic Test Samples** | `10` | Clearly demarcated (`is_synthetic: True`) |
| **Clinical Patient Samples** | `0` | Supervised classifier training gated |
| **Corrupted Image Files** | `0` | ✅ None |
| **Missing Image References** | `0` | ✅ All paths resolved |
| **Orphaned Raw Images** | `0` | ✅ None |

---

## 2. Image Dimension Profile

- **Width Range:** 384px (min) to 384px (max), Mean: `384.0px`
- **Height Range:** 128px (min) to 128px (max), Mean: `128.0px`
- **Standard Preprocessing Target:** `384px (width) x 128px (height)`
- **Aspect Ratio:** Canvas centered with bilateral preservation

---

## 3. Cohort & Group Breakdown

### Participant Groups
- **`synthetic_control`:** 10 samples

### Annotation Status
- **`synthetic_calibration`:** 10 samples

---

## 4. Scientific Rigor & Compliance

> [!IMPORTANT]
> **Zero Fabrication Policy:** All 10 samples present in `test_samples/` are strictly calibrated synthetic controls created for software test verification (e.g. OpenCV deskewing, Otsu binarization, CER/WER metric calculation).
>
> In accordance with ethical medical AI principles, **no dyslexia diagnostic classifier has been trained on synthetic or unverified data**.

---

## 5. Specification for Genuine Dataset Ingestion

When clinical handwritten word datasets are imported, they must conform to:
1. **Raw Files Location:** `ml_handwriting/dataset/raw/<participant_id>_<word>.png`
2. **Metadata Manifest:** `ml_handwriting/dataset/annotations/clinical_manifest.csv`
3. **Required Columns:** `image_id`, `participant_id`, `expected_word`, `transcribed_word`, `participant_group`, `annotation_status`, `image_path`
4. **Validation Command:** `python -m ml_handwriting.dataset.audit`
