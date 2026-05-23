from flask import Blueprint, request, jsonify
import os
import json
import uuid
import jwt
import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from config import CONFIG_DIR

# Tạo một Blueprint. Tiền tố '/api/v1/kanban' sẽ được gán khi đăng ký trong file app.py
kanban_api = Blueprint('kanban_api', __name__)

USERS_DIR = os.path.join(CONFIG_DIR, 'users')
PROJECTS_DIR = os.path.join(CONFIG_DIR, 'projects')
TASKS_DIR = os.path.join(CONFIG_DIR, 'tasks')

SECRET_KEY = "kanban-super-secret-key" # Trong thực tế, bạn nên lấy từ biến môi trường (os.environ)

def init_kanban_db():
    """Khởi tạo thư mục và file dữ liệu mặc định nếu chưa tồn tại"""
    os.makedirs(CONFIG_DIR, exist_ok=True)
    os.makedirs(USERS_DIR, exist_ok=True)
    os.makedirs(PROJECTS_DIR, exist_ok=True)
    os.makedirs(TASKS_DIR, exist_ok=True)
    
    if not os.listdir(USERS_DIR):
        admin_id = str(uuid.uuid4().hex) 
        hashed_pw = generate_password_hash("admin")
        default_user = {"useruid": admin_id, "username": "admin", "permission": "owner", "password": hashed_pw}
        write_json(os.path.join(USERS_DIR, f"{admin_id}.json"), default_user)

def read_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def write_json(filepath, data):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

def get_all_users():
    users = []
    if os.path.exists(USERS_DIR):
        for filename in os.listdir(USERS_DIR):
            if filename.endswith('.json'):
                filepath = os.path.join(USERS_DIR, filename)
                users.append(read_json(filepath))
    return users

# --- RESTful API ROUTES ---

@kanban_api.route("/users/login", methods=["POST"])
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

@kanban_api.route("/users/me", methods=["GET"])
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

@kanban_api.route("/users", methods=["GET"])
def get_users():
    return jsonify(get_all_users())

@kanban_api.route("/users", methods=["POST"])
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

@kanban_api.route("/users/<useruid>", methods=["PUT"])
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

@kanban_api.route("/projects", methods=["GET"])
def get_projects():
    status_filter = request.args.get('status', 'active')
    projects = []
    if os.path.exists(PROJECTS_DIR):
        for filename in os.listdir(PROJECTS_DIR):
            if filename.endswith('.json'):
                filepath = os.path.join(PROJECTS_DIR, filename)
                project = read_json(filepath)
                
                # Lọc theo trạng thái xóa mềm
                if status_filter == 'deleted':
                    if project.get('status') == 'deleted':
                        projects.append(project)
                elif status_filter == 'all':
                    projects.append(project)
                else:
                    if project.get('status', 'active') != 'deleted':
                        projects.append(project)
    return jsonify(projects)

@kanban_api.route("/projects", methods=["POST"])
def create_project():
    new_project = request.json
    
    new_project['id'] = str(uuid.uuid4().hex)
    new_project['status'] = 'active'
    if 'users' not in new_project:
        new_project['users'] = []
        
    filepath = os.path.join(PROJECTS_DIR, f"{new_project['id']}.json")
    write_json(filepath, new_project)
    return jsonify({"message": "Tạo dự án thành công", "project": new_project}), 201

@kanban_api.route("/projects/<project_id>", methods=["PUT"])
def update_project(project_id):
    updated_data = request.json
    filepath = os.path.join(PROJECTS_DIR, f"{project_id}.json")
    
    if not os.path.exists(filepath):
        return jsonify({"error": "Không tìm thấy dự án"}), 404
        
    project = read_json(filepath)
    project.update(updated_data)
    write_json(filepath, project)
    return jsonify({"message": "Cập nhật dự án thành công", "project": project})

@kanban_api.route("/projects/<project_id>", methods=["DELETE"])
def delete_project(project_id):
    filepath = os.path.join(PROJECTS_DIR, f"{project_id}.json")
    
    if not os.path.exists(filepath):
        return jsonify({"error": "Không tìm thấy dự án"}), 404
        
    project = read_json(filepath)
    # Thay vì xóa file vật lý, đổi trạng thái thành deleted
    project['status'] = 'deleted'
    write_json(filepath, project)
    return jsonify({"message": "Đã xóa dự án thành công (chuyển vào thùng rác)"})

