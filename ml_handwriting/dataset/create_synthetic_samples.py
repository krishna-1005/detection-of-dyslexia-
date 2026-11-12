"""
Cognilex AI - Synthetic Calibration Image Generator
Generates controlled, research-labeled synthetic handwriting word samples
strictly for software verification, unit tests, and CI/CD validation.

SAFETY WARNING:
These samples are clearly flagged with `is_synthetic: true` and
`annotation_status: synthetic_calibration`. They must NEVER be used
as clinical patient data or to train diagnostic classifiers.
"""

from pathlib import Path
from typing import List, Dict, Any
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import cv2

from ml_handwriting.config import (
    TEST_SAMPLES_DIR,
    ANNOTATIONS_DIR,
    STANDARD_IMAGE_HEIGHT,
    STANDARD_IMAGE_WIDTH,
)
from ml_handwriting.utils.dataset_loader import HandwritingDatasetLoader

CALIBRATION_CASES: List[Dict[str, Any]] = [
    {
        "image_id": "SYNTH_001_SCOOL",
        "participant_id": "SYNTH_P01",
        "expected_word": "SCHOOL",
        "transcribed_word": "SCOOL",
        "error_type": "character_deletion",
        "error_detail": "Missing character 'H' at position 4",
        "participant_group": "synthetic_control",
        "annotation_status": "synthetic_calibration",
    },
    {
        "image_id": "SYNTH_002_FRIENB",
        "participant_id": "SYNTH_P01",
        "expected_word": "FRIEND",
        "transcribed_word": "FRIENB",
        "error_type": "character_substitution",
        "error_detail": "Substituted 'D' with 'B' at position 6",
        "participant_group": "synthetic_control",
        "annotation_status": "synthetic_calibration",
    },
    {
        "image_id": "SYNTH_003_DEAR",
        "participant_id": "SYNTH_P02",
        "expected_word": "BEAR",
        "transcribed_word": "DEAR",
        "error_type": "letter_reversal",
        "error_detail": "Reversed letter 'B' into 'D' at position 1",
        "participant_group": "synthetic_control",
        "annotation_status": "synthetic_calibration",
    },
    {
        "image_id": "SYNTH_004_PLAY",
        "participant_id": "SYNTH_P02",
        "expected_word": "PLAY",
        "transcribed_word": "PLAY",
        "error_type": "correct_match",
        "error_detail": "Accurate spelling benchmark control",
        "participant_group": "synthetic_control",
        "annotation_status": "synthetic_calibration",
    },
    {
        "image_id": "SYNTH_005_QUITE",
        "participant_id": "SYNTH_P03",
        "expected_word": "QUIET",
        "transcribed_word": "QUITE",
        "error_type": "character_transposition",
        "error_detail": "Transposed letters 'E' and 'T' at positions 4-5",
        "participant_group": "synthetic_control",
        "annotation_status": "synthetic_calibration",
    },
    {
        "image_id": "SYNTH_006_DAG",
        "participant_id": "SYNTH_P03",
        "expected_word": "BAG",
        "transcribed_word": "DAG",
        "error_type": "letter_reversal",
        "error_detail": "Reversed letter 'B' into 'D' at position 1",
        "participant_group": "synthetic_control",
        "annotation_status": "synthetic_calibration",
    },
    {
        "image_id": "SYNTH_007_CATT",
        "participant_id": "SYNTH_P04",
        "expected_word": "CAT",
        "transcribed_word": "CATT",
        "error_type": "character_insertion",
        "error_detail": "Extra character 'T' at position 4",
        "participant_group": "synthetic_control",
        "annotation_status": "synthetic_calibration",
    },
    {
        "image_id": "SYNTH_008_NITE",
        "participant_id": "SYNTH_P04",
        "expected_word": "NIGHT",
        "transcribed_word": "NITE",
        "error_type": "phonetic_substitution",
        "error_detail": "Phonetic simplification of 'IGH' to 'I'",
        "participant_group": "synthetic_control",
        "annotation_status": "synthetic_calibration",
    },
    {
        "image_id": "SYNTH_009_SAW",
        "participant_id": "SYNTH_P05",
        "expected_word": "WAS",
        "transcribed_word": "SAW",
        "error_type": "visual_transposition",
        "error_detail": "Full visual reversal of word 'WAS' into 'SAW'",
        "participant_group": "synthetic_control",
        "annotation_status": "synthetic_calibration",
    },
    {
        "image_id": "SYNTH_010_bed_ded",
        "participant_id": "SYNTH_P05",
        "expected_word": "bed",
        "transcribed_word": "ded",
        "error_type": "letter_reversal",
        "error_detail": "Lowercase letter reversal 'b' -> 'd' at position 1",
        "participant_group": "synthetic_control",
        "annotation_status": "synthetic_calibration",
    },
]


