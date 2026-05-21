#!/bin/bash

mkdir -p out
# remove the rest containers if have
docker compose down

# Tự động build lại image (nếu có thay đổi Dockerfile/requirements) có sử dụng cache cho nhanh
# và chạy container ở chế độ nền (Detached mode)
docker compose up -d  --build

docker cp telua_python_kanban_board:/app/dist/index.html ./out/index.html

echo "===================================================="
echo "🚀 Container đã chạy ngầm thành công!"
echo "===================================================="
