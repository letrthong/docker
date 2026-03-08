import os
import json
import logging
import base64

import time
# https://aistudio.google.com/
from google import genai
from google.genai import types

# Danh sách các đường dẫn file cấu hình để tìm kiếm API Key
# Ưu tiên /app/apiKeys.json theo yêu cầu
API_KEY_FILES = '/app/key/apiKeysConfig.json'

# Cấu hình giới hạn Context để tránh lỗi quá tải token và tăng tốc độ
MAX_CONTEXT_LENGTH = 200000  # Giới hạn khoảng 200k ký tự
MAX_DETAIL_FILES = 20  # Chỉ đọc chi tiết 20 bài viết mới nhất

# Biến toàn cục lưu lịch sử chat
chat_history = []

def decode_base64_safe(s):
    """Giải mã Base64 an toàn, trả về chuỗi gốc nếu lỗi."""
    if not isinstance(s, str):
        return s
    try:
        # Tự động thêm padding nếu thiếu để tránh lỗi binascii.Error
        s = s.strip()
        missing_padding = len(s) % 4
        if missing_padding:
            s += '=' * (4 - missing_padding)
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

            logging.warning(f"Key 'google' not found in {API_KEY_FILES}")
        except Exception as e:
            logging.error(f"Error reading API key from {API_KEY_FILES}: {e}")

    logging.error("Google API Key not found in any configuration file.")
    return None


