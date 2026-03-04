from flask import jsonify
from flask_cors import cross_origin # Import đúng tên thư viện

@app.route('/api/v1/contentHub/<resource>', methods=['GET'])
@cross_origin() # Cho phép trình duyệt gọi API này từ domain khác
def get_content_Hub(resource):
    filename = contentHub_file_mapping.get(resource)
    
    if not filename:
        return jsonify({"error": "Resource not found"}), 404

    path_file = "/app/logs/" + filename
    
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