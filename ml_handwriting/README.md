# Cognilex AI - Handwriting Analysis & Dyslexia Screening Module (`ml_handwriting`)

An academic, research-oriented Computer Vision and Machine Learning module for analyzing handwritten words, extracting biomechanical and visual handwriting features, and screening for dyslexia-related spelling and letter reversal patterns within **Cognilex**.

---

## 1. Directory Structure

```
ml_handwriting/
├── config.py                         # Central configuration, hyperparameters & path registries
├── requirements.txt                  # Python dependencies
├── README.md                         # Architecture & reproducibility guide
│
├── dataset/
│   ├── raw/                          # Directory for genuine clinical handwriting images
│   ├── processed/                    # Normalized, binarized & deskewed images
│   ├── annotations/                  # CSV & JSON annotation manifests
│   ├── test_samples/                 # Verified synthetic calibration word images
│   └── create_synthetic_samples.py   # Deterministic calibration sample generator
│
├── preprocessing/
│   ├── __init__.py
│   ├── image_cleaning.py             # Grayscale, bilateral denoising, adaptive Otsu thresholding
│   ├── image_normalization.py        # Skew estimation, deskewing, bbox cropping, canvas padding
│   └── augmentation.py               # Safe controlled augmentation (rotation ±4°, contrast/scale)
│
├── recognition/                      # (Phase 3) TrOCR model & OCR fallback engine
│   ├── __init__.py
│   ├── handwriting_recognition.py    # Microsoft TrOCR inference engine & confidence calculator
│   ├── service.py                    # Decoupled backend service interface
│   ├── evaluate_recognition.py       # Comparative evaluation harness (raw vs preprocessed)
│   └── download_weights.py           # Offline model weight downloader
│
├── analysis/                         # (Phase 4) Spelling, character error & visual reversal analysis
├── models/                           # (Phase 5) Baseline classifier & model training
├── reports/
│   ├── __init__.py
│   ├── generate_inspection_report.py # Dataset auditor & report generator
│   ├── dataset_inspection_report.md  # Inspection summary
│   ├── dataset_inspection_report.json# Machine-readable audit data
│   ├── recognition_comparison_report.md   # Comparative recognition benchmark report
│   └── recognition_comparison_report.json # Comparative evaluation data
│
├── utils/
│   ├── __init__.py
│   ├── dataset_loader.py             # Schema validator & zero-leakage participant splitter
│   └── metrics.py                    # Levenshtein distance, CER, WER, Exact match
│
└── tests/
    ├── __init__.py
    ├── test_metrics.py               # 8 unit tests (Levenshtein, CER, WER, accuracy)
    ├── test_preprocessing.py         # 11 unit tests (cleaning, deskew, bbox, padding, augmentation)
    ├── test_dataset_loader.py        # 7 unit tests (schema validation, audit, disjoint split)
    ├── test_recognition.py           # 11 unit tests (TrOCR, mock inference, error handling, service)
    └── verify_pipeline.py            # End-to-end telemetry verification script
```

---

## 2. Standardized Annotation Schema

Annotations must be provided in CSV (`annotations.csv`) or JSON (`annotations.json`) format following this schema:

| Column | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `image_id` | string | Unique sample identifier | `P104_W03_SCOOL` |
| `participant_id` | string | Anonymized participant ID (used for zero-leakage splits) | `PARTICIPANT_104` |
| `expected_word` | string | Target word prompt presented to the writer | `SCHOOL` |
| `transcribed_word` | string | Word written by writer / ground-truth transcription | `SCOOL` |
| `participant_group` | string | Cohort category: `dyslexic`, `comparison`, `unspecified`, `synthetic_control` | `dyslexic` |
| `annotation_status` | string | Data status: `verified`, `pending`, `unverified`, `synthetic_calibration` | `verified` |
| `image_path` | string | Relative or absolute path to image file | `raw/P104_W03_SCOOL.png` |
| `is_synthetic` | boolean | `True` for synthetic controls, `False` for clinical samples | `False` |
| `error_type` | string | Optional preliminary error category | `character_deletion` |
| `notes` | string | Clinical observations or experimental annotations | `Omitted medial 'H'` |

---

## 3. OpenCV Preprocessing Pipeline

The module provides a modular, multi-stage computer vision pipeline:

1. **Grayscale Conversion (`to_grayscale`):**
   - Supports 1-channel, 3-channel (BGR/RGB), and 4-channel (RGBA) inputs.
   - Handles alpha channel transparency by blending onto pure white paper background.
2. **Noise Removal (`remove_noise`):**
   - Uses **Bilateral Filtering** (`d=9, sigmaColor=75, sigmaSpace=75`) to preserve crisp handwriting stroke edges while eliminating paper grain.
3. **Adaptive Binarization (`binarize_adaptive`):**
   - Implements Otsu thresholding and adaptive Gaussian thresholding.
   - Produces two complementary representations:
     - `binary_white_paper`: Standard page view for human readability.
     - `binary_ink_mask`: Inverted foreground mask (`ink=255, paper=0`) optimized for contour detection.
4. **Deskewing (`estimate_skew_angle` & `deskew_image`):**
   - Estimates handwriting baseline tilt angle using `minAreaRect` on ink contours.
   - Rotates image via affine transformation to align the writing baseline horizontally (clamped to realistic bounds ±20°).
5. **Bounding-Box Cropping (`get_ink_bounding_box`):**
   - Detects ink boundaries and crops whitespace margins with controlled 12px padding.
