#!/bin/bash


# Dừng và xóa container cũ (nếu có)
docker compose down

# Khởi động lại docker
docker compose up -d --build

# Xem logs nếu muốn
docker compose logs -f
