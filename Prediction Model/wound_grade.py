# -*- coding: utf-8 -*-
"""Wagner-Armstrong wound grade classifier.

Loads the trained MultiStageWoundNet checkpoint (best_model.pt) and exposes
a simple ``classify_grade(pil_crop)`` function used by wound_image_classification.py
to add Wagner-Armstrong grading to detected wound regions.
"""

from __future__ import annotations

import sys
from pathlib import Path

import torch
import torchvision.transforms as T
from PIL import Image

# ---------------------------------------------------------------------------
# Import model architecture and constants from the Wagner inference module
# ---------------------------------------------------------------------------
_WAGNER_DIR = Path(__file__).parent / "Wagner"
sys.path.insert(0, str(_WAGNER_DIR))

from model import (  # noqa: E402
    IMG_SIZE,
    IMAGENET_MEAN,
    IMAGENET_STD,
    ROUTE_NAMES,
    WAGNER_NAMES,
    EPUAP_NAMES,
    CEAP_NAMES,
    MultiStageWoundNet,
)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
CHECKPOINT_PATH = _WAGNER_DIR / "checkpoints" / "best_model.pt"

# ---------------------------------------------------------------------------
# Load model once at import time
# ---------------------------------------------------------------------------
_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

_transform = T.Compose([
    T.Resize((IMG_SIZE, IMG_SIZE)),
    T.ToTensor(),
    T.Normalize(IMAGENET_MEAN, IMAGENET_STD),
])

print(f"Loading Wagner-Armstrong model from {CHECKPOINT_PATH} on {_device}...")
_ckpt = torch.load(CHECKPOINT_PATH, map_location=_device)

# Use class names from the checkpoint if available, fall back to training defaults
_route_names = _ckpt.get("route_names", ROUTE_NAMES)
_wagner_names = _ckpt.get("wagner_names", WAGNER_NAMES)
_epuap_names = _ckpt.get("epuap_names", EPUAP_NAMES)
_ceap_names = _ckpt.get("ceap_names", CEAP_NAMES)

_grade_model = MultiStageWoundNet(pretrained=False).to(_device)
_grade_model.load_state_dict(_ckpt["model_state"])
_grade_model.eval()
print("Wagner-Armstrong model loaded.")


def classify_grade(pil_crop: Image.Image) -> dict:
    """Classify a wound crop with the Wagner-Armstrong model.

    Uses horizontal-flip TTA (test-time augmentation) for higher accuracy:
    runs both the original and a horizontally-flipped version, averages the
    softmax probabilities, then picks the argmax.

    Parameters
    ----------
    pil_crop : PIL.Image
        RGB crop of the detected wound region.

    Returns
    -------
    dict with keys:
        route_label   — str, e.g. "diabetic_foot (Wagner)"
        route_conf    — float 0..1
        wagner_label  — str, e.g. "Wagner 3"
        wagner_conf   — float 0..1
        epuap_label   — str
        epuap_conf    — float 0..1
        ceap_label    — str
        ceap_conf     — float 0..1
    """
    img = pil_crop.convert("RGB")
    x_orig = _transform(img).unsqueeze(0).to(_device)
    x_flip = torch.flip(x_orig, dims=[3])  # horizontal flip (W axis)

    with torch.no_grad():
        out_orig = _grade_model(x_orig)
        out_flip = _grade_model(x_flip)

    result = {}
    head_map = {
        "route": (_route_names, "route"),
        "wagner": (_wagner_names, "wagner"),
        "epuap": (_epuap_names, "epuap"),
        "ceap": (_ceap_names, "ceap"),
    }

    for label_key, (names, head_key) in head_map.items():
        probs_orig = torch.softmax(out_orig[head_key], dim=1)[0]
        probs_flip = torch.softmax(out_flip[head_key], dim=1)[0]
        probs = (probs_orig + probs_flip) / 2.0
        pred = probs.argmax().item()
        conf = probs[pred].item()
        result[f"{label_key}_label"] = names[pred]
        result[f"{label_key}_conf"] = conf

    return result
