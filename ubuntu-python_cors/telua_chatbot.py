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

def get_system_context():
    """
    Đọc dữ liệu từ thư mục config để làm context cho AI.
    Chỉ đọc các file dữ liệu an toàn (sản phẩm, nội dung), tránh file nhạy cảm (users, keys).
    """
    context = "Dưới đây là dữ liệu hiện tại của hệ thống Content Hub (dạng JSON):\n"
    # Chỉ định rõ các file được phép đọc để bảo mật
    safe_files = ['productslManagerData.json', 'contentslManagerData.json']
    config_dir = '/app/config'

    for filename in safe_files:
        file_path = os.path.join(config_dir, filename)
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    context += f"\n--- Dữ liệu từ {filename} ---\n{f.read()}\n"
            except Exception as e:
                logger.warning(f"Không thể đọc file {filename}: {e}")
    return context

def generate_response(prompt):
    """
    Gửi prompt đến Google Gemini và nhận phản hồi.
    """
    api_key = get_google_api_key()
    if not api_key:
        return "Lỗi hệ thống: Chưa cấu hình Google API Key."

    try:
        client = genai.Client(api_key=api_key)
        
        # 1. Lấy dữ liệu hệ thống
        system_context = get_system_context()
        
        # 2. Ghép dữ liệu vào prompt để AI có thông tin phân tích
        full_prompt = f"{system_context}\n\nCâu hỏi của người dùng: {prompt}"
        
        response = client.models.generate_content(model='gemini-3-flash-preview', contents=full_prompt)
        return response.text
    except Exception as e:
        logger.error(f"Gemini API Error: {e}")
        return f"Lỗi khi gọi AI: {str(e)}"

def generate_report_response(topic):
    """
    Hàm chuyên biệt để tạo báo cáo phân tích dữ liệu.
    """
    api_key = get_google_api_key()
    if not api_key:
        return "Lỗi hệ thống: Chưa cấu hình Google API Key."

    try:
        client = genai.Client(api_key=api_key)
        
        system_context = get_system_context()
        
        # Prompt chuyên biệt cho báo cáo
        report_prompt = f"{system_context}\n\nNHIỆM VỤ: Đóng vai trò là chuyên gia phân tích dữ liệu (Data Analyst). Hãy viết một báo cáo chi tiết về chủ đề: '{topic}'.\n\nYÊU CẦU:\n- Phân tích dựa trên dữ liệu JSON ở trên.\n- Sử dụng định dạng Markdown.\n- Sử dụng bảng (table) để so sánh nếu có số liệu.\n- Đưa ra nhận xét và đề xuất xu hướng."
        
        response = client.models.generate_content(model='gemini-3-flash-preview', contents=report_prompt)
        return response.text
    except Exception as e:
        logger.error(f"Gemini Report Error: {e}")
        return f"Không thể tạo báo cáo: {str(e)}"