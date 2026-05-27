from flask import Blueprint, request, jsonify
import os
import uuid
import jwt
import datetime
from werkzeug.security import generate_password_hash, check_password_hash

from uhes_restful_blueprint_kanban import USERS_DIR, SECRET_KEY, read_json, write_json

user_api = Blueprint('user_api', __name__)

def get_all_users():
    users = []
    if os.path.exists(USERS_DIR):
        for filename in os.listdir(USERS_DIR):
            if filename.endswith('.json'):
                filepath = os.path.join(USERS_DIR, filename)
                users.append(read_json(filepath))
    return users

@user_api.route("/users/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    print(f"[Kanban API] Login attempt for username: {username}")
    users = get_all_users()
    
    user = next((u for u in users if u['username'] == username), None)
    if user:
        if user.get('disabled'):
            return jsonify({"error": "Tài khoản của bạn đã bị vô hiệu hóa"}), 403
            
        stored_password = user.get('password', 'password123')
        
        # Hỗ trợ tương thích ngược: Kiểm tra cả mật khẩu đã hash và chưa hash (cũ)
        is_valid = False
        if stored_password.startswith('pbkdf2:') or stored_password.startswith('scrypt:'):
            is_valid = check_password_hash(stored_password, password)
        else:
            is_valid = (stored_password == password)
            
        if is_valid:
            # Tạo JWT Token có hạn 7 ngày
            payload = {
                'useruid': user['useruid'],
                'username': user['username'],
                'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
            }
            token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
            
            if isinstance(token, bytes):
                token = token.decode('utf-8')
                
            print(f"[Kanban API] Login successful for username: {username}")
            
            return jsonify({
                "message": "Đăng nhập thành công",
                "token": token,
                "user": user
            })
            
    print(f"[Kanban API] Login failed for username: {username} (Invalid credentials)")
    return jsonify({"error": "Tên đăng nhập hoặc mật khẩu không chính xác"}), 401

@user_api.route("/users/me", methods=["GET"])
def get_current_user():
    # Lấy token từ header Authorization
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return jsonify({"error": "Bạn chưa đăng nhập"}), 401
        
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        users = get_all_users()
        me = next((u for u in users if u['useruid'] == payload['useruid']), None)
        if me:
            return jsonify(me)
        return jsonify({"error": "Không tìm thấy người dùng, vui lòng đăng nhập lại"}), 401
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Token không hợp lệ"}), 401

@user_api.route("/users", methods=["GET"])
def get_users():
    return jsonify(get_all_users())

@user_api.route("/users", methods=["POST"])
def create_user():
    new_user = request.json
    users = get_all_users()
    
    # Kiểm tra xem username đã tồn tại chưa
    if any(u['username'] == new_user.get('username') for u in users):
        return jsonify({"error": "Tên đăng nhập đã tồn tại"}), 400
        
    # Tạo ID mới bằng UUID
    new_uid = str(uuid.uuid4().hex)
    new_user['useruid'] = new_uid
    
    # Mã hóa mật khẩu trước khi lưu
    if 'password' in new_user:
        new_user['password'] = generate_password_hash(new_user['password'])
        
    filepath = os.path.join(USERS_DIR, f"{new_uid}.json")
    write_json(filepath, new_user)
    return jsonify({"message": "Tạo người dùng thành công", "user": new_user}), 201

@user_api.route("/users/<useruid>", methods=["PUT"])
def update_user(useruid):
    updated_data = request.json
    filepath = os.path.join(USERS_DIR, f"{useruid}.json")
    
    if not os.path.exists(filepath):
        return jsonify({"error": "User not found"}), 404
        
    user = read_json(filepath)
    if 'disabled' in updated_data:
        user['disabled'] = updated_data['disabled']
    if 'password' in updated_data:
        user['password'] = generate_password_hash(updated_data['password'])
    if 'permission' in updated_data:
        user['permission'] = updated_data['permission']
        
    write_json(filepath, user)
    return jsonify({"message": "User updated successfully", "user": user})