#!/bin/bash
# Dừng và xóa container cũ (nếu có)
docker compose down

# Build lại SPA (Vite/React)
npm run build

# Khởi động lại docker
docker compose up -d

# Copy thư mục dist/ vào container (giả sử service tên là telua_python_point)
docker cp dist/. telua_python_point:/app/dist/

# Xem logs nếu muốn
docker compose logs -f
