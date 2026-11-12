"""
Cognilex AI - TrOCR Model Weight Downloader
Utility script to explicitly download and cache Microsoft TrOCR model weights
into `ml_handwriting/models/saved_models/huggingface/` for offline execution.
"""

import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ml_handwriting.config import TROCR_MODEL_NAME, SAVED_MODELS_DIR


def download_trocr_weights(model_name: str = TROCR_MODEL_NAME):
    print("=" * 80)
    print(f"  Downloading TrOCR Weights for Offline Execution: {model_name}")
    print("=" * 80)

    cache_dir = SAVED_MODELS_DIR / "huggingface"
    cache_dir.mkdir(parents=True, exist_ok=True)

    try:
        from transformers import TrOCRProcessor, VisionEncoderDecoderModel

        print(f"[1/2] Downloading processor for {model_name}...")
        processor = TrOCRProcessor.from_pretrained(model_name, cache_dir=str(cache_dir))
        print("[1/2] Processor cached successfully.")

        print(f"[2/2] Downloading model weights for {model_name} (this may take a few minutes)...")
        model = VisionEncoderDecoderModel.from_pretrained(model_name, cache_dir=str(cache_dir))
        print("[2/2] Model weights cached successfully.")

        print(f"\n[SUCCESS] TrOCR model weights fully cached in: {cache_dir}")
        print("The recognition engine can now run fully offline with zero internet access.")
        return True

    except Exception as e:
        print(f"\n[ERROR] Failed to download model weights: {e}")
        print("Note: The recognition engine will automatically continue running using its graceful explainable fallback mode.")
        return False


if __name__ == "__main__":
    download_trocr_weights()

