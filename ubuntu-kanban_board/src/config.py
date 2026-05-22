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

 