def get_system_context():
    """
    Đọc dữ liệu từ thư mục config để làm context cho AI.
    Chỉ đọc các file dữ liệu an toàn (sản phẩm, nội dung), tránh file nhạy cảm (users, keys).
    """
    context = "Dưới đây là dữ liệu hiện tại của hệ thống Content Hub (dạng JSON). Lưu ý: Các trường 'title', 'body', 'contact' đã được giải mã từ Base64 để phân tích nội dung:\n"
    # Chỉ định rõ các file được phép đọc để bảo mật
    safe_files = ['contentslManagerData.json', 'labelContentContentConfig.json']
    config_dir = '/app/config'

    # Danh sách các file chi tiết cần ưu tiên đọc (được lấy từ contentslManagerData.json)
    priority_detail_files = []

    for filename in safe_files:
        file_path = os.path.join(config_dir, filename)
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    # Giải mã title và ẩn ảnh thumbnail trong contentslManagerData.json
                    if filename == 'contentslManagerData.json' and isinstance(data, list):
                        # Tối ưu hóa: Nếu danh sách quá dài, chỉ lấy 50 bài mới nhất (thường là đầu danh sách)
                        if len(data) > 50:
                            data = data[:50]
                            context += f"\n--- Dữ liệu từ {filename} (50 bài mới nhất) ---\n"
                        else:
                            context += f"\n--- Dữ liệu từ {filename} ---\n"

                        for item in data:
                            if 'title' in item:
                                item['title'] = decode_base64_safe(item['title'])
                            if 'image' in item and isinstance(item['image'], str) and len(item['image']) > 200:
                                item['image'] = "[IMAGE_THUMBNAIL_DATA]"

                            # Thu thập detailFilename để ưu tiên đọc chi tiết
                            if 'detailFilename' in item and item['detailFilename']:
                                priority_detail_files.append(item['detailFilename'])

                        context += f"{json.dumps(data, ensure_ascii=False, indent=2)}\n"
                    else:
                        context += f"\n--- Dữ liệu từ {filename} ---\n"
                        context += f"{json.dumps(data, ensure_ascii=False, indent=2)}\n"
            except Exception as e:
                logging.warning(f"Không thể đọc file {filename}: {e}")

    # Đọc thêm các file chi tiết bài viết (content_detail_*.json)
    try:
        if os.path.exists(config_dir):
            # 1. Xác định danh sách file cần đọc
            files_to_read = []

            # Ưu tiên các file được reference trong contentslManagerData.json
            for fname in priority_detail_files:
                fpath = os.path.join(config_dir, fname)
                if os.path.exists(fpath) and fpath not in files_to_read:
                    files_to_read.append(fpath)

            # 2. Lấy thêm danh sách tất cả file chi tiết khác nếu chưa đủ quota
            if len(files_to_read) < MAX_DETAIL_FILES:
                other_files = []
                for filename in os.listdir(config_dir):
                    if filename.startswith('content_detail_') and filename.endswith('.json'):
                        fpath = os.path.join(config_dir, filename)
                        if fpath not in files_to_read:
                            other_files.append(fpath)

                # Sắp xếp theo thời gian sửa đổi (Mới nhất lên đầu)
                other_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)

                # Fill vào danh sách cần đọc
                needed = MAX_DETAIL_FILES - len(files_to_read)
                files_to_read.extend(other_files[:needed])

            # 3. Đọc file với giới hạn số lượng và dung lượng
            processed_count = 0
            for file_path in files_to_read:
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
                    logging.warning(f"Lỗi đọc file chi tiết {file_path}: {e}")
    except Exception as e:
        logging.warning(f"Lỗi quét thư mục config: {e}")

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
            history_context = "\nLịch sử trò chuyện:\n" + "\n".join(
                [f"- {msg['role']}: {msg['content']}" for msg in chat_history])

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
        logging.error(f"Gemini API Error: {e}")
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
        logging.error(f"Gemini Report Error: {e}")
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
        config_dir = '/app/config'

        # Thêm lịch sử chat vào context tạo draft để AI hiểu ngữ cảnh
        history_context = ""
        if chat_history:
            history_context = "\nLịch sử trò chuyện trước đó (tham khảo ý định người dùng):\n" + "\n".join(
                [f"- {msg['role']}: {msg['content']}" for msg in chat_history])

        # Thử lấy một ảnh mẫu từ dữ liệu cũ để AI tham khảo phong cách (Style Transfer via Prompting)
        sample_image_part = None
        try:
            contents_path = os.path.join(config_dir, 'contentslManagerData.json')
            if os.path.exists(contents_path):
                with open(contents_path, 'r', encoding='utf-8') as f:
                    items = json.load(f)
                    # Tìm ảnh đầu tiên có dữ liệu base64 hợp lệ
                    for item in items:
                        if 'image' in item and isinstance(item['image'], str) and len(item['image']) > 1000:
                            # Cắt header data:image/..., chỉ lấy base64
                            parts = item['image'].split(',')
                            header = parts[0]
                            b64_data = parts[-1]
                            # Trích xuất mime_type thực tế (vd: image/png, image/webp)
                            mime_type = header.split(';')[0].split(':')[1] if ';' in header and ':' in header else "image/jpeg"
                            img_bytes = base64.b64decode(b64_data)
                            sample_image_part = types.Part.from_bytes(data=img_bytes, mime_type=mime_type)
                            break
        except Exception as e:
            logging.warning(f"Không thể tải ảnh mẫu để tham khảo: {e}")

        prompt_text = f"""
        {system_context}
        {history_context}

        NHIỆM VỤ: Dựa trên phong cách và nội dung của các bài viết đã có trong hệ thống, hãy viết một bài viết mới về chủ đề: "{topic}".

        YÊU CẦU ĐẦU RA:
        Chỉ trả về một chuỗi JSON hợp lệ (không có Markdown, không có ```json) với cấu trúc sau.
        LƯU Ý QUAN TRỌNG VỀ NHÃN (labels): Hãy ưu tiên sử dụng các nhãn (labels) đã tồn tại trong dữ liệu context (từ file labelContentContentConfig.json). Chỉ đề xuất nhãn mới nếu chủ đề thực sự mới và cần thiết.
        {{
            "title": "Tiêu đề bài viết hấp dẫn",
            "body": "Nội dung chi tiết bài viết (định dạng text hoặc html cơ bản)",
            "contact": "Thông tin liên hệ gợi ý",
            "labels": ["Nhãn đã có 1", "Nhãn mới nếu cần"],
            "image_prompt": "Mô tả chi tiết bằng tiếng Anh (để tạo ảnh) về hình ảnh minh họa cho bài viết này. Mô tả cần dựa trên phong cách của hình ảnh mẫu (nếu có) hoặc theo phong cách hiện đại, chuyên nghiệp phù hợp với nội dung."
        }}
        """

        # Xây dựng nội dung gửi lên Gemini (Text + Ảnh mẫu nếu có)
        contents_payload = []
        if sample_image_part:
            contents_payload.append("Dưới đây là một hình ảnh mẫu từ hệ thống để bạn tham khảo phong cách thiết kế:")
            contents_payload.append(sample_image_part)
        contents_payload.append(prompt_text)

        response = client.models.generate_content(model='gemini-3-flash-preview', contents=contents_payload)

        # Làm sạch response nếu AI lỡ thêm markdown block
        text = response.text.replace('```json', '').replace('```', '').strip()
        draft_data = json.loads(text)

        # Tạo hình ảnh dựa trên image_prompt vừa được AI đề xuất
        if 'image_prompt' in draft_data and draft_data['image_prompt']:
            try:
                # Kiểm tra danh sách model khả dụng để tìm model Imagen phù hợp
                target_model = None
                try:
                    for m in client.models.list():
                        if 'imagen' in m.name:
                            target_model = m.name
                            # Ưu tiên model imagen-3 nếu có
                            if 'imagen-3' in m.name:
                                break
                    if target_model:
                        target_model = target_model.replace('models/', '')
                    else:
                        logging.warning(
                            "Không tìm thấy model Imagen nào trong danh sách hỗ trợ của API Key. Sẽ thử model mặc định.")
                        target_model = 'imagen-3.0-generate-001'
                except Exception as list_e:
                    logging.warning(f"Lỗi khi liệt kê model: {list_e}")
                    target_model = 'imagen-3.0-generate-001'

                logging.info(f"Generating image with prompt using model '{target_model}': {draft_data['image_prompt']}")
                image_response = client.models.generate_images(
                    model=target_model,
                    prompt=draft_data['image_prompt'],
                    config=types.GenerateImagesConfig(number_of_images=1)
                )
                if image_response.generated_images:
                    img_bytes = image_response.generated_images[0].image.image_bytes
                    b64_img = base64.b64encode(img_bytes).decode('utf-8')
                    draft_data['image'] = f"data:image/png;base64,{b64_img}"
            except Exception as e:
                if "404" in str(e):
                    logging.warning(
                        f"Model tạo ảnh không khả dụng (404). Có thể API Key chưa được kích hoạt djowis hoặc sai Region: {e}")
                else:
                    logging.error(f"Lỗi tạo hình ảnh (Imagen): {e}")

        return draft_data
    except Exception as e:
        logging.error(f"Draft Generation Error: {e}")
        return {"error": str(e)}


