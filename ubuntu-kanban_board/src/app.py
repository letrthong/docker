from flask import Flask, send_from_directory, request, jsonify
import os
import json

app = Flask(__name__, static_folder="static")

# --- THIẾT LẬP LƯU TRỮ DỮ LIỆU (JSON FILES) ---
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
USERS_FILE = os.path.join(DATA_DIR, 'users.json')
TASKS_FILE = os.path.join(DATA_DIR, 'tasks.json')

def init_db():
    """Khởi tạo thư mục và file dữ liệu mặc định nếu chưa tồn tại"""
    os.makedirs(DATA_DIR, exist_ok=True)
    
    if not os.path.exists(USERS_FILE):
        default_users = [
            {"useruid": "101", "username": "alice", "permission": "create", "password": "password123"},
            {"useruid": "102", "username": "bob", "permission": "edit", "password": "password123"},
            {"useruid": "103", "username": "charlie", "permission": "view", "password": "password123"},
            {"useruid": "104", "username": "diana", "permission": "view", "password": "password123"},
            {"useruid": "105", "username": "Thong", "permission": "owner", "password": "password123"}
        ]
        with open(USERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(default_users, f, ensure_ascii=False, indent=4)
            
    if not os.path.exists(TASKS_FILE):
        with open(TASKS_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f, ensure_ascii=False, indent=4)

def read_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def write_json(filepath, data):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

# Gọi hàm khởi tạo dữ liệu ngay khi chạy app
init_db()

# --- MIDDLEWARE ---

@app.before_request
def log_request():
    print(f"[Flask] {request.method} {request.path}")

# --- RESTful API ROUTES ---

@app.route("/api/users/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    users = read_json(USERS_FILE)
    
    # Kiểm tra login, nếu DB cũ không có password thì mặc định là 'password123'
    user = next((u for u in users if u['username'] == username and u.get('password', 'password123') == password), None)
    if user:
        return jsonify({
            "message": "Đăng nhập thành công",
            "token": username,
            "user": user
        })
    return jsonify({"error": "Tên đăng nhập hoặc mật khẩu không chính xác"}), 401

@app.route("/api/users/me", methods=["GET"])
def get_current_user():
    users = read_json(USERS_FILE)
    # Lấy token từ header Authorization
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if token:
        me = next((u for u in users if u['username'] == token), None)
        if me:
            return jsonify(me)
            
    # Tạm thời giả định người dùng hiện tại là 'alice' nếu không có token
    me = next((u for u in users if u['username'] == 'alice'), users[0])
    return jsonify(me)

@app.route("/api/users", methods=["GET"])
def get_users():
    return jsonify(read_json(USERS_FILE))

@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    return jsonify(read_json(TASKS_FILE))

@app.route("/api/tasks", methods=["POST"])
def create_task():
    new_task = request.json
    tasks = read_json(TASKS_FILE)
    tasks.append(new_task)
    write_json(TASKS_FILE, tasks)
    return jsonify({"message": "Task created successfully", "task": new_task}), 201

@app.route("/api/tasks/<task_id>", methods=["PUT", "PATCH"])
def update_task(task_id):
    updated_data = request.json
    tasks = read_json(TASKS_FILE)
    for i, task in enumerate(tasks):
        if task['id'] == task_id:
            tasks[i].update(updated_data)
            write_json(TASKS_FILE, tasks)
            return jsonify({"message": "Task updated successfully", "task": tasks[i]})
    return jsonify({"error": "Task not found"}), 404

@app.route("/api/tasks/<task_id>", methods=["DELETE"])
def delete_task(task_id):
    tasks = read_json(TASKS_FILE)
    new_tasks = [t for t in tasks if t['id'] != task_id]
    if len(tasks) == len(new_tasks):
        return jsonify({"error": "Task not found"}), 404
    write_json(TASKS_FILE, new_tasks)
    return jsonify({"message": "Task deleted successfully"})

# --- FRONTEND PROXY ROUTES ---

@app.route("/")
def index():
    index_path = os.path.join(app.static_folder, "index.html")
    if not os.path.exists(index_path):
        print(f"[Flask][ERROR] index.html not found at {index_path}")
    return send_from_directory(app.static_folder, "index.html")

@app.route("/<path:path>")
def static_proxy(path):
    file_path = os.path.join(app.static_folder, path)
    if not os.path.exists(file_path):
        print(f"[Flask][ERROR] File not found: {file_path}")
    return send_from_directory(app.static_folder, path)

if __name__ == "__main__":
    print("[Flask] Starting server...")
    app.run(host="0.0.0.0", debug=True)
