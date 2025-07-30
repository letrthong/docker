# Base image
FROM python:3.10-slim

# Cài đặt các gói cần thiết
RUN apt-get update && apt-get install -y \
    git \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Tạo thư mục làm việc
WORKDIR /app

# Cài đặt YOLOv8 và các thư viện liên quan
RUN pip install --upgrade pip
RUN pip install ultralytics opencv-python

# Copy mã nguồn vào container
COPY . /app

# Lệnh mặc định khi container chạy
CMD ["python", "detect_ras.py"]
