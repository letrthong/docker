 
# 🚜 Facebook Fanpage Automation (Nông Trang)

Professional automation tool for Facebook Page management using Python and Docker.

## 📋 Table of Contents / Mục lục
- [Features / Tính năng](#-features)
- [Tech Stack / Công nghệ](#-tech-stack)
- [Docker Management / Quản lý Docker](#-docker-management)
- [API Configuration / Cấu hình API](#-api-configuration)

---

## ✨ Features / Tính năng
- **Auto-Posting:** Publish feed updates to "Nông Trang" Fanpage automatically.
  *(Tự động đăng bài viết lên Fanpage Nông Trang)*
- **Engagement Tracking:** Read likes and comments via Graph API.
  *(Theo dõi tương tác: Đọc lượt like và comment qua Graph API)*
- **Containerized:** Isolated environment for consistent deployment.
  *(Môi trường Docker: Triển khai nhất quán và cô lập)*

## 🛠 Tech Stack / Công nghệ
- **Language:** Python 3
- **Library:** `facebook-sdk`
- **Environment:** Docker & Docker Compose
- **OS:** Ubuntu Base

---

## ⚙️ Docker Management / Quản lý Docker

Run these commands in your terminal:
*(Chạy các lệnh này trong terminal của bạn)*

```bash
# Start environment / Khởi chạy môi trường
docker compose up -d

# Access container shell / Truy cập vào container
docker exec -it telua_python bash

# Stop and remove / Dừng và xóa container
docker compose down

# Rebuild environment / Khởi tạo lại môi trường
docker compose up --build -d

Maintained by Thong LT.
