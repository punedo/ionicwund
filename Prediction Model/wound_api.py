# -*- coding: utf-8 -*-
"""Flask API for wound detection — serves the Ionic camera frontend.

Endpoints:
    GET  /health   -> {"status": "ok"}
    POST /analyze  -> classify + segment one frame

Accepts either:
    - multipart/form-data with a file field named "image"
    - JSON body {"image": "<base64 or data-url>"}

Returns JSON:
    {
        "label": "<wound class>",
        "confidence": 0.97,
        "detected": true,
        "overlay": "<base64 PNG of image with wound highlighted>",
        "wagner_label": "Wagner 3",
        "wagner_conf": 0.85,
        "route_label": "diabetic_foot (Wagner)",
        "route_conf": 0.90,
        "epuap_label": "EPUAP Stage 2",
        "epuap_conf": 0.80,
        "ceap_label": "CEAP C6 (active)",
        "ceap_conf": 0.75
    }

Run:
    python wound_api.py
"""

import base64
import io
import threading
import traceback

import cv2
import numpy as np
from PIL import Image
from flask import Flask, jsonify, request
from flask_cors import CORS

# Importing this module loads the classification model + MobileSAM once.
import wound_image_classification as wic

app = Flask(__name__)
CORS(app)  # allow requests from the Ionic dev server / app webview

# Serialize inference — SAM generators are not thread-safe.
_lock = threading.Lock()


def _decode_image():
    """Extract a PIL image from the request (multipart file or base64 JSON)."""
    # multipart/form-data: field name "image"
    if "image" in request.files:
        return Image.open(request.files["image"].stream).convert("RGB")

    # JSON: {"image": "data:image/jpeg;base64,...."} or raw base64
    data = request.get_json(silent=True) or {}
    b64 = data.get("image")
    if not b64:
        return None
    if "," in b64:  # strip data-url prefix
        b64 = b64.split(",", 1)[1]
    return Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/analyze")
def analyze():
    try:
        try:
            image = _decode_image()
        except Exception:
            return jsonify({"error": "could not decode image"}), 400

        if image is None:
            return jsonify({"error": "no image provided"}), 400

        with _lock:
            # fast=False: include Wagner-Armstrong grading when wound is detected
            result = wic.analyze_image(image, fast=False)

        # Shrink overlay for speed (client only needs preview). Keep slightly higher for distant detail.
        overlay_img = result["overlay"]
        oh, ow = overlay_img.shape[:2]
        if max(oh, ow) > 800:
            s = 800 / max(oh, ow)
            overlay_img = cv2.resize(overlay_img, (int(ow * s), int(oh * s)), interpolation=cv2.INTER_AREA)

        # Encode overlay as base64 PNG
        ok, buf = cv2.imencode(".png", cv2.cvtColor(overlay_img, cv2.COLOR_RGB2BGR))
        overlay_b64 = base64.b64encode(buf.tobytes()).decode("ascii") if ok else None

        return jsonify(
            {
                "label": result["label"],
                "confidence": result["confidence"],
                "detected": result["detected"],
                "overlay": overlay_b64,
                "wagner_label": result.get("wagner_label"),
                "wagner_conf": result.get("wagner_conf"),
                "route_label": result.get("route_label"),
                "route_conf": result.get("route_conf"),
                "epuap_label": result.get("epuap_label"),
                "epuap_conf": result.get("epuap_conf"),
                "ceap_label": result.get("ceap_label"),
                "ceap_conf": result.get("ceap_conf"),
            }
        )
    except Exception:
        print("[ERROR] /analyze failed:\n" + traceback.format_exc())
        return jsonify({"error": "analysis failed", "details": traceback.format_exc()}), 500


def _warmup():
    try:
        from PIL import Image as _Image
        import numpy as _np
        # Pre-load Wagner model so first real request has no cold-start
        import wound_grade  # noqa: F401 — loads at import time
        dummy = _Image.fromarray(_np.zeros((160, 160, 3), dtype=_np.uint8))
        _ = wic.analyze_image(dummy, fast=False)
        print("[warmup] full path ready (SAM + Wagner)")
    except Exception as _e:
        print("[warmup] skipped:", _e)

if __name__ == "__main__":
    _warmup()
    # host=0.0.0.0 so a phone on the same network can reach it
    app.run(host="0.0.0.0", port=5000, threaded=True)
