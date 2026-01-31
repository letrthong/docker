#!/bin/bash
# Dừng script ngay lập tức nếu có lỗi (quan trọng để phát hiện lỗi build)
set -e

# remove the rest containers if have
docker compose down

# Đảm bảo xóa container cũ nếu lệnh down chưa xử lý hết hoặc container được tạo thủ công
docker rm -f ubuntu_java 2>/dev/null || true

# build images
docker compose build --no-cache

# start up containers from all images
docker compose up

#docker compose up -d  ( -d Detached)