6. **Standard Canvas Normalization (`normalize_and_pad`):**
   - Scales the cropped word while strictly preserving aspect ratio.
   - Centers and pads onto standard `(128, 384)` canvas for model inference.

---

## 4. Controlled Augmentation Safety Invariants

In handwriting dyslexia analysis, ordinary data augmentation techniques can introduce fatal scientific errors:
- **Horizontal Flipping (`cv2.flip(img, 1)`) is STRICTLY PROHIBITED:** Flipping a letter 'b' produces 'd'; flipping 'p' produces 'q'. Doing so would synthesize artificial letter reversals and corrupt clinical error analysis.
- **Vertical Flipping (`cv2.flip(img, 0)`) is STRICTLY PROHIBITED:** Flipping 'b' produces 'p'; flipping 'd' produces 'q'.
- **Safe Transformations Implemented:**
  - Micro-rotations bounded within realistic paper tilt: `[-4.0°, +4.0°]`.
  - Mild contrast and brightness variations: `[0.85, 1.15]`.
  - Sub-character translations: `[-4px, +4px]`.
  - Proportional uniform scale variations: `[0.96, 1.04]`.
  - Mild sensor noise: Gaussian $\sigma=3.5$.

---

## 5. Synthetic Calibration Samples

Because clinical patient data must never be fabricated, the module includes **10 deterministic synthetic calibration samples** in `dataset/test_samples/`:
- `SYNTH_001_SCOOL.png`: Missing character 'H' (Expected `SCHOOL`, Written `SCOOL`).
- `SYNTH_002_FRIENB.png`: Character substitution 'D' -> 'B' (Expected `FRIEND`, Written `FRIENB`).
- `SYNTH_003_DEAR.png`: Letter reversal 'B' -> 'D' (Expected `BEAR`, Written `DEAR`).
- `SYNTH_004_PLAY.png`: Clean accurate match (Expected `PLAY`, Written `PLAY`).
- `SYNTH_005_QUITE.png`: Character transposition (Expected `QUIET`, Written `QUITE`).
- `SYNTH_006_DAG.png`: Letter reversal 'B' -> 'D' (Expected `BAG`, Written `DAG`).
- `SYNTH_007_CATT.png`: Character insertion (Expected `CAT`, Written `CATT`).
- `SYNTH_008_NITE.png`: Phonetic simplification (Expected `NIGHT`, Written `NITE`).
- `SYNTH_009_SAW.png`: Word-level visual reversal (Expected `WAS`, Written `SAW`).
- `SYNTH_010_bed_ded.png`: Lowercase reversal 'b' -> 'd' (Expected `bed`, Written `ded`).

Each sample is explicitly labeled `is_synthetic: True` and `annotation_status: synthetic_calibration`.

---

## 6. Handwriting Recognition Engine (Phase 3)

The recognition engine utilizes **Microsoft TrOCR** (`microsoft/trocr-base-handwritten` or `microsoft/trocr-small-handwritten`) which combines an image Transformer encoder (DeiT) with a language model decoder (RoBERTa):

- **Processor:** `TrOCRProcessor` (scales image, extracts 384x384 patch embeddings, normalizes ImageNet statistics).
- **Inference:** `VisionEncoderDecoderModel.generate()` with beam search / greedy decoding.
- **Hardware Acceleration:** Automatic CUDA GPU detection with fallback to CPU.
- **Offline Resiliency:** Attempts local cache load first; gracefully falls back to explainable contour extraction when weights are offline.
- **Confidence Estimation:** Calculates average geometric token sequence likelihood, explicitly documented as uncalibrated pseudo-confidence.
- **Uncertainty Flags:** Returns structured warnings on empty recognition, very short text, low contrast, or low model confidence.

### Model Weight Download Instructions
To pre-cache TrOCR model weights for 100% offline air-gapped execution:
```powershell
.\project\backend\venv\Scripts\python.exe -m ml_handwriting.recognition.download_weights
```

### Recognition & Comparative Evaluation Commands
```powershell
# Run comparative recognition evaluation (Raw vs Preprocessed)
.\project\backend\venv\Scripts\python.exe -m ml_handwriting.recognition.evaluate_recognition
```

---

## 7. Execution Commands (Windows)

All commands should be executed from the project root (`D:\projects\dyslexia`):

### Run Complete Unit Test Suite (37 Tests)
```powershell
.\project\backend\venv\Scripts\python.exe -m pytest ml_handwriting/tests -v
```

### Run End-to-End Pipeline Verification
```powershell
.\project\backend\venv\Scripts\python.exe ml_handwriting/tests/verify_pipeline.py
```

### Regenerate Synthetic Calibration Samples
```powershell
.\project\backend\venv\Scripts\python.exe -m ml_handwriting.dataset.create_synthetic_samples
```

### Audit Dataset and Generate Report
```powershell
.\project\backend\venv\Scripts\python.exe -m ml_handwriting.reports.generate_inspection_report
```

---

## 8. Limitations & Clinical Research Guidelines

1. **Non-Calibrated Output:** TrOCR sequence likelihood scores represent language model confidence, not calibrated probabilities of dyslexia.
2. **Segmentation Boundary:** Single-word recognition requires word-level image segmentation; multi-line whole-page OCR requires paragraph segmentation upstream.
3. **Synthetic Calibration:** Calibration samples evaluate software code paths and metric calculations, not clinical sensitivity on children with dysgraphia.
4. **No Medical Diagnosis:** Neither TrOCR transcription errors nor stroke characteristics constitute a dyslexia diagnosis.