@kanban_api.route("/tasks", methods=["GET"])
def get_tasks():
    view_type = request.args.get('view', 'full')
    tasks = []
    if os.path.exists(TASKS_DIR):
        for filename in os.listdir(TASKS_DIR):
            if filename.endswith('.json'):
                filepath = os.path.join(TASKS_DIR, filename)
                task = read_json(filepath)
                if view_type == 'summary':
                    summary_task = {
                        'id': task.get('id'),
                        'title': task.get('title'),
                        'assignee': task.get('assignee'),
                        'projectId': task.get('projectId'),
                        'status': task.get('status'),
                        'priority': task.get('priority'),
                        'storyPoints': task.get('storyPoints'),
                        'sprintIds': task.get('sprintIds', []),
                        'createdAt': task.get('createdAt'),
                        'completedAt': task.get('completedAt'),
                        'locked': task.get('locked'),
                        'ownerId': task.get('ownerId'),
                        'commentsCount': len(task.get('comments', [])),
                        'itemsTotal': len(task.get('items', [])),
                        'itemsCompleted': sum(1 for item in task.get('items', []) if item.get('completed'))
                    }
                    tasks.append(summary_task)
                else:
                    tasks.append(task)
    return jsonify(tasks)

@kanban_api.route("/tasks/<task_id>", methods=["GET"])
def get_task(task_id):
    filepath = os.path.join(TASKS_DIR, f"{task_id}.json")
    if not os.path.exists(filepath):
        return jsonify({"error": "Task not found"}), 404
    task = read_json(filepath)
    return jsonify(task)

@kanban_api.route("/tasks", methods=["POST"])
def create_task():
    new_task = request.json
    
    if 'id' not in new_task:
        new_task['id'] = str(uuid.uuid4().hex)
        
    filepath = os.path.join(TASKS_DIR, f"{new_task['id']}.json")
    write_json(filepath, new_task)
    return jsonify({"message": "Task created successfully", "task": new_task}), 201

@kanban_api.route("/tasks/<task_id>", methods=["PUT", "PATCH"])
def update_task(task_id):
    updated_data = request.json
    filepath = os.path.join(TASKS_DIR, f"{task_id}.json")
    
    if not os.path.exists(filepath):
        return jsonify({"error": "Task not found"}), 404
        
    task = read_json(filepath)
    task.update(updated_data)
    write_json(filepath, task)
    return jsonify({"message": "Task updated successfully", "task": task})

@kanban_api.route("/tasks/<task_id>", methods=["DELETE"])
def delete_task(task_id):
    filepath = os.path.join(TASKS_DIR, f"{task_id}.json")
    if os.path.exists(filepath):
        os.remove(filepath)
        return jsonify({"message": "Task deleted successfully"})
    return jsonify({"error": "Task not found"}), 404

@kanban_api.route("/updates/check", methods=["GET"])
def check_updates():
    project_id = request.args.get('projectId')
    last_sync = request.args.get('lastSync', 0, type=float)
    current_time = datetime.datetime.now().timestamp()
    
    # 1. Kiểm tra sự thay đổi của file dự án
    if project_id and project_id not in ['none', 'all']:
        proj_file = os.path.join(PROJECTS_DIR, f"{project_id}.json")
        if os.path.exists(proj_file):
            if os.path.getmtime(proj_file) > last_sync:
                return jsonify({"changed": True, "timestamp": current_time})

    # 2. Kiểm tra sự thay đổi của các file công việc
    if os.path.exists(TASKS_DIR):
        # Nếu có file bị thêm hoặc xóa, thư mục TASKS_DIR sẽ thay đổi mtime
        if os.path.getmtime(TASKS_DIR) > last_sync:
            return jsonify({"changed": True, "timestamp": current_time})
            
        for filename in os.listdir(TASKS_DIR):
            if filename.endswith('.json'):
                filepath = os.path.join(TASKS_DIR, filename)
                if os.path.exists(filepath) and os.path.getmtime(filepath) > last_sync:
                    return jsonify({"changed": True, "timestamp": current_time})
                    
    return jsonify({"changed": False, "timestamp": current_time})