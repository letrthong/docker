from flask import Blueprint, request, jsonify
import os
import json
import uuid

# Tạo một Blueprint. Tiền tố '/api/v1/kanban' sẽ được gán khi đăng ký trong file app.py
kanban_api = Blueprint('kanban_api', __name__)

# --- THIẾT LẬP LƯU TRỮ DỮ LIỆU (JSON FILES) ---
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
USERS_FILE = os.path.join(DATA_DIR, 'users.json')
TASKS_FILE = os.path.join(DATA_DIR, 'tasks.json')
PROJECTS_FILE = os.path.join(DATA_DIR, 'projects.json')

def init_kanban_db():
    """Khởi tạo thư mục và file dữ liệu mặc định nếu chưa tồn tại"""
    os.makedirs(DATA_DIR, exist_ok=True)
    
    if not os.path.exists(USERS_FILE):
        default_users = [
            {"useruid": "1", "username": "admin", "permission": "owner", "password": "admin"}
        ]
        with open(USERS_FILE, 'w', encoding='utf-8') as f:
            json.dump(default_users, f, ensure_ascii=False, indent=4)
            
    if not os.path.exists(TASKS_FILE):
        with open(TASKS_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f, ensure_ascii=False, indent=4)
            
    if not os.path.exists(PROJECTS_FILE):
        with open(PROJECTS_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f, ensure_ascii=False, indent=4)

def read_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def write_json(filepath, data):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

# --- RESTful API ROUTES ---

@kanban_api.route("/users/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    users = read_json(USERS_FILE)
    
    # Kiểm tra login, nếu DB cũ không có password thì mặc định là 'password123'
    user = next((u for u in users if u['username'] == username and u.get('password', 'password123') == password), None)
    if user:
        if user.get('disabled'):
            return jsonify({"error": "Tài khoản của bạn đã bị vô hiệu hóa"}), 403
        return jsonify({
            "message": "Đăng nhập thành công",
            "token": username,
            "user": user
        })
    return jsonify({"error": "Tên đăng nhập hoặc mật khẩu không chính xác"}), 401

@kanban_api.route("/users/me", methods=["GET"])
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

@kanban_api.route("/users", methods=["GET"])
def get_users():
    return jsonify(read_json(USERS_FILE))

@kanban_api.route("/users", methods=["POST"])
def create_user():
    new_user = request.json
    users = read_json(USERS_FILE)
    
    # Kiểm tra xem username đã tồn tại chưa
    if any(u['username'] == new_user.get('username') for u in users):
        return jsonify({"error": "Tên đăng nhập đã tồn tại"}), 400
        
    # Tạo ID mới
    new_uid = str(max([int(u['useruid']) for u in users if str(u.get('useruid', '')).isdigit()] + [0]) + 1)
    new_user['useruid'] = new_uid
    
    users.append(new_user)
    write_json(USERS_FILE, users)
    return jsonify({"message": "Tạo người dùng thành công", "user": new_user}), 201

@kanban_api.route("/users/<useruid>", methods=["PUT"])
def update_user(useruid):
    updated_data = request.json
    users = read_json(USERS_FILE)
    for i, user in enumerate(users):
        if user['useruid'] == useruid:
            # Cập nhật trạng thái disabled
            if 'disabled' in updated_data:
                users[i]['disabled'] = updated_data['disabled']
            if 'password' in updated_data:
                users[i]['password'] = updated_data['password']
            if 'permission' in updated_data:
                users[i]['permission'] = updated_data['permission']
            write_json(USERS_FILE, users)
            return jsonify({"message": "User updated successfully", "user": users[i]})
    return jsonify({"error": "User not found"}), 404

@kanban_api.route("/projects", methods=["GET"])
def get_projects():
    return jsonify(read_json(PROJECTS_FILE))

@kanban_api.route("/projects", methods=["POST"])
def create_project():
    new_project = request.json
    projects = read_json(PROJECTS_FILE)
    
    new_project['id'] = str(uuid.uuid4().hex)
    if 'users' not in new_project:
        new_project['users'] = []
        
    projects.append(new_project)
    write_json(PROJECTS_FILE, projects)
    return jsonify({"message": "Tạo dự án thành công", "project": new_project}), 201

@kanban_api.route("/projects/<project_id>", methods=["PUT"])
def update_project(project_id):
    updated_data = request.json
    projects = read_json(PROJECTS_FILE)
    for i, project in enumerate(projects):
        if project['id'] == project_id:
            projects[i].update(updated_data)
            write_json(PROJECTS_FILE, projects)
            return jsonify({"message": "Cập nhật dự án thành công", "project": projects[i]})
    return jsonify({"error": "Không tìm thấy dự án"}), 404

@kanban_api.route("/tasks", methods=["GET"])
def get_tasks():
    return jsonify(read_json(TASKS_FILE))

@kanban_api.route("/tasks", methods=["POST"])
def create_task():
    new_task = request.json
    tasks = read_json(TASKS_FILE)
    tasks.append(new_task)
    write_json(TASKS_FILE, tasks)
    return jsonify({"message": "Task created successfully", "task": new_task}), 201

@kanban_api.route("/tasks/<task_id>", methods=["PUT", "PATCH"])
def update_task(task_id):
    updated_data = request.json
    tasks = read_json(TASKS_FILE)
    for i, task in enumerate(tasks):
        if task['id'] == task_id:
            tasks[i].update(updated_data)
            write_json(TASKS_FILE, tasks)
            return jsonify({"message": "Task updated successfully", "task": tasks[i]})
    return jsonify({"error": "Task not found"}), 404

@kanban_api.route("/tasks/<task_id>", methods=["DELETE"])
def delete_task(task_id):
    tasks = read_json(TASKS_FILE)
    new_tasks = [t for t in tasks if t['id'] != task_id]
    if len(tasks) == len(new_tasks):
        return jsonify({"error": "Task not found"}), 404
    write_json(TASKS_FILE, new_tasks)
    return jsonify({"message": "Task deleted successfully"})