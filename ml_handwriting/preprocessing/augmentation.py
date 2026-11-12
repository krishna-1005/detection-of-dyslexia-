"""
Cognilex AI - Handwriting Preprocessing Pipeline: Controlled Augmentation
Applies safe, mild morphological and radiometric transformations that strictly
preserve character identity and letter semantics (NO horizontal/vertical flipping).
"""

from typing import Tuple, List, Optional
import numpy as np
import cv2

from ml_handwriting.config import (
    AUG_MAX_ROTATION_DEGREES,
    AUG_BRIGHTNESS_RANGE,
    AUG_CONTRAST_RANGE,
    AUG_MAX_TRANSLATION_PX,
    AUG_SCALE_RANGE,
    RANDOM_SEED,
)


class ControlledHandwritingAugmenter:
    """
    Research-compliant data augmenter for handwritten words.
    Enforces strict safety invariants:
    - Never flips horizontally (prevents b <-> d, p <-> q identity corruptions)
    - Never flips vertically (prevents b <-> p, d <-> q, 6 <-> 9 corruptions)
    - Restricts rotations to small realistic paper placement variations (<= 4 degrees)
    - Preserves baseline and topological character connectivity
    """

    def __init__(self, seed: Optional[int] = RANDOM_SEED):
        if seed is not None:
            self.rng = np.random.RandomState(seed)
        else:
            self.rng = np.random.RandomState()

    def random_rotation(
        self,
        image: np.ndarray,
        max_angle: float = AUG_MAX_ROTATION_DEGREES,
        fill_value: int = 255
    ) -> np.ndarray:
        """Applies a subtle rotation within [-max_angle, +max_angle] degrees."""
        angle = self.rng.uniform(-max_angle, max_angle)
        h, w = image.shape[:2]
        center = (w / 2.0, h / 2.0)
        rot_mat = cv2.getRotationMatrix2D(center, angle, 1.0)
        border_val = (fill_value, fill_value, fill_value) if len(image.shape) == 3 else fill_value
        return cv2.warpAffine(
            image,
            rot_mat,
            (w, h),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=border_val
        )

    def random_brightness_contrast(
        self,
        image: np.ndarray,
        brightness_range: Tuple[float, float] = AUG_BRIGHTNESS_RANGE,
        contrast_range: Tuple[float, float] = AUG_CONTRAST_RANGE
    ) -> np.ndarray:
        """Adjusts brightness and contrast within mild photographic illumination bounds."""
        alpha = self.rng.uniform(contrast_range[0], contrast_range[1])
        beta = self.rng.uniform(brightness_range[0], brightness_range[1]) * 20.0 - 20.0
        adjusted = cv2.convertScaleAbs(image, alpha=alpha, beta=beta)
        return adjusted

    def random_translation(
        self,
        image: np.ndarray,
        max_dx: int = AUG_MAX_TRANSLATION_PX,
        max_dy: int = AUG_MAX_TRANSLATION_PX,
        fill_value: int = 255
    ) -> np.ndarray:
        """Applies small sub-character translations within canvas margins."""
        dx = self.rng.randint(-max_dx, max_dx + 1)
        dy = self.rng.randint(-max_dy, max_dy + 1)
        h, w = image.shape[:2]
        trans_mat = np.float32([[1, 0, dx], [0, 1, dy]])
        border_val = (fill_value, fill_value, fill_value) if len(image.shape) == 3 else fill_value
        return cv2.warpAffine(
            image,
            trans_mat,
            (w, h),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=border_val
        )

    def random_scale(
        self,
        image: np.ndarray,
        scale_range: Tuple[float, float] = AUG_SCALE_RANGE,
        fill_value: int = 255
    ) -> np.ndarray:
        """Applies slight uniform scale variations."""
        scale = self.rng.uniform(scale_range[0], scale_range[1])
        h, w = image.shape[:2]
        new_w = max(1, int(w * scale))
        new_h = max(1, int(h * scale))
        interp = cv2.INTER_AREA if scale < 1.0 else cv2.INTER_LINEAR
        resized = cv2.resize(image, (new_w, new_h), interpolation=interp)

        # Pad or crop back to original (h, w)
        border_val = (fill_value, fill_value, fill_value) if len(image.shape) == 3 else fill_value
        if len(image.shape) == 3:
            result = np.full((h, w, image.shape[2]), border_val, dtype=np.uint8)
        else:
            result = np.full((h, w), border_val, dtype=np.uint8)

        # Center placement
        src_y = max(0, (new_h - h) // 2) if new_h > h else 0
        src_x = max(0, (new_w - w) // 2) if new_w > w else 0
        crop_h = min(h, new_h)
        crop_w = min(w, new_w)

        dst_y = max(0, (h - new_h) // 2) if h > new_h else 0
        dst_x = max(0, (w - new_w) // 2) if w > new_w else 0

        result[dst_y : dst_y + crop_h, dst_x : dst_x + crop_w] = resized[
            src_y : src_y + crop_h, src_x : src_x + crop_w
        ]
        return result

    def random_mild_noise(self, image: np.ndarray, std: float = 3.5) -> np.ndarray:
        """Injects mild sensor/paper grain noise."""
        noise = self.rng.normal(0, std, image.shape)
        noisy = np.clip(image.astype(np.float32) + noise, 0, 255).astype(np.uint8)
        return noisy

    def augment(
        self,
        image: np.ndarray,
        rotation: bool = True,
        brightness_contrast: bool = True,
        translation: bool = True,
        scale: bool = True,
        noise: bool = True,
        fill_value: int = 255
    ) -> np.ndarray:
        """
        Applies a composite safe augmentation pipeline.
        """
        aug = image.copy()
        if rotation:
            aug = self.random_rotation(aug, fill_value=fill_value)
        if scale:
            aug = self.random_scale(aug, fill_value=fill_value)
        if translation:
            aug = self.random_translation(aug, fill_value=fill_value)
        if brightness_contrast:
            aug = self.random_brightness_contrast(aug)
        if noise:
            aug = self.random_mild_noise(aug)
        return aug


# Module-level convenience function
_default_augmenter = ControlledHandwritingAugmenter()

def augment_image(image: np.ndarray, fill_value: int = 255) -> np.ndarray:
    """Convenience helper using module default safe augmenter."""
    return _default_augmenter.augment(image, fill_value=fill_value)

