import datetime
import json
import base64
import hmac
import hashlib
import os
from flask import Blueprint, jsonify, request, send_file
from werkzeug.utils import secure_filename
from pos_utils import read_config, CONFIG_DIR

pos_auth_bp = Blueprint('pos_auth_bp', __name__)
SECRET_KEY = "chain-secret-key-super-safe"  # Trong môi trường thực tế (Production), bạn nên đưa key này vào biến môi trường (.env)

def generate_token(payload, secret):
    """Hàm tự tạo chuỗi mã hóa giống hệt JWT bằng thư viện chuẩn của Python"""
    header = {"alg": "HS256", "typ": "JWT"}
    header_b64 = base64.urlsafe_b64encode(json.dumps(header, separators=(',', ':')).encode('utf-8')).decode('utf-8').rstrip('=')
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload, separators=(',', ':')).encode('utf-8')).decode('utf-8').rstrip('=')
    
    signature_message = f"{header_b64}.{payload_b64}"
    signature = hmac.new(secret.encode('utf-8'), signature_message.encode('utf-8'), hashlib.sha256).digest()
    signature_b64 = base64.urlsafe_b64encode(signature).decode('utf-8').rstrip('=')
    
    return f"{signature_message}.{signature_b64}"

@pos_auth_bp.route('/pos/api/v1/employees/<emp_id>/image', methods=['GET'])
def get_employee_image(emp_id):
    # Sử dụng secure_filename để chặn lỗ hổng Path Traversal
    safe_emp_id = secure_filename(emp_id)
    if not safe_emp_id:
        return jsonify({"error": "ID không hợp lệ"}), 400
        
    file_path = os.path.join(CONFIG_DIR, 'images', f"{safe_emp_id}.jpg")
    if os.path.exists(file_path):
        return send_file(file_path, mimetype='image/jpeg')
    return jsonify({"error": "Không tìm thấy ảnh"}), 404

@pos_auth_bp.route('/pos/api/v1/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Dữ liệu không hợp lệ"}), 400
    
    username = data.get('username', '').strip().lower()
    password = data.get('password', '')

    # Hạn sử dụng token (1 ngày), đổi thành dạng số nguyên (timestamp) để dễ chuyển thành JSON
    exp_timestamp = int((datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=1)).timestamp())

    # 1. Kiểm tra tài khoản Admin hệ thống
    if username == 'admin' and password == 'admin':
        user_data = {
            'username': 'Admin Manager',
            'role': 'admin',
            'name': 'Quản trị viên'
        }
        token = generate_token({**user_data, 'exp': exp_timestamp}, SECRET_KEY)
        return jsonify({"message": "Đăng nhập thành công", "token": token, "user": user_data}), 200

    # 2. Kiểm tra tài khoản Nhân sự trong Cấu hình (Database)
    config = read_config()
    all_employees = config.get('allEmployees', [])
    
    for emp in all_employees:
        emp_username = emp.get('username', '').strip().lower()
        if emp_username == username and emp.get('password') == password:
            status = emp.get('status', 'active')
            if status == 'create':
                return jsonify({"error": "Tài khoản mới tạo, vui lòng chờ Admin phê duyệt!"}), 403
            if status == 'disable':
                return jsonify({"error": "Tài khoản đã bị vô hiệu hóa!"}), 403

            default_store_id = emp.get('assignedStores', [None])[0] if emp.get('assignedStores') else None
            
            user_data = {'username': emp.get('username'), 'role': 'staff', 'assignedStores': emp.get('assignedStores', []), 'storeId': default_store_id, 'name': emp.get('name'), 'staffRole': emp.get('role')}
            token = generate_token({**user_data, 'exp': exp_timestamp}, SECRET_KEY)
            
            return jsonify({"message": "Đăng nhập thành công", "token": token, "user": user_data}), 200

    return jsonify({"error": "Sai tài khoản hoặc mật khẩu!"}), 401