def render_calibration_word_image(
    word_text: str,
    output_path: Path,
    width: int = STANDARD_IMAGE_WIDTH,
    height: int = STANDARD_IMAGE_HEIGHT,
    tilt_angle: float = 0.0
) -> None:
    """
    Renders an organic handwriting-like word image onto paper-texture canvas.
    """
    # 1. Base paper canvas (slight cream off-white background)
    canvas = np.full((height, width, 3), (250, 248, 245), dtype=np.uint8)

    # 2. Add subtle organic paper grain
    grain = np.random.normal(0, 2.0, (height, width, 3)).astype(np.float32)
    canvas = np.clip(canvas.astype(np.float32) + grain, 0, 255).astype(np.uint8)

    pil_img = Image.fromarray(canvas)
    draw = ImageDraw.Draw(pil_img)

    # 3. Load font (Comic Sans or Arial fallback for simulated casual strokes)
    font_paths = [
        Path("C:/Windows/Fonts/comic.ttf"),
        Path("C:/Windows/Fonts/comicbd.ttf"),
        Path("C:/Windows/Fonts/arial.ttf"),
    ]
    font = None
    for fp in font_paths:
        if fp.exists():
            try:
                font = ImageFont.truetype(str(fp), size=54)
                break
            except Exception:
                continue

    if font is None:
        font = ImageFont.load_default()

    # 4. Measure text bounding box
    bbox = draw.textbbox((0, 0), word_text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]

    # Center placement
    pos_x = max(10, (width - text_w) // 2)
    pos_y = max(10, (height - text_h) // 2 - 6)

    # 5. Draw dark ink text with slight stroke thickness (ballpoint/gel pen simulation)
    ink_color = (24, 28, 36)
    for dx in [0, 1]:
        for dy in [0, 1]:
            draw.text((pos_x + dx, pos_y + dy), word_text, fill=ink_color, font=font)

    # 6. Apply slight tilt if specified
    img_np = np.array(pil_img)
    if abs(tilt_angle) > 0.1:
        center = (width / 2.0, height / 2.0)
        m = cv2.getRotationMatrix2D(center, tilt_angle, 1.0)
        img_np = cv2.warpAffine(
            img_np,
            m,
            (width, height),
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(250, 248, 245)
        )

    # 7. Apply gentle Gaussian blur to simulate paper ink bleed
    img_blurred = cv2.GaussianBlur(img_np, (3, 3), 0.4)

    # Save to disk
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path), cv2.cvtColor(img_blurred, cv2.COLOR_RGB2BGR))


def generate_all_calibration_samples() -> List[Dict[str, Any]]:
    """
    Generates all synthetic calibration images and manifest records.

    Returns:
        List[Dict[str, Any]]: Complete list of validated annotation records.
    """
    TEST_SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
    ANNOTATIONS_DIR.mkdir(parents=True, exist_ok=True)

    records: List[Dict[str, Any]] = []

    # Assign deterministic small tilts to make images realistic for deskew tests
    tilts = [-2.5, 1.8, -3.2, 0.0, 2.1, -1.5, 3.0, -2.0, 0.5, -1.0]

    for idx, case in enumerate(CALIBRATION_CASES):
        img_name = f"{case['image_id']}.png"
        img_file = TEST_SAMPLES_DIR / img_name
        tilt = tilts[idx % len(tilts)]

        # Render image
        render_calibration_word_image(
            word_text=case["transcribed_word"],
            output_path=img_file,
            tilt_angle=tilt
        )

        # Build schema record
        rec = {
            "image_id": case["image_id"],
            "participant_id": case["participant_id"],
            "expected_word": case["expected_word"],
            "transcribed_word": case["transcribed_word"],
            "participant_group": case["participant_group"],
            "annotation_status": case["annotation_status"],
            "image_path": f"test_samples/{img_name}",
            "is_synthetic": "True",
            "error_type": case["error_type"],
            "notes": case["error_detail"],
            "simulated_tilt_deg": tilt,
        }
        records.append(rec)

    loader = HandwritingDatasetLoader()

    # Save to test_samples/calibration_manifest.json
    loader.save_annotations_json(records, TEST_SAMPLES_DIR / "calibration_manifest.json")

    # Save to annotations/synthetic_calibration.csv
    loader.save_annotations_csv(records, ANNOTATIONS_DIR / "synthetic_calibration.csv")

    print(f"[SYNTHETIC GENERATOR] Created {len(records)} calibration images in {TEST_SAMPLES_DIR}")
    return records


if __name__ == "__main__":
    generate_all_calibration_samples()

