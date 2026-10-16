"""
Multi-Stage Wound Classification Network
========================================

Two-stage multi-task PyTorch pipeline for chronic wound triage:

  Stage 1 (Routing Network): EfficientNet-B0 backbone classifies the broad
      wound category -> 0: Diabetic Foot (Wagner), 1: Pressure Ulcer (EPUAP),
      2: Venous / Ulcus Cruris (CEAP).

  Stage 2 (Scoring Heads): three parallel linear heads on the shared
      1280-d feature map:
        - wagner_head : 6 logits  (Wagner grades 0-5)
        - epuap_head  : 4 logits  (EPUAP stages 1-4)
        - ceap_head   : 2 logits  (CEAP C5 healed vs C6 active)

Missing labels are encoded as -1 and ignored via CrossEntropyLoss(ignore_index=-1).
"""

from __future__ import annotations

import argparse
import multiprocessing
import random
import shutil
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.transforms as T
from PIL import Image
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from torch.utils.data import DataLoader, Dataset
from torchvision import models, transforms
from torchvision.models import EfficientNet_B0_Weights
from tqdm import tqdm

# ----------------------------------------------------------------------------
# Configuration
# ----------------------------------------------------------------------------

IMG_SIZE = 224
IGNORE_INDEX = -1
IMG_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}

ROUTE_NAMES = ["diabetic_foot (Wagner)", "pressure_ulcer (EPUAP)", "ulcus_cruris (CEAP)"]
WAGNER_NAMES = [f"Wagner {i}" for i in range(6)]
EPUAP_NAMES = [f"EPUAP Stage {i}" for i in range(1, 5)]
CEAP_NAMES = ["CEAP C5 (healed)", "CEAP C6 (active)"]

# Clinical imbalance: a missed diabetic foot (highest amputation risk) is
# penalised 2.5x harder than other routing errors.
ROUTE_CLASS_WEIGHTS = [2.5, 1.0, 1.0]

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


# ----------------------------------------------------------------------------
# Model: shared EfficientNet-B0 trunk + routing head + 3 scoring heads
# ----------------------------------------------------------------------------

class MultiStageWoundNet(nn.Module):
    def __init__(self, n_route=3, n_wagner=6, n_epuap=4, n_ceap=2,
                 dropout=0.3, pretrained=True):
        super().__init__()
        weights = EfficientNet_B0_Weights.IMAGENET1K_V1 if pretrained else None
        backbone = models.efficientnet_b0(weights=weights)
        in_features = backbone.classifier[1].in_features   # 1280
        backbone.classifier = nn.Identity()                # expose feature map
        self.backbone = backbone
        self.dropout = nn.Dropout(p=dropout)

        # Stage 1 - gatekeeper / routing head
        self.route_head = nn.Linear(in_features, n_route)
        # Stage 2 - clinical scoring heads
        self.wagner_head = nn.Linear(in_features, n_wagner)
        self.epuap_head = nn.Linear(in_features, n_epuap)
        self.ceap_head = nn.Linear(in_features, n_ceap)

    def forward(self, x) -> dict[str, torch.Tensor]:
        feats = self.dropout(self.backbone(x))
        return {
            "route": self.route_head(feats),
            "wagner": self.wagner_head(feats),
            "epuap": self.epuap_head(feats),
            "ceap": self.ceap_head(feats),
        }
