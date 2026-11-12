"""
Cognilex AI - Handwriting Preprocessing Pipeline: Image Normalization
Provides skew angle estimation, deskewing, ink bounding-box cropping,
and aspect-ratio-preserving normalization with standard canvas padding.
"""

from typing import Tuple, Dict, Any, Union
from pathlib import Path
import numpy as np
import cv2
from PIL import Image

from ml_handwriting.config import (
    STANDARD_IMAGE_HEIGHT,
    STANDARD_IMAGE_WIDTH,
    MAX_SKEW_ANGLE_DEGREES,
    MIN_CONTOUR_AREA_FOR_SKEW,
)
from ml_handwriting.preprocessing.image_cleaning import (
    clean_handwriting_image,
    to_grayscale,
    load_image,
)


def estimate_skew_angle(binary_ink_mask: np.ndarray) -> float:
    """
    Estimates the dominant baseline skew angle of handwriting using minimum area bounding boxes
    and contour moments on the ink mask.

    Args:
        binary_ink_mask: Single-channel uint8 array with ink as 255 (white) and background as 0 (black).

    Returns:
        float: Estimated skew angle in degrees (positive = counter-clockwise, negative = clockwise).
    """
    if len(binary_ink_mask.shape) != 2:
        binary_ink_mask = to_grayscale(binary_ink_mask)

    coords = np.column_stack(np.where(binary_ink_mask > 0))
    if len(coords) < 50:
        # Insufficient stroke points to reliably measure skew
        return 0.0

    # Approach 1: minAreaRect over ink coordinates
    # Note: cv2.minAreaRect expects (x, y) which corresponds to (coords[:, 1], coords[:, 0])
    points = np.fliplr(coords)
    rect = cv2.minAreaRect(points)
    angle = rect[-1]

    # Normalize OpenCV angle conventions
    # OpenCV 4.5+ outputs angle in [-90, 0)
    if angle < -45:
        angle = 90 + angle
    elif angle > 45:
        angle = angle - 90

    # Safety clamp: if estimated angle exceeds realistic handwriting tilt, clamp or reset to 0
    if abs(angle) > MAX_SKEW_ANGLE_DEGREES:
        # Fallback to contour baseline slope
        contours, _ = cv2.findContours(binary_ink_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        valid_contours = [c for c in contours if cv2.contourArea(c) > MIN_CONTOUR_AREA_FOR_SKEW]
        if valid_contours:
            all_pts = np.vstack(valid_contours)
            rect2 = cv2.minAreaRect(all_pts)
            angle2 = rect2[-1]
            if angle2 < -45:
                angle2 = 90 + angle2
            elif angle2 > 45:
                angle2 = angle2 - 90
            angle = angle2 if abs(angle2) <= MAX_SKEW_ANGLE_DEGREES else 0.0
        else:
            angle = 0.0

    return float(round(angle, 2))


def deskew_image(image: np.ndarray, angle: float, background_color: int = 255) -> np.ndarray:
    """
    Rotates an image by the negative of the skew angle to align the text baseline horizontally.

    Args:
        image: Grayscale or BGR image.
        angle: Angle in degrees to correct.
        background_color: Fill color for exposed borders (255 for paper, 0 for ink mask).

    Returns:
        np.ndarray: Deskewed image.
    """
    if abs(angle) < 0.2:
        return image.copy()

    h, w = image.shape[:2]
    center = (w // 2, h // 2)

    # Compute rotation matrix (counter-clockwise rotation by -angle to deskew)
    rot_mat = cv2.getRotationMatrix2D(center, -angle, 1.0)

    # Calculate new bounding dimensions to avoid cutting off strokes
    cos = np.abs(rot_mat[0, 0])
    sin = np.abs(rot_mat[0, 1])
    new_w = int((h * sin) + (w * cos))
    new_h = int((h * cos) + (w * sin))

    # Adjust transformation matrix center translation
    rot_mat[0, 2] += (new_w / 2) - center[0]
    rot_mat[1, 2] += (new_h / 2) - center[1]

    border_val = (background_color, background_color, background_color) if len(image.shape) == 3 else background_color

    deskewed = cv2.warpAffine(
        image,
        rot_mat,
        (new_w, new_h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=border_val
    )
    return deskewed


def get_ink_bounding_box(
    binary_ink_mask: np.ndarray,
    padding: int = 12
) -> Tuple[int, int, int, int]:
    """
    Locates the bounding box surrounding all handwritten ink strokes, with controlled padding.

    Args:
        binary_ink_mask: Mask where ink > 0.
        padding: Margin in pixels added around ink bounds.

    Returns:
        Tuple[int, int, int, int]: (x, y, width, height)
    """
    h, w = binary_ink_mask.shape[:2]
    non_zero_pts = cv2.findNonZero(binary_ink_mask)

    if non_zero_pts is None or len(non_zero_pts) == 0:
        return (0, 0, w, h)

    x, y, bw, bh = cv2.boundingRect(non_zero_pts)

    # Apply padding with edge clamping
    x_pad = max(0, x - padding)
    y_pad = max(0, y - padding)
    w_pad = min(w - x_pad, bw + 2 * padding)
    h_pad = min(h - y_pad, bh + 2 * padding)

    return (int(x_pad), int(y_pad), int(w_pad), int(h_pad))


def crop_to_bounding_box(
    image: np.ndarray,
    bbox: Tuple[int, int, int, int]
) -> np.ndarray:
    """
    Crops an image to the specified bounding box (x, y, w, h).
    """
    x, y, w, h = bbox
    return image[y : y + h, x : x + w].copy()


def normalize_and_pad(
    image: np.ndarray,
    target_height: int = STANDARD_IMAGE_HEIGHT,
    target_width: int = STANDARD_IMAGE_WIDTH,
    background_color: int = 255
) -> np.ndarray:
    """
    Resizes image maintaining aspect ratio and pads to standard canvas dimensions.

    Args:
        image: Single-channel or 3-channel image.
        target_height: Target canvas height (e.g., 128 for word recognition).
        target_width: Target canvas width (e.g., 384 for word recognition).
        background_color: Background padding color (255 for paper, 0 for binary mask).

    Returns:
        np.ndarray: Normalized image array of shape (target_height, target_width).
    """
    h, w = image.shape[:2]
    if h == 0 or w == 0:
        # Return empty blank canvas if input is degraded
        if len(image.shape) == 3:
            return np.full((target_height, target_width, image.shape[2]), background_color, dtype=np.uint8)
        return np.full((target_height, target_width), background_color, dtype=np.uint8)

    # Calculate uniform scaling factor that fits inside canvas with margin
    avail_w = target_width - 16  # 8px lateral margin
    avail_h = target_height - 16  # 8px vertical margin
    scale = min(avail_w / max(1, w), avail_h / max(1, h))

    new_w = max(1, int(w * scale))
    new_h = max(1, int(h * scale))

    interp = cv2.INTER_AREA if scale < 1.0 else cv2.INTER_CUBIC
    resized = cv2.resize(image, (new_w, new_h), interpolation=interp)

    # Create padded canvas
    if len(image.shape) == 3:
        canvas = np.full((target_height, target_width, image.shape[2]), background_color, dtype=np.uint8)
    else:
        canvas = np.full((target_height, target_width), background_color, dtype=np.uint8)

    # Center placement
    start_x = (target_width - new_w) // 2
    start_y = (target_height - new_h) // 2

    canvas[start_y : start_y + new_h, start_x : start_x + new_w] = resized
    return canvas


def normalize_handwriting_pipeline(
    image_input: Union[str, Path, bytes, np.ndarray, Image.Image],
    target_height: int = STANDARD_IMAGE_HEIGHT,
    target_width: int = STANDARD_IMAGE_WIDTH
) -> Dict[str, Any]:
    """
    Executes the full preprocessing pipeline:
    1. Cleaning & Denoising
    2. Skew Angle Estimation & Deskewing
    3. Ink Bounding Box Detection & Margins Cropping
    4. Aspect-ratio Preserving Canvas Normalization

    Returns:
        Dict[str, Any]: Comprehensive preprocessed outputs and telemetry.
    """
    cleaned = clean_handwriting_image(image_input)
    original = cleaned["original"]
    grayscale = cleaned["grayscale"]
    denoised = cleaned["denoised"]
    binary_mask = cleaned["binary_ink_mask"]

    # Deskewing
    skew_angle = estimate_skew_angle(binary_mask)
    deskewed_gray = deskew_image(denoised, skew_angle, background_color=255)
    deskewed_mask = deskew_image(binary_mask, skew_angle, background_color=0)

    # Bounding Box Cropping
    bbox = get_ink_bounding_box(deskewed_mask, padding=12)
    cropped_gray = crop_to_bounding_box(deskewed_gray, bbox)
    cropped_mask = crop_to_bounding_box(deskewed_mask, bbox)

    # Normalization & Canvas Padding
    normalized_gray = normalize_and_pad(
        cropped_gray,
        target_height=target_height,
        target_width=target_width,
        background_color=255
    )
    normalized_mask = normalize_and_pad(
        cropped_mask,
        target_height=target_height,
        target_width=target_width,
        background_color=0
    )

    return {
        "original": original,
        "grayscale": grayscale,
        "denoised": denoised,
        "skew_angle": skew_angle,
        "deskewed_gray": deskewed_gray,
        "bounding_box": bbox,
        "cropped_gray": cropped_gray,
        "normalized_gray": normalized_gray,
        "normalized_mask": normalized_mask,
        "target_dimensions": (target_height, target_width)
    }

