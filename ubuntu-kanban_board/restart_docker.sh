#!/bin/bash


# Dừng và xóa container cũ (nếu có)
docker compose down

# Khởi động lại docker
docker compose up -d  


mkdir -p out
docker cp telua_python_kanban_board:/app/dist/index.html ./kanban_data/index.html

# Xem logs nếu muốn
docker compose logs -f
echo "===================================================="
