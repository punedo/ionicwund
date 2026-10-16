# -*- coding: utf-8 -*-
"""Wound image classification + segmentation (local version).

Processes a list of images: classifies each wound type with a HuggingFace
model and segments the wound region with MobileSAM, saving a side-by-side
result image for each input.

Original notebook:
    https://huggingface.co/Hemg/Wound-Image-classification

Classification model: https://huggingface.co/Hemg/Wound-Image-classification
Segmentation model:   https://github.com/ChaoningZhang/MobileSAM
"""

import os
import cv2
import numpy as np
import matplotlib.pyplot as plt
from PIL import Image, ImageOps
import torch
from transformers import AutoImageProcessor, AutoModelForImageClassification
from mobile_sam import sam_model_registry, SamAutomaticMaskGenerator


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
# Add as many images as you want to test here.
IMAGE_PATHS = [
    "wound.jpg",
    "1.png",
    "images.jpg",
    "chronic-wound.jpg",
]
SAM_CHECKPOINT = "mobile_sam.pt"
CLASSIFICATION_MODEL = "Hemg/Wound-Image-classification"
MAX_SIDE = 384  # compromise: sharper than 256, faster than 512 on CPU


# ---------------------------------------------------------------------------
# 1. Load the wound-classification model
# ---------------------------------------------------------------------------
print("Loading classification model...")
device = "cuda" if torch.cuda.is_available() else "cpu"
processor = AutoImageProcessor.from_pretrained(CLASSIFICATION_MODEL)
clf_model = AutoModelForImageClassification.from_pretrained(CLASSIFICATION_MODEL)
clf_model.to(device)
clf_model.eval()

# ---------------------------------------------------------------------------
# 2. Load MobileSAM for segmentation
#    Run on CPU to avoid CUDA launch timeout (Windows TDR) that occurs with
#    the automatic mask generator on some GPUs. SAM is small and fast enough
#    on CPU for single-image use.
# ---------------------------------------------------------------------------
sam_device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Loading MobileSAM on {sam_device}...")
mobile_sam = sam_model_registry["vit_t"](checkpoint=SAM_CHECKPOINT)
mobile_sam.to(device=sam_device)
mobile_sam.eval()

# Single fast generator tuned for distant + close detection.
# 256px + 6 points for better small/distant mask recall.
mask_generator = SamAutomaticMaskGenerator(
    model=mobile_sam,
    points_per_side=6,
    pred_iou_thresh=0.55,
    stability_score_thresh=0.60,
    crop_n_layers=0,
    crop_n_points_downscale_factor=1,
    min_mask_region_area=16,
)




def detect_wound_mask(image_sam):
    """Fast single-pass detection for both near and distant wounds.

    1) Run generator (points=6, crop=0) on 384px input.
    2) Reject edge-touching or extreme-aspect masks (common false positives).
    3) Accept small masks (relative ~0.0004). Score by colour + size + dist.
    4) Fallback to largest reasonable mask.
    """
    h_s, w_s = image_sam.shape[:2]
    img_center = np.array([w_s / 2, h_s / 2])
    diag = (h_s * h_s + w_s * w_s) ** 0.5
    max_area = h_s * w_s * 0.40
    min_area = max(6, int(h_s * w_s * 0.0004))

    masks = mask_generator.generate(image_sam)

    best_mask = None
    best_score = -1.0
    largest_mask = None
    largest_area = 0

    for mask_data in masks:
        seg = mask_data["segmentation"]
        area = mask_data["area"]

        if area < min_area or area > max_area:
            continue

        if area > largest_area:
            largest_area = area
            largest_mask = seg

        bbox = mask_data["bbox"]
        x, y, bw, bh = bbox
        mask_center = np.array([x + bw / 2, y + bh / 2])
        dist_to_center = np.linalg.norm(mask_center - img_center)

        # Heavily penalise masks that touch the image edges — common false positives
        edge_margin = min(w_s, h_s) * 0.03
        touches_edge = (
            x < edge_margin
            or y < edge_margin
            or (x + bw) > (w_s - edge_margin)
            or (y + bh) > (h_s - edge_margin)
        )

        # Penalise extreme aspect ratios (thin bars / strips)
        aspect = max(bw, bh) / (min(bw, bh) + 1e-6)
        bad_aspect = aspect > 6.0

        # Penalise very large masks (likely whole foot / background)
        relative_area = area / (h_s * w_s)
        large_mask = relative_area > 0.25

        # Favour reddish, darker wound tissue over pale skin/white background
        try:
            masked_pixels = image_sam[seg].astype(np.float32)
            if masked_pixels.shape[0] > 0:
                r = masked_pixels[:, 0]
                g = masked_pixels[:, 1]
                b = masked_pixels[:, 2]
                redness = np.mean(r) - np.mean((g + b) / 2.0)
                brightness = np.mean((r + g + b) / 3.0)
                darkness = 255.0 - brightness
                # Wounds are red AND (often) darker than skin/background
                color_score = max(0.0, redness * 0.6 + darkness * 0.2)
                # Clamp so a tiny bright speck cannot dominate
                color_score = min(color_score, 40.0)
            else:
                color_score = 0.0
        except Exception:
            color_score = 0.0

        # soft center bias: larger area or closer to center wins; allows off-center distant wounds
        # Multiply by color_score so wound-coloured masks beat skin/toes
        score = (area * (1.0 + color_score)) / (1.0 + dist_to_center / (diag * 0.1 + 1e-6))
        if touches_edge:
            score *= 0.15
        if bad_aspect:
            score *= 0.25
        if large_mask:
            score *= 0.5

        if score > best_score:
            best_score = score
            best_mask = seg

    if best_mask is not None:
        return best_mask
    return largest_mask


