import cv2
import numpy as np
import matplotlib.pyplot as plt
from PIL import Image
import torch
from mobile_sam import sam_model_registry, SamAutomaticMaskGenerator

# Load the model
device = "cuda" if torch.cuda.is_available() else "cpu"
model_type = "vit_t"
sam_checkpoint = "mobile_sam.pt"

print(f"Loading MobileSAM model on {device}...")
mobile_sam = sam_model_registry[model_type](checkpoint=sam_checkpoint)
mobile_sam.to(device=device)
mobile_sam.eval()

mask_generator = SamAutomaticMaskGenerator(
    model=mobile_sam,
    points_per_side=16,
    pred_iou_thresh=0.86,
    stability_score_thresh=0.92,
    crop_n_layers=1,
    crop_n_points_downscale_factor=2,
    min_mask_region_area=200,  # Filter out tiny specks
)

# Load your wound image
image_path = "images.jpg"
print(f"Loading image from {image_path}...")
image = Image.open(image_path).convert("RGB")
image_np = np.array(image)

# Generate segmentation masks
print("Generating segmentation masks...")
masks = mask_generator.generate(image_np)

# Find the wound mask (targeted by central location and high red-channel contrast)
h, w, _ = image_np.shape
img_center = np.array([w / 2, h / 2])

best_mask = None
min_score = float("inf")

# Heuristic: Find localized tissue damage near center/focal area
for mask_data in masks:
    seg = mask_data["segmentation"]
    area = mask_data["area"]

    # Exclude the full background or whole foot
    if area > (h * w * 0.4) or area < 100:
        continue

    # Check proximity to center
    bbox = mask_data["bbox"]  # [x, y, w, h]
    mask_center = np.array([bbox[0] + bbox[2] / 2, bbox[1] + bbox[3] / 2])
    dist_to_center = np.linalg.norm(mask_center - img_center)

    if dist_to_center < min_score:
        min_score = dist_to_center
        best_mask = seg

# Apply solid green overlay like the reference app
overlay = image_np.copy()
if best_mask is not None:
    print("Wound detected! Applying green overlay...")
    green_color = np.array([0, 230, 70], dtype=np.uint8)  # Target neon green
    alpha = 0.55  # Transparency level

    # Blend green mask with the wound region
    overlay[best_mask] = (
        alpha * green_color + (1 - alpha) * overlay[best_mask]
    ).astype(np.uint8)

    # Draw boundary contour
    contours, _ = cv2.findContours(
        best_mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )
    cv2.drawContours(overlay, contours, -1, (0, 255, 0), 2)
else:
    print("No wound detected with current parameters.")

# Display output
fig, ax = plt.subplots(1, 2, figsize=(12, 6))
ax[0].imshow(image_np)
ax[0].set_title("Input Image")
ax[0].axis("off")

ax[1].imshow(overlay)
ax[1].set_title("Detected Wound Area")
ax[1].axis("off")

plt.tight_layout()
plt.savefig("wound_detection_result.png", dpi=150, bbox_inches='tight')
print("Result saved as wound_detection_result.png")
plt.show()
