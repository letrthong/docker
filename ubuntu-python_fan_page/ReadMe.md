 
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

```bash
# Start environment 
docker compose up -d

# Access container shell 
docker exec -it telua_python bash

# Stop and remove 
docker compose down

# Rebuild environment 
docker compose up --build -d

Maintained by Thong LT.

Markdown
