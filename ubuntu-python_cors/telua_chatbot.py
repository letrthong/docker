import os
import json
import logging
import sys

# https://aistudio.google.com/
from google import genai

# Force unbuffered output for Docker logging (Hiển thị log ngay lập tức)
sys.stdout.reconfigure(line_buffering=True)
 

# Cấu hình logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Danh sách các đường dẫn file cấu hình để tìm kiếm API Key
# Ưu tiên /app/apiKeys.json theo yêu cầu
API_KEY_FILES = '/app/config/apiKeysConfig.json'

def get_google_api_key():
    """
    Đọc Google API Key từ file cấu hình JSON.
    Cấu trúc JSON mong đợi:
    [
        {
            "key": "google",
            "value": "YOUR_API_KEY",
            "desc": "Description"
        }
    ]
    """
    if os.path.exists(API_KEY_FILES):
        try:
            with open(API_KEY_FILES, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            if isinstance(data, list):
                for item in data:
                    # Tìm object có key là "google"
                    if item.get('key') == 'google':
                        return item.get('value')
            
            logger.warning(f"Key 'google' not found in {API_KEY_FILES}")
        except Exception as e:
            logger.error(f"Error reading API key from {API_KEY_FILES}: {e}")
    
    logger.error("Google API Key not found in any configuration file.")
    return None

def generate_response(prompt):
    """
    Gửi prompt đến Google Gemini và nhận phản hồi.
    """
    api_key = get_google_api_key()
    if not api_key:
        return "Lỗi hệ thống: Chưa cấu hình Google API Key."

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(model='gemini-3-flash-preview', contents=prompt)
        return response.text
    except Exception as e:
        logger.error(f"Gemini API Error: {e}")
        return f"Lỗi khi gọi AI: {str(e)}"