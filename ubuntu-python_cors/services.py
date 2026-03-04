import os
import json
from flask import Flask, jsonify
from flask_cors import cross_origin # Import đúng tên thư viện

app = Flask(__name__)

contentHub_file_mapping = {
    "resource1": "data1.json",
    "resource2": "data2.json"
}

@app.route('/api/v1/contentHub/<resource>', methods=['GET'])
@cross_origin() # Cho phép trình duyệt gọi API này từ domain khác
def get_content_Hub(resource):
    filename = contentHub_file_mapping.get(resource)
    
    if not filename:
        return jsonify({"error": "Resource not found"}), 404

    # Đảm bảo thư mục logs tồn tại
    log_dir = "/app/logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    path_file = os.path.join(log_dir, filename)
    
    if not os.path.exists(path_file):
        data_to_save = []
        with open(path_file, 'w') as f:
            json.dump(data_to_save, f, indent=4)
        return jsonify(data_to_save) # Dùng jsonify để tránh lỗi TypeError (trả về list)

    try:
        with open(path_file, "r") as file:
            data = json.load(file) # Đọc nội dung file JSON
        return jsonify(data) # Trả về dạng JSON chuẩn
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)