"""Minimal model definition for inference.

Only contains the constants and network architecture needed by the
Wagner-Armstrong / EPUAP / CEAP classifier. Training code and dependencies
(sklearn, tqdm) are intentionally excluded so the Docker image stays small.
"""

import torch
import torch.nn as nn
from torchvision import models
from torchvision.models import EfficientNet_B0_Weights

IMG_SIZE = 224
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

ROUTE_NAMES = ["diabetic_foot (Wagner)", "pressure_ulcer (EPUAP)", "ulcus_cruris (CEAP)"]
WAGNER_NAMES = [f"Wagner {i}" for i in range(6)]
EPUAP_NAMES = [f"EPUAP Stage {i}" for i in range(1, 5)]
CEAP_NAMES = ["CEAP C5 (healed)", "CEAP C6 (active)"]


class MultiStageWoundNet(nn.Module):
    def __init__(self, n_route=3, n_wagner=6, n_epuap=4, n_ceap=2,
                 dropout=0.3, pretrained=False):
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