# ---------------------------------------------------------------------------
# 3. Single-image analysis (reusable — also used by wound_api.py)
# ---------------------------------------------------------------------------
def analyze_image(image, fast: bool = False):
    """Classify and segment a single PIL image.

    fast=True: skip Wagner grade for low latency camera path.

    Returns a dict:
        label      — predicted wound class (str)
        confidence — prediction confidence 0..1 (float)
        detected   — whether a wound region was segmented (bool)
        overlay    — RGB np.array of the image with the wound highlighted
        (optional) wagner_* / route_* when not fast
    """
    # Normalize phone-camera EXIF orientation (portrait selfies etc.)
    # and drop the EXIF tags so downstream code sees the visual orientation.
    image = ImageOps.exif_transpose(image)
    if image.mode != "RGB":
        image = image.convert("RGB")

    image_np = np.array(image)
    h0, w0 = image_np.shape[:2]

    # Resize for SAM
    scale = min(MAX_SIDE / h0, MAX_SIDE / w0, 1.0)
    if scale < 1.0:
        new_w, new_h = int(w0 * scale), int(h0 * scale)
        image_sam = cv2.resize(image_np, (new_w, new_h), interpolation=cv2.INTER_AREA)
    else:
        image_sam = image_np

    # Classify (downscale for speed; model handles any size)
    clf_size = 224
    ch, cw = image_np.shape[:2]
    cscale = min(clf_size / ch, clf_size / cw, 1.0)
    if cscale < 1.0:
        cimg = cv2.resize(image_np, (int(cw * cscale), int(ch * cscale)), interpolation=cv2.INTER_AREA)
        clf_img = Image.fromarray(cimg)
    else:
        clf_img = image
    inputs = processor(images=clf_img, return_tensors="pt").to(clf_model.device)
    with torch.no_grad():
        outputs = clf_model(**inputs)

    probabilities = torch.softmax(outputs.logits, dim=1)
    predicted_class_id = probabilities.argmax().item()
    predicted_probability = probabilities[0, predicted_class_id].item()
    predicted_label = clf_model.config.id2label[predicted_class_id]

    # Segment
    best_mask = detect_wound_mask(image_sam)

    # Scale mask back to original size
    if best_mask is not None and scale < 1.0:
        best_mask = cv2.resize(
            best_mask.astype(np.uint8), (w0, h0), interpolation=cv2.INTER_NEAREST
        ).astype(bool)

    # Overlay (skip heavy Wagner grade in fast mode)
    overlay = image_np.copy()
    grade_result: dict = {}

    if best_mask is not None:
        green_color = np.array([0, 230, 70], dtype=np.uint8)
        alpha = 0.55
        overlay[best_mask] = (
            alpha * green_color + (1 - alpha) * overlay[best_mask]
        ).astype(np.uint8)

        contours, _ = cv2.findContours(
            best_mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        cv2.drawContours(overlay, contours, -1, (0, 255, 0), 2)

        if not fast:
            # Lazy import to avoid loading Wagner checkpoint on fast camera path
            import wound_grade as _wg
            # --- Wagner-Armstrong classification on the wound crop ---
            bx, by, bw, bh = cv2.boundingRect(best_mask.astype(np.uint8))
            # Add 20% padding around bbox for surrounding tissue context
            # (training images include periwound skin, not just the wound)
            pad_w = int(bw * 0.20)
            pad_h = int(bh * 0.20)
            x1 = max(0, bx - pad_w)
            y1 = max(0, by - pad_h)
            x2 = min(w0, bx + bw + pad_w)
            y2 = min(h0, by + bh + pad_h)
            cv2.rectangle(overlay, (x1, y1), (x2, y2), (255, 0, 0), 2)

            crop_np = image_np[y1:y2, x1:x2]
            if crop_np.size > 0:
                crop_pil = Image.fromarray(crop_np)
                grade_result = _wg.classify_grade(crop_pil)

                # Route-aware: only show the clinically relevant classification
                route_label = grade_result.get("route_label", "")
                route_idx = -1
                for i, name in enumerate(_wg._route_names):
                    if name == route_label:
                        route_idx = i
                        break

                if route_idx == 0:
                    # Diabetic foot -> Wagner-Armstrong grade
                    stage_label = grade_result.get("wagner_label", "")
                    stage_conf = grade_result.get("wagner_conf", 0.0)
                    text = f"Wagner-Armstrong: {stage_label} | Confidence: {stage_conf:.1%}"
                    # Null out non-relevant heads
                    grade_result["epuap_label"] = None
                    grade_result["epuap_conf"] = None
                    grade_result["ceap_label"] = None
                    grade_result["ceap_conf"] = None
                elif route_idx == 1:
                    # Pressure ulcer -> EPUAP stage
                    stage_label = grade_result.get("epuap_label", "")
                    stage_conf = grade_result.get("epuap_conf", 0.0)
                    text = f"EPUAP: {stage_label} | Confidence: {stage_conf:.1%}"
                    # Null out non-relevant heads
                    grade_result["wagner_label"] = None
                    grade_result["wagner_conf"] = None
                    grade_result["ceap_label"] = None
                    grade_result["ceap_conf"] = None
                elif route_idx == 2:
                    # Venous ulcer -> CEAP class
                    stage_label = grade_result.get("ceap_label", "")
                    stage_conf = grade_result.get("ceap_conf", 0.0)
                    text = f"CEAP: {stage_label} | Confidence: {stage_conf:.1%}"
                    # Null out non-relevant heads
                    grade_result["wagner_label"] = None
                    grade_result["wagner_conf"] = None
                    grade_result["epuap_label"] = None
                    grade_result["epuap_conf"] = None
                else:
                    text = f"Route: {route_label}"

                text_y = y1 - 8 if y1 > 30 else y2 + 22
                (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
                cv2.rectangle(overlay, (x1, text_y - th - 4), (x1 + tw + 8, text_y + 4), (0, 0, 0), -1)
                cv2.putText(overlay, text, (x1 + 4, text_y), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

    return {
        "label": predicted_label,
        "confidence": predicted_probability,
        "detected": best_mask is not None,
        "overlay": overlay,
        "wagner_label": grade_result.get("wagner_label"),
        "wagner_conf": grade_result.get("wagner_conf"),
        "route_label": grade_result.get("route_label"),
        "route_conf": grade_result.get("route_conf"),
        "epuap_label": grade_result.get("epuap_label"),
        "epuap_conf": grade_result.get("epuap_conf"),
        "ceap_label": grade_result.get("ceap_label"),
        "ceap_conf": grade_result.get("ceap_conf"),
    }


# ---------------------------------------------------------------------------
# 4. Batch processing (only when run as a script)
# ---------------------------------------------------------------------------
def main():
    results = []
    for image_path in IMAGE_PATHS:
        print("\n" + "=" * 70)
        print(f"Processing: {image_path}")
        print("=" * 70)

        if not os.path.exists(image_path):
            print(f"  [SKIP] File not found: {image_path}")
            continue

        # Load image
        image = Image.open(image_path).convert("RGB")
        image_np = np.array(image)

        print("  Classifying + segmenting wound...")
        result = analyze_image(image)
        predicted_label = result["label"]
        predicted_probability = result["confidence"]
        overlay = result["overlay"]
        print(f"  Predicted Class: {predicted_label}")
        print(f"  Prediction Confidence: {predicted_probability:.4f}")
        if result["detected"]:
            print("  Wound detected! Applying green overlay...")
        else:
            print("  No wound detected with current parameters.")

        # Save per-image result
        stem = os.path.splitext(os.path.basename(image_path))[0]
        result_path = f"result_{stem}.png"
        fig, ax = plt.subplots(1, 2, figsize=(12, 6))
        ax[0].imshow(image_np)
        ax[0].set_title(
            f"{image_path}\nPrediction: {predicted_label} ({predicted_probability:.2%})"
        )
        ax[0].axis("off")

        ax[1].imshow(overlay)
        ax[1].set_title("Detected Wound Area")
        ax[1].axis("off")

        plt.tight_layout()
        plt.savefig(result_path, dpi=150, bbox_inches="tight")
        plt.close(fig)
        print(f"  Result saved as {result_path}")

        results.append(
            {
                "image": image_path,
                "label": predicted_label,
                "confidence": predicted_probability,
                "detected": result["detected"],
                "result_path": result_path,
            }
        )

    # -----------------------------------------------------------------------
    # Summary
    # -----------------------------------------------------------------------
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    for r in results:
        status = "detected" if r["detected"] else "not detected"
        print(
            f"  {r['image']:20s} | {r['label']:20s} | "
            f"{r['confidence']:.2%} | wound {status} -> {r['result_path']}"
        )
    print("=" * 70)


if __name__ == "__main__":
    main()