def generate_video_proposal(topic):
    """
    Tạo kịch bản video và video demo dựa trên context hệ thống.
    """
    api_key = get_google_api_key()
    if not api_key:
        return {"error": "Chưa cấu hình API Key"}

    try:
        # Tăng timeout lên 600000 (ms) = 10 phút. SDK hiểu nhầm 600 là 600ms gây lỗi deadline 1s.
        client = genai.Client(api_key=api_key, http_options={'timeout': 600000})
        system_context = get_system_context()

        # 1. Tạo kịch bản video (Script)
        prompt_text = f"""
        {system_context}
        
        NHIỆM VỤ: Đóng vai trò là Đạo diễn hình ảnh. Hãy viết kịch bản cho một video ngắn (15-30s) về chủ đề: "{topic}".
        Video cần phù hợp với phong cách dữ liệu đã có trong hệ thống.

        YÊU CẦU ĐẦU RA:
        Trả về JSON (không Markdown) với cấu trúc:
        {{
            "title": "Tiêu đề video",
            "script": "Kịch bản chi tiết (Phân cảnh, Lời bình/Voiceover, Hình ảnh mô tả)",
            "video_prompt": "Một câu prompt tiếng Anh chi tiết, chất lượng cao mô tả cảnh quay ấn tượng nhất trong kịch bản để gửi cho AI tạo video (Cinematic, 4k, ...)."
        }}
        """
        
        response = client.models.generate_content(model='gemini-3-flash-preview', contents=prompt_text)
        text = response.text.replace('```json', '').replace('```', '').strip()
        video_data = json.loads(text)

        # 2. Tạo Video (hoặc Ảnh thumbnail nếu model video chưa khả dụng)
        if 'video_prompt' in video_data and video_data['video_prompt']:
            try:
                # Thử tìm model video (ví dụ: veo)
                # Lưu ý: Model video thường yêu cầu quyền truy cập đặc biệt hoặc đang ở chế độ Preview
                target_video_model = 'veo-3.1-generate-preview'
                logging.info(f"Attempting to generate video with model {target_video_model} and prompt: {video_data['video_prompt']}")
                
             
                logging.info(f"Starting video generation with model: {target_video_model}")
                
                # Gửi yêu cầu tạo video
                operation = client.models.generate_videos(
                    model=target_video_model, 
                    prompt=video_data['video_prompt'],
                    config=types.GenerateVideosConfig(number_of_videos=1)
                )
                
                # BLOCKING WAIT: Chờ video tạo xong (theo demo Google Veo 3.1)
                logging.info(f"Waiting for video generation... {operation.name}")
                while not operation.done:
                    logging.info("Waiting for video generation to complete...")
                    time.sleep(10)
                    operation = client.operations.get(operation)
                
                # Download video sau khi hoàn tất
                logging.info("Download video sau khi hoàn tất.")
                video_filename = "dialogue_example.mp4"
                file_patt= "/app/video/"  + video_filename
                generated_video = operation.response.generated_videos[0]
                client.files.download(file=generated_video.video)
                generated_video.video.save(file_patt)
                print("Generated video saved to dialogue_example.mp4")

                # Trả về kết quả
                # b64_vid = base64.b64encode(vid_bytes).decode('utf-8')
                video_data['video_url'] = f"/api/v1/contentHub/media/{video_filename}"
                # video_data['video_base64'] = f"data:video/mp4;base64,{b64_vid}"
                video_data['saved_filename'] = video_filename
            
            except Exception as e:
                logging.error(f"Media generation error: {e}")

        return video_data
    except Exception as e:
        logging.error(f"Video Proposal Error: {e}")
        return {"error": str(e)}


def clear_history():
    """Xóa toàn bộ lịch sử trò chuyện."""
    global chat_history
    chat_history = []
    return "Đã xóa lịch sử trò chuyện."