import os
import json
import logging
import sys
import base64

# https://aistudio.google.com/
from google import genai

# Force unbuffered output for Docker logging (Hiển thị log ngay lập tức)
sys.stdout.reconfigure(line_buffering=True)
 

# Cấu hình logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Danh sách các đường dẫn file cấu hình để tìm kiếm API Key
# Ưu tiên /app/apiKeys.json theo yêu cầu
API_KEY_FILES = '/app/key/apiKeysConfig.json'

# Cấu hình giới hạn Context để tránh lỗi quá tải token và tăng tốc độ
MAX_CONTEXT_LENGTH = 200000  # Giới hạn khoảng 200k ký tự
MAX_DETAIL_FILES = 20        # Chỉ đọc chi tiết 20 bài viết mới nhất

# Biến toàn cục lưu lịch sử chat
chat_history = []

def decode_base64_safe(s):
    """Giải mã Base64 an toàn, trả về chuỗi gốc nếu lỗi."""
    if not isinstance(s, str):
        return s
    try:
        return base64.b64decode(s).decode('utf-8')
    except Exception:
        return s

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
    context = "Dưới đây là dữ liệu hiện tại của hệ thống Content Hub (dạng JSON). Lưu ý: Các trường 'title', 'body', 'contact' đã được giải mã từ Base64 để phân tích nội dung:\n"
    # Chỉ định rõ các file được phép đọc để bảo mật
    safe_files = ['contentslManagerData.json', 'labelContentContentConfig.json']
    config_dir = '/app/config'

    for filename in safe_files:
        file_path = os.path.join(config_dir, filename)
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    context += f"\n--- Dữ liệu từ {filename} ---\n{f.read()}\n"
                    data = json.load(f)
                    # Giải mã title và ẩn ảnh thumbnail trong contentslManagerData.json
                    if filename == 'contentslManagerData.json' and isinstance(data, list):
                        for item in data:
                            if 'title' in item:
                                item['title'] = decode_base64_safe(item['title'])
                            if 'image' in item and isinstance(item['image'], str) and len(item['image']) > 200:
                                item['image'] = "[IMAGE_THUMBNAIL_DATA]"
                        
                        # Tối ưu hóa: Nếu danh sách quá dài, chỉ lấy 50 bài mới nhất (thường là đầu danh sách)
                        if len(data) > 50:
                            data = data[:50]
                            context += f"\n--- Dữ liệu từ {filename} (50 bài mới nhất) ---\n"
                        else:
                            context += f"\n--- Dữ liệu từ {filename} ---\n"
                                
                    context += f"{json.dumps(data, ensure_ascii=False, indent=2)}\n"
            except Exception as e:
                logger.warning(f"Không thể đọc file {filename}: {e}")

    # Đọc thêm các file chi tiết bài viết (content_detail_*.json)
    try:
        if os.path.exists(config_dir):
            # 1. Lấy danh sách tất cả file chi tiết
            detail_files = []
            for filename in os.listdir(config_dir):
                if filename.startswith('content_detail_') and filename.endswith('.json'):
                    detail_files.append(os.path.join(config_dir, filename))
            
            # 2. Sắp xếp theo thời gian sửa đổi (Mới nhất lên đầu)
            detail_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
            
            # 3. Đọc file với giới hạn số lượng và dung lượng
            processed_count = 0
            for file_path in detail_files:
                if processed_count >= MAX_DETAIL_FILES:
                    break
                
                # Kiểm tra nếu context đã quá lớn thì dừng lại
                if len(context) > MAX_CONTEXT_LENGTH:
                    context += "\n[Hệ thống: Đã đạt giới hạn bộ nhớ đệm, các bài viết cũ hơn sẽ không được tải vào context]\n"
                    break

                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        
                        # Giải mã nội dung chi tiết (body, contact)
                        if 'body' in data:
                            data['body'] = decode_base64_safe(data['body'])
                        if 'contact' in data:
                            data['contact'] = decode_base64_safe(data['contact'])

                        # Tối ưu hóa: Ẩn dữ liệu ảnh base64 quá dài để tiết kiệm token cho AI
                        if 'image' in data and isinstance(data['image'], str) and len(data['image']) > 200:
                            data['image'] = "[IMAGE_DATA_PRESENT]"
                        
                        filename = os.path.basename(file_path)
                        context += f"\n--- Chi tiết bài viết ({filename}) ---\n{json.dumps(data, ensure_ascii=False)}\n"
                        processed_count += 1
                except Exception as e:
                    logger.warning(f"Lỗi đọc file chi tiết {file_path}: {e}")
    except Exception as e:
        logger.warning(f"Lỗi quét thư mục config: {e}")

    return context

