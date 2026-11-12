"""
Cognilex AI - Handwriting Preprocessing Pipeline: Image Cleaning
Provides grayscale conversion, denoising, and adaptive binarization while
preserving original handwriting strokes.
"""

from pathlib import Path
from typing import Union, Dict, Any
import numpy as np
import cv2
from PIL import Image
import io

from ml_handwriting.config import (
    BILATERAL_D,
    BILATERAL_SIGMA_COLOR,
    BILATERAL_SIGMA_SPACE,
    GAUSSIAN_BLUR_KERNEL,
    ADAPTIVE_BLOCK_SIZE,
    ADAPTIVE_C,
)


def load_image(image_input: Union[str, Path, bytes, np.ndarray, Image.Image]) -> np.ndarray:
    """
    Safely loads an image from various input types into a BGR/Grayscale uint8 NumPy array.

    Args:
        image_input: File path, byte stream, PIL Image, or existing NumPy array.

    Returns:
        np.ndarray: Loaded OpenCV image (BGR if multi-channel, else Grayscale).
    """
    if isinstance(image_input, (str, Path)):
        path_str = str(image_input)
        if not Path(path_str).exists():
            raise FileNotFoundError(f"Image file does not exist: {path_str}")
        # Use cv2.imdecode to handle special characters or Windows path quirks
        with open(path_str, "rb") as f:
            file_bytes = np.asarray(bytearray(f.read()), dtype=np.uint8)
            img = cv2.imdecode(file_bytes, cv2.IMREAD_UNCHANGED)
        if img is None:
            raise ValueError(f"Failed to decode image from path: {path_str}")
        return img

    elif isinstance(image_input, bytes):
        file_bytes = np.asarray(bytearray(image_input), dtype=np.uint8)
        img = cv2.imdecode(file_bytes, cv2.IMREAD_UNCHANGED)
        if img is None:
            raise ValueError("Failed to decode image from provided byte buffer.")
        return img

    elif isinstance(image_input, Image.Image):
        # Convert PIL to NumPy
        img_np = np.array(image_input)
        if len(img_np.shape) == 2:
            return img_np
        elif img_np.shape[2] == 4:
            return cv2.cvtColor(img_np, cv2.COLOR_RGBA2BGR)
        elif img_np.shape[2] == 3:
            return cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
        return img_np

    elif isinstance(image_input, np.ndarray):
        return image_input.copy()

    else:
        raise TypeError(f"Unsupported image input type: {type(image_input)}")


def to_grayscale(image: np.ndarray) -> np.ndarray:
    """
    Converts any valid OpenCV image into a single-channel 8-bit grayscale array.
    """
    if not isinstance(image, np.ndarray):
        raise TypeError("Input image must be a numpy ndarray")

    if len(image.shape) == 2:
        return image.copy()

    if len(image.shape) == 3:
        if image.shape[2] == 4:
            # Handle alpha channel: blend on white background before grayscale
            b, g, r, a = cv2.split(image)
            alpha = a.astype(float) / 255.0
            white = np.ones_like(b, dtype=float) * 255.0
            b_blended = (b.astype(float) * alpha + white * (1.0 - alpha)).astype(np.uint8)
            g_blended = (g.astype(float) * alpha + white * (1.0 - alpha)).astype(np.uint8)
            r_blended = (r.astype(float) * alpha + white * (1.0 - alpha)).astype(np.uint8)
            bgr = cv2.merge([b_blended, g_blended, r_blended])
            return cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        elif image.shape[2] == 3:
            return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    raise ValueError(f"Invalid image shape for grayscale conversion: {image.shape}")


def remove_noise(image: np.ndarray, method: str = "bilateral") -> np.ndarray:
    """
    Removes high-frequency speckle noise and sensor artifacts while preserving fine handwriting stroke edges.

    Args:
        image: Single-channel grayscale image.
        method: 'bilateral', 'gaussian', 'median', or 'morphological'.
    """
    gray = to_grayscale(image)

    if method == "bilateral":
        # Bilateral filter smoothens flat regions while preserving sharp stroke boundaries
        return cv2.bilateralFilter(
            gray,
            d=BILATERAL_D,
            sigmaColor=BILATERAL_SIGMA_COLOR,
            sigmaSpace=BILATERAL_SIGMA_SPACE
        )
    elif method == "gaussian":
        return cv2.GaussianBlur(gray, GAUSSIAN_BLUR_KERNEL, 0)
    elif method == "median":
        return cv2.medianBlur(gray, 3)
    elif method == "combined":
        denoised = cv2.bilateralFilter(gray, d=7, sigmaColor=50, sigmaSpace=50)
        return cv2.GaussianBlur(denoised, (3, 3), 0)
    else:
        raise ValueError(f"Unknown noise removal method: {method}")


def binarize_adaptive(
    image: np.ndarray,
    method: str = "otsu",
    block_size: int = ADAPTIVE_BLOCK_SIZE,
    c: int = ADAPTIVE_C,
    invert: bool = True
) -> np.ndarray:
    """
    Applies binarization to separate handwriting strokes from paper background.

    Args:
        image: Grayscale image.
        method: 'otsu', 'adaptive_gaussian', 'adaptive_mean'.
        block_size: Neighborhood size for adaptive thresholding (must be odd).
        c: Constant subtracted from the mean/weighted mean.
        invert: If True, ink is 255 (white) and background is 0 (black).
                If False, ink is 0 (black) and background is 255 (white).
    """
    gray = to_grayscale(image)

    # Ensure block size is odd and >= 3
    if block_size % 2 == 0:
        block_size += 1
    block_size = max(3, block_size)

    if method == "otsu":
        threshold_type = cv2.THRESH_BINARY_INV if invert else cv2.THRESH_BINARY
        _, binary = cv2.threshold(gray, 0, 255, threshold_type + cv2.THRESH_OTSU)
    elif method == "adaptive_gaussian":
        threshold_type = cv2.THRESH_BINARY_INV if invert else cv2.THRESH_BINARY
        binary = cv2.adaptiveThreshold(
            gray,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            threshold_type,
            block_size,
            c
        )
    elif method == "adaptive_mean":
        threshold_type = cv2.THRESH_BINARY_INV if invert else cv2.THRESH_BINARY
        binary = cv2.adaptiveThreshold(
            gray,
            255,
            cv2.ADAPTIVE_THRESH_MEAN_C,
            threshold_type,
            block_size,
            c
        )
    else:
        raise ValueError(f"Unknown binarization method: {method}")

    return binary


def clean_handwriting_image(
    image_input: Union[str, Path, bytes, np.ndarray, Image.Image],
    method: str = "otsu"
) -> Dict[str, Any]:
    """
    Complete image cleaning pipeline producing multi-stage representations.

    Returns:
        Dict with keys:
            'original': loaded BGR or grayscale image
            'grayscale': 1-channel uint8
            'denoised': smoothed with stroke preservation
            'binary_white_paper': standard page view (dark ink on white)
            'binary_ink_mask': inverted mask (white ink on black) for contour extraction
    """
    original = load_image(image_input)
    grayscale = to_grayscale(original)
    denoised = remove_noise(grayscale, method="bilateral")
    binary_white_paper = binarize_adaptive(denoised, method=method, invert=False)
    binary_ink_mask = binarize_adaptive(denoised, method=method, invert=True)

    return {
        "original": original,
        "grayscale": grayscale,
        "denoised": denoised,
        "binary_white_paper": binary_white_paper,
        "binary_ink_mask": binary_ink_mask
    }

