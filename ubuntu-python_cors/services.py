import os
import json
import logging
import google.generativeai as genai

# Cấu hình logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Danh sách các đường dẫn file cấu hình để tìm kiếm API Key
# Ưu tiên /app/apiKeys.json theo yêu cầu
API_KEY_FILES = [
    '/app/config/apiKeysConfig.json',
]

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
    for file_path in API_KEY_FILES:
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    
                if isinstance(data, list):
                    for item in data:
                        # Tìm object có key là "google"
                        if item.get('key') == 'google':
                            return item.get('value')
                
                logger.warning(f"Key 'google' not found in {file_path}")
            except Exception as e:
                logger.error(f"Error reading API key from {file_path}: {e}")
    
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
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        logger.error(f"Gemini API Error: {e}")
        return f"Lỗi khi gọi AI: {str(e)}"