 
# 🚜 Facebook Fanpage Automation (Nông Trang)

Professional automation tool for Facebook Page management using Python and Docker.

## 📋 Table of Contents / Mục lục
- [Features / ](#-features)
- [Tech Stack ](#-tech-stack)
- [Docker Management ](#-docker-management)
- [API Configuration ](#-api-configuration)

---

## ✨ Features 
- **Auto-Posting:** Publish feed updates to "Nông Trang" Fanpage automatically.
- **Engagement Tracking:** Read likes and comments via Graph API.
- **Containerized:** Isolated environment for consistent deployment.
 
## 🛠 Tech Stack 
- **Language:** Python 3
- **Library:** `facebook-sdk`
- **Environment:** Docker & Docker Compose
- **OS:** Ubuntu Base

---

## ⚙️ Docker Management 

Run these commands in your terminal:

 
# Start environment 
docker compose up -d

# Access container shell 
docker exec -it telua_python bash

# Stop and remove 
docker compose down

# Rebuild environment 
docker compose up --build -d

---

## 🔑 API Configuration  
Visit Meta for Developers to manage your App:
https://developers.facebook.com/apps/ 
App Name: NongPhu
Page ID: 9337089698xyz (Nông Trang)

Required Scopes: pages_manage_posts, pages_read_engagement, pages_show_list.

---

## 📋 Requirements / Yêu cầu
The following components must be installed inside the container:
python3-pip
facebook-sdk (via pip)

---

## ⚠️ Security Note
Never commit your PAGE_ACCESS_TOKEN directly to GitHub. It is recommended to use a .env file or environment variables.

---

Maintained by Thong LT.

