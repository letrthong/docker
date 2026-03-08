import os
import json
import logging
import sys
from flask import Flask, jsonify, request, abort
from flask_cors import cross_origin # Import đúng tên thư viện
import telua_chatbot

# Cấu hình logging hiển thị ra terminal
logging.basicConfig(level=logging.INFO)
sys.stdout.reconfigure(line_buffering=True)

app = Flask(__name__)

contentHub_file_mapping = {
    'products': 'productslManagerData.json',
    'contents': 'contentslManagerData.json',
    'usersGet': 'userslManagerData.json',
    'usersUpdate': 'userslManagerData.json',
    'apiKeys': 'apiKeysConfig.json',
     'labelContent': 'labelContentContentConfig.json',
}
 
 
@app.route('/api/v1/contentHub/<resource>', methods=['GET'])
@cross_origin() 
def get_content_Hub(resource):
    filename = contentHub_file_mapping.get(resource)

    if not filename:
        return jsonify({"error": "Resource not found"}), 404

    folder_path = "/app/config"
    if resource in ['usersUpdate', 'usersGet',  'apiKeys' ]:
        folder_path  = "/app/key"

    path_file = os.path.join(folder_path, filename)

    # Kiểm tra nếu file chưa tồn tại
    if not os.path.exists(path_file):
        if not os.path.exists(folder_path):
            os.makedirs(folder_path, exist_ok=True)

        # Mặc định là mảng rỗng
        data_to_save = []

        # Nếu resource là 'users', khởi tạo với danh sách user mẫu
        if resource in ['users', 'usersGet']:
            data_to_save = [
                {"username": "admin", "pass": "135246", "role": "admin", "name": "Administrator"} 
            ]

        # Ghi dữ liệu vào file
        with open(path_file, 'w', encoding='utf-8') as f:
            json.dump(data_to_save, f, indent=4, ensure_ascii=False)

        return jsonify(data_to_save)

    # Nếu file đã tồn tại, đọc và trả về nội dung
    with open(path_file, "r", encoding='utf-8') as file:
        data = file.read()

    return data, 200, {'Content-Type': 'application/json'}

    
@app.route('/api/v1/contentHub/<resource>', methods=['POST'])
@cross_origin()
def post_content_Hub(resource):
    filename = contentHub_file_mapping.get(resource)
    if not filename:
        logging.warning(f"POST failed: unknown resource '{resource}'")
        abort(404, description="Resource not found")

    # 1. Lấy dữ liệu từ request
    data_to_save = request.json
    if data_to_save is None:
        return jsonify({'error': 'Invalid JSON data'}), 400

    # 2. Định nghĩa đường dẫn và tạo thư mục nếu chưa có
    folder_path = "/app/config"
    if resource in ['usersUpdate', 'usersGet', 'apiKeys']:
        folder_path = "/app/key"
        
    path_file = os.path.join(folder_path, filename)

    try:
        if not os.path.exists(folder_path):
            os.makedirs(folder_path, exist_ok=True)
            logging.info(f"Created directory: {folder_path}")

        # 3. Ghi dữ liệu vào file
        with open(path_file, 'w') as f:
            json.dump(data_to_save, f, indent=4)

        logging.info(f"POST /api/v1/contentHub/{resource} saved successfully")
        return jsonify({'status': 'saved', 'resource': resource})

    except Exception as e:
        logging.error(f"Failed to save {resource}: {str(e)}")
        return jsonify({'error': 'Internal Server Error', 'message': str(e)}), 500


@app.route('/api/v1/contentHub/detailInfo', methods=['GET', 'POST'])
@cross_origin()
def get_content_Hub_detail():
    # Lấy tên file từ query param (ưu tiên) hoặc header (Key: Filename)
    filename = request.args.get('filename') or request.headers.get('Filename')
    
    if not filename:
        return jsonify({"error": "Filename is required (query param 'filename' or header 'Filename')"}), 400

    # Bảo mật: chỉ lấy tên file, loại bỏ đường dẫn thư mục để tránh traversal attack
    filename = os.path.basename(filename)
    
    folder_path = "/app/config"
    path_file = os.path.join(folder_path, filename)

    if request.method == 'POST':
        data_to_save = request.json
        if data_to_save is None:
            return jsonify({'error': 'Invalid JSON data'}), 400

        try:
            if not os.path.exists(folder_path):
                os.makedirs(folder_path, exist_ok=True)

            # Lưu file với encoding utf-8 để hỗ trợ tiếng Việt
            with open(path_file, 'w', encoding='utf-8') as f:
                json.dump(data_to_save, f, indent=4, ensure_ascii=False)

            logging.info(f"POST /api/v1/contentHub/detailInfo saved {filename} successfully")
            return jsonify({'status': 'saved', 'filename': filename})

        except Exception as e:
            logging.error(f"Failed to save {filename}: {str(e)}")
            return jsonify({'error': 'Internal Server Error', 'message': str(e)}), 500

    # Xử lý GET
    if not os.path.exists(path_file):
        return jsonify({"error": "File not found"}), 404

    try:
        with open(path_file, "r", encoding='utf-8') as file:
            data = file.read()
        return data, 200, {'Content-Type': 'application/json'}
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/v1/contentHub/chatbot/content', methods=['GET', 'POST'])
@cross_origin()
def get_content_Hub_generate_content():
    if request.method == 'POST':
        try:
            # Nội dung lấy từ json
            data = request.json
            prompt = data.get('prompt', '')
            
            if not prompt:
                return jsonify({'error': 'Prompt is required'}), 400
            
            response_text = telua_chatbot.generate_response(prompt)
            return jsonify({'response': response_text})
        except Exception as e:
            logging.error(f"Chatbot error: {str(e)}")
            return jsonify({'error': str(e)}), 500
            
    return jsonify({'message': 'Chatbot API ready. Use POST with {"prompt": "..."}'})

@app.route('/api/v1/contentHub/chatbot/report', methods=['POST'])
@cross_origin()
def get_content_Hub_generate_report():
    try:
        data = request.json
        topic = data.get('topic', 'Tổng quan hệ thống')
        
        # Gọi hàm chuyên biệt cho báo cáo
        report_content = telua_chatbot.generate_report_response(topic)
        
        return jsonify({'report': report_content})
    except Exception as e:
        logging.error(f"Report API Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/contentHub/chatbot/draft', methods=['POST'])
@cross_origin()
def get_content_Hub_generate_draft():
    try:
        data = request.json
        topic = data.get('topic', 'Tin tức mới')
        
        # Gọi hàm tạo draft trả về JSON
        draft_json = telua_chatbot.generate_draft_proposal(topic)
        return jsonify(draft_json)
    except Exception as e:
        logging.error(f"Draft API Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/v1/contentHub/chatbot/clear', methods=['POST'])
@cross_origin()
def clear_chatbot_history():
    try:
        msg = telua_chatbot.clear_history()
        return jsonify({'message': msg})
    except Exception as e:
        logging.error(f"Clear History Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)