def generate_response(prompt):
    """
    Gửi prompt đến Google Gemini và nhận phản hồi.
    """
    global chat_history
    api_key = get_google_api_key()
    if not api_key:
        return "Lỗi hệ thống: Chưa cấu hình Google API Key."

    try:
        client = genai.Client(api_key=api_key)
        
        # 1. Lấy dữ liệu hệ thống
        system_context = get_system_context()
        
        # 2. Xây dựng context từ lịch sử
        history_context = ""
        if chat_history:
            history_context = "\nLịch sử trò chuyện:\n" + "\n".join([f"- {msg['role']}: {msg['content']}" for msg in chat_history])
        
        # 3. Ghép dữ liệu vào prompt
        full_prompt = f"{system_context}\n{history_context}\n\nCâu hỏi của người dùng: {prompt}"
        
        # Lưu câu hỏi vào lịch sử
        chat_history.append({"role": "User", "content": prompt})
        
        response = client.models.generate_content(model='gemini-3-flash-preview', contents=full_prompt)
        
        # Lưu phản hồi vào lịch sử
        chat_history.append({"role": "AI", "content": response.text})
        
        # Giới hạn lịch sử (20 tin nhắn gần nhất)
        if len(chat_history) > 20:
            chat_history = chat_history[-20:]
            
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

def generate_draft_proposal(topic):
    """
    Tạo bản nháp bài viết mới dựa trên phân tích dữ liệu cũ.
    Trả về định dạng JSON để Frontend có thể điền vào form.
    """
    global chat_history
    api_key = get_google_api_key()
    if not api_key:
        return {"error": "Chưa cấu hình API Key"}

    try:
        client = genai.Client(api_key=api_key)
        system_context = get_system_context()
        
        # Thêm lịch sử chat vào context tạo draft để AI hiểu ngữ cảnh
        history_context = ""
        if chat_history:
            history_context = "\nLịch sử trò chuyện trước đó (tham khảo ý định người dùng):\n" + "\n".join([f"- {msg['role']}: {msg['content']}" for msg in chat_history])
        
        prompt = f"""
        {system_context}
        {history_context}
        
        NHIỆM VỤ: Dựa trên phong cách và nội dung của các bài viết đã có trong hệ thống, hãy viết một bài viết mới về chủ đề: "{topic}".
        
        YÊU CẦU ĐẦU RA:
        Chỉ trả về một chuỗi JSON hợp lệ (không có Markdown, không có ```json) với cấu trúc sau:
        {{
            "title": "Tiêu đề bài viết hấp dẫn",
            "body": "Nội dung chi tiết bài viết (định dạng text hoặc html cơ bản)",
            "contact": "Thông tin liên hệ gợi ý",
            "labels": ["Tên nhãn 1", "Tên nhãn 2"]
        }}
        """
        
        response = client.models.generate_content(model='gemini-3-flash-preview', contents=prompt)
        # Làm sạch response nếu AI lỡ thêm markdown block
        text = response.text.replace('```json', '').replace('```', '').strip()
        return json.loads(text)
    except Exception as e:
        logger.error(f"Draft Generation Error: {e}")
        return {"error": str(e)}

def clear_history():
    """Xóa toàn bộ lịch sử trò chuyện."""
    global chat_history
    chat_history = []
    return "Đã xóa lịch sử trò chuyện."