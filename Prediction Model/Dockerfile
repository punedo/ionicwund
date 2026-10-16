FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1 \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir git+https://github.com/ChaoningZhang/MobileSAM.git

# Copy application files
COPY wound_api.py .
COPY wound_image_classification.py .
COPY wound_detection.py .
COPY wound_grade.py .
COPY mobile_sam.pt .
COPY Wagner/model.py ./Wagner/
COPY Wagner/checkpoints/ ./Wagner/checkpoints/

EXPOSE 5000

CMD ["python", "wound_api.py"]
