# Wound Detection & Classification API

Flask API for wound detection, segmentation, and classification using MobileSAM and a custom MultiStageWoundNet.

## Features

- **Wound Segmentation**: MobileSAM generates segmentation masks to detect wound regions
- **Wound Classification**: HuggingFace model (Hemg/Wound-Image-classification) classifies wound type
- **Wagner-Armstrong Grading**: Custom MultiStageWoundNet (EfficientNet-B0 backbone) grades diabetic foot ulcers (Wagner 0-5)
- **EPUAP Staging**: Pressure ulcer staging (Stage 1-4)
- **CEAP Classification**: Venous ulcer classification (C5 healed / C6 active)

## API Endpoints

### `GET /health`
Returns `{"status": "ok"}`

### `POST /analyze`
Accepts a wound image and returns classification + segmentation results.

**Input**: multipart/form-data with `image` field, or JSON `{"image": "<base64>"}`

**Response**:
```json
{
    "label": "Diabetic Wound",
    "confidence": 0.97,
    "detected": true,
    "overlay": "<base64 PNG>",
    "wagner_label": "Wagner 3",
    "wagner_conf": 0.85,
    "route_label": "diabetic_foot (Wagner)",
    "route_conf": 0.90,
    "epuap_label": null,
    "epuap_conf": null,
    "ceap_label": null,
    "ceap_conf": null
}
```

## Docker

```bash
docker compose build wound-api
docker compose up -d wound-api
```

The API will be available at `http://localhost:5000`.

## Files

```
Prediction Model/
├── wound_api.py                    # Flask API server
├── wound_image_classification.py   # Classification + segmentation logic
├── wound_detection.py              # Standalone segmentation script
├── wound_grade.py                  # Wagner-Armstrong grade classifier
├── mobile_sam.pt                   # MobileSAM weights (must be copied here)
├── requirements.txt
├── Dockerfile
└── Wagner/
    ├── train_wound_classifier.py    # Model architecture + training script
    └── checkpoints/
        └── best_model.pt            # Trained Wagner model (must be copied here)
```

## Required Model Files

Copy these binary files from the willie-benchmark project:

1. `mobile_sam.pt` → `Prediction Model/mobile_sam.pt`
2. `Wagner/checkpoints/best_model.pt` → `Prediction Model/Wagner/checkpoints/best_model.pt`
