#!/bin/bash

# remove the rest containers if have
docker compose down

# Tự động build lại image (nếu có thay đổi Dockerfile/requirements) có sử dụng cache cho nhanh
# và chạy container ở chế độ nền (Detached mode)
docker compose up -d --build

echo "===================================================="
echo "🚀 Container đã chạy ngầm thành công!"
echo "👉 Để xem log backend, dùng lệnh: docker compose logs -f"
echo "👉 Để chạy frontend, dùng lệnh: docker exec -it telua_python_point npm run dev"
echo "===================================================="
