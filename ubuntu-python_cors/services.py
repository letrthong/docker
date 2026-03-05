import os
import json
import logging
from flask import Flask, jsonify, request, abort
from flask_cors import cross_origin # Import đúng tên thư viện

app = Flask(__name__)

contentHub_file_mapping = {
    'products': 'productslManagerData.json',
    'contents': 'contentslManagerData.json',
    'users': 'userslManagerData.json',
}

@app.route('/api/v1/contentHub/<resource>', methods=['GET'])
@cross_origin()
# 1. Kiểm tra mapping
    filename = contentHub_file_mapping.get(resource)
    if not filename:
        return jsonify({"error": "Resource not found"}), 404

    folder_path = "/app/config"
    path_file = os.path.join(folder_path, filename)

    # 2. Xử lý logic nếu file chưa tồn tại
    if not os.path.exists(path_file):
        os.makedirs(folder_path, exist_ok=True)

        # Khởi tạo data mặc định
        if resource == 'users':
            data_to_save = [
                {"username": "admin", "pass": "135246", "role": "admin", "name": "Administrator"},
                {"username": "view", "pass": "1234", "role": "view", "name": "Viewer Mode"},
                {"username": "edit", "pass": "2468", "role": "edit", "name": "Editor Mode"}
            ]
        else:
            data_to_save = []

        # Ghi file
        with open(path_file, 'w', encoding='utf-8') as f:
            json.dump(data_to_save, f, indent=4, ensure_ascii=False)
        
        return jsonify(data_to_save)

    # 3. Xử lý logic nếu file đã tồn tại
    try:
        with open(path_file, "r", encoding='utf-8') as file:
            # Thay vì đọc string, hãy load JSON để jsonify đảm bảo tính đồng nhất
            data = json.load(file)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": f"Read file error: {str(e)}"}), 500

 

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


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)