import os
import json
import threading
import base64
import time
import copy

# --- THIẾT LẬP LƯU TRỮ DỮ LIỆU (JSON FILES) ---
# BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR =  "/app/config/"
CONFIG_DIR = os.path.join(BASE_DIR, 'kanban')

USERS_FILE = os.path.join(CONFIG_DIR, 'users.json')
TASKS_FILE = os.path.join(CONFIG_DIR, 'tasks.json')
PROJECTS_FILE = os.path.join(CONFIG_DIR, 'projects.json')

os.makedirs(BASE_DIR, exist_ok=True)
os.makedirs(CONFIG_DIR, exist_ok=True)