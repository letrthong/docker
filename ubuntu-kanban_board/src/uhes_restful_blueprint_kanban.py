from config import CONFIG_DIR

from flask import Blueprint, request, jsonify, send_from_directory
import os
import json
import uuid
import jwt
import datetime
from werkzeug.security import generate_password_hash, check_password_hash

# Tạo một Blueprint. Tiền tố '/api/v1/kanban' sẽ được gán khi đăng ký trong file app.py
kanban_api = Blueprint('kanban_api', __name__)

USERS_DIR = os.path.join(CONFIG_DIR, 'users')
PROJECTS_DIR = os.path.join(CONFIG_DIR, 'projects')
TASKS_DIR = os.path.join(CONFIG_DIR, 'tasks')
COMMENTS_DIR = os.path.join(CONFIG_DIR, 'comments')
UPLOAD_DIR = os.path.join(CONFIG_DIR, 'uploads')

SECRET_KEY = "kanban-super-secret-key" # Trong thực tế, bạn nên lấy từ biến môi trường (os.environ)

def init_kanban_db():
    """Khởi tạo thư mục và file dữ liệu mặc định nếu chưa tồn tại"""
    os.makedirs(CONFIG_DIR, exist_ok=True)
    os.makedirs(USERS_DIR, exist_ok=True)
    os.makedirs(PROJECTS_DIR, exist_ok=True)
    os.makedirs(TASKS_DIR, exist_ok=True)
    os.makedirs(COMMENTS_DIR, exist_ok=True)
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
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

# --- RESTful API ROUTES ---

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
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            if payload.get("permission") != "owner":
                return jsonify({"error": "Forbidden"}), 403
        except Exception:
            return jsonify({"error": "Unauthorized"}), 401
    else:
        return jsonify({"error": "Unauthorized - Token missing"}), 401

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
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            if payload.get("permission") != "owner":
                return jsonify({"error": "Forbidden"}), 403
        except Exception:
            return jsonify({"error": "Unauthorized"}), 401
    else:
        return jsonify({"error": "Unauthorized - Token missing"}), 401

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
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            if payload.get("permission") != "owner":
                return jsonify({"error": "Forbidden"}), 403
        except Exception:
            return jsonify({"error": "Unauthorized"}), 401
    else:
        return jsonify({"error": "Unauthorized - Token missing"}), 401

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
    project_id = request.args.get('projectId')
    sprint_id = request.args.get('sprintId')
    
    tasks = []
    if os.path.exists(TASKS_DIR):
        for filename in os.listdir(TASKS_DIR):
            if filename.endswith('.json'):
                filepath = os.path.join(TASKS_DIR, filename)
                task = read_json(filepath)
                
                # Lọc theo Dự án từ phía Server
                if project_id and project_id not in ['none', 'all']:
                    if task.get('projectId') != project_id:
                        continue
                elif project_id == 'none':
                    if task.get('projectId'):
                        continue
                        
                # Lọc theo Sprint từ phía Server
                if sprint_id and sprint_id != 'all':
                    if sprint_id not in task.get('sprintIds', []):
                        continue

                comments_count = len(task.get('comments', []))
                comments_filepath = os.path.join(COMMENTS_DIR, filename)
                if os.path.exists(comments_filepath):
                    comments_count = len(read_json(comments_filepath))
                    
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
                        'commentsCount': comments_count,
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
    
    # Gộp comment từ file rời nếu có
    comments_filepath = os.path.join(COMMENTS_DIR, f"{task_id}.json")
    if os.path.exists(comments_filepath):
        task['comments'] = read_json(comments_filepath)
        
    return jsonify(task)

@kanban_api.route("/tasks", methods=["POST"])
def create_task():
    new_task = request.json
    
    if 'id' not in new_task:
        new_task['id'] = str(uuid.uuid4().hex)
        
    if 'comments' in new_task:
        new_task.pop('comments')

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
    
    if 'comments' in updated_data:
        updated_data.pop('comments')
    if 'comments' in task:
        task.pop('comments')
        
    task.update(updated_data)
    write_json(filepath, task)
    return jsonify({"message": "Task updated successfully", "task": task})

@kanban_api.route("/tasks/<task_id>", methods=["DELETE"])
def delete_task(task_id):
    filepath = os.path.join(TASKS_DIR, f"{task_id}.json")
    if os.path.exists(filepath):
        os.remove(filepath)
        
        comments_filepath = os.path.join(COMMENTS_DIR, f"{task_id}.json")
        if os.path.exists(comments_filepath):
            comments = read_json(comments_filepath)
            for c in comments:
                image_url = c.get("image")
                if image_url and '/uploads/' in image_url:
                    filename = image_url.split('/')[-1]
                    image_filepath = os.path.join(UPLOAD_DIR, filename)
                    if os.path.exists(image_filepath):
                        os.remove(image_filepath)
            os.remove(comments_filepath)
            
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
                    
    # 3. Kiểm tra sự thay đổi của file comments
    if os.path.exists(COMMENTS_DIR):
        if os.path.getmtime(COMMENTS_DIR) > last_sync:
            return jsonify({"changed": True, "timestamp": current_time})
        for filename in os.listdir(COMMENTS_DIR):
            if filename.endswith('.json'):
                filepath = os.path.join(COMMENTS_DIR, filename)
                if os.path.exists(filepath) and os.path.getmtime(filepath) > last_sync:
                    return jsonify({"changed": True, "timestamp": current_time})

    return jsonify({"changed": False, "timestamp": current_time})

@kanban_api.route("/upload", methods=["POST"])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "Không tìm thấy file"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Chưa chọn file"}), 400
    if file:
        ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else 'bin'
        filename = f"{uuid.uuid4().hex}.{ext}"
        file.save(os.path.join(UPLOAD_DIR, filename))
        return jsonify({"url": f"/api/v1/kanban/uploads/{filename}"}), 201

@kanban_api.route("/uploads/<filename>", methods=["GET"])
def get_uploaded_file(filename):
    return send_from_directory(UPLOAD_DIR, filename)

@kanban_api.route("/tasks/<task_id>/comments", methods=["POST"])
def add_task_comment(task_id):
    new_comment = request.json
    if 'id' not in new_comment:
        new_comment['id'] = str(uuid.uuid4().hex)
    
    filepath = os.path.join(COMMENTS_DIR, f"{task_id}.json")
    comments = []
    task = None
    task_filepath = os.path.join(TASKS_DIR, f"{task_id}.json")
    
    if os.path.exists(task_filepath):
        task = read_json(task_filepath)
        
    if os.path.exists(filepath):
        comments = read_json(filepath)
    else:
        if task:
            comments = task.get('comments', [])
            
    comments.append(new_comment)
    write_json(filepath, comments)
    
    # Ghi log lịch sử tự động mà không cần client gửi cập nhật toàn bộ task
    if task:
        if 'history' not in task:
            task['history'] = []
        task['history'].append({
            'id': str(uuid.uuid4().hex),
            'action': 'commented',
            'actor': new_comment.get('author', 'Unknown'),
            'timestamp': new_comment.get('createdAt', datetime.datetime.now().isoformat()),
            'details': 'đã thêm một bình luận mới.'
        })
        write_json(task_filepath, task)
        
    return jsonify({"message": "Bình luận đã được thêm", "comment": new_comment}), 201

@kanban_api.route("/tasks/<task_id>/comments/<comment_id>", methods=["PUT"])
def update_task_comment(task_id, comment_id):
    updated_data = request.json
    filepath = os.path.join(COMMENTS_DIR, f"{task_id}.json")
    actor = request.args.get('actor', 'Unknown')
    
    updated = False
    updated_comment = None
    if os.path.exists(filepath):
        comments = read_json(filepath)
        for c in comments:
            if str(c.get('id')) == str(comment_id):
                c['text'] = updated_data.get('text', c.get('text'))
                c['editedAt'] = datetime.datetime.utcnow().isoformat() + "Z"
                updated_comment = c
                updated = True
                break
        if updated:
            write_json(filepath, comments)
            
    task_filepath = os.path.join(TASKS_DIR, f"{task_id}.json")
    if os.path.exists(task_filepath):
        task = read_json(task_filepath)
        # Hỗ trợ backward compatibility
        if not updated and 'comments' in task:
            for c in task['comments']:
                if str(c.get('id')) == str(comment_id):
                    c['text'] = updated_data.get('text', c.get('text'))
                    c['editedAt'] = datetime.datetime.utcnow().isoformat() + "Z"
                    updated_comment = c
                    updated = True
                    break
            
        if updated:
            if 'history' not in task:
                task['history'] = []
            task['history'].append({
                'id': str(uuid.uuid4().hex),
                'action': 'edited',
                'actor': actor,
                'timestamp': datetime.datetime.utcnow().isoformat() + "Z",
                'details': 'đã chỉnh sửa một bình luận.'
            })
            write_json(task_filepath, task)
            return jsonify({"message": "Bình luận đã được cập nhật", "comment": updated_comment})
            
    if updated:
        return jsonify({"message": "Bình luận đã được cập nhật", "comment": updated_comment})
        
    return jsonify({"error": "Không tìm thấy bình luận"}), 404

@kanban_api.route("/tasks/<task_id>/comments/<comment_id>", methods=["DELETE"])
def delete_task_comment(task_id, comment_id):
    filepath = os.path.join(COMMENTS_DIR, f"{task_id}.json")
    actor = request.args.get('actor', 'Unknown')
    
    deleted = False
    deleted_comment = None
    
    if os.path.exists(filepath):
        comments = read_json(filepath)
        original_length = len(comments)
        updated_comments = []
        for c in comments:
            if str(c.get('id')) == str(comment_id):
                deleted_comment = c
            else:
                updated_comments.append(c)
                
        if len(updated_comments) < original_length:
            write_json(filepath, updated_comments)
            deleted = True
            
    task_filepath = os.path.join(TASKS_DIR, f"{task_id}.json")
    if os.path.exists(task_filepath):
        task = read_json(task_filepath)
        # Hỗ trợ backward compatibility
        if 'comments' in task:
            original_len = len(task['comments'])
            updated_comments = []
            for c in task['comments']:
                if str(c.get('id')) == str(comment_id):
                    deleted_comment = c
                else:
                    updated_comments.append(c)
            task['comments'] = updated_comments
            if len(task['comments']) < original_len:
                deleted = True
                
        if deleted:
            if 'history' not in task:
                task['history'] = []
            task['history'].append({
                'id': str(uuid.uuid4().hex),
                'action': 'edited',
                'actor': actor,
                'timestamp': datetime.datetime.utcnow().isoformat() + "Z",
                'details': 'đã xóa một bình luận.'
            })
            write_json(task_filepath, task)
            
    if deleted:
        # Xóa file vật lý nếu bình luận chứa ảnh
        if deleted_comment and deleted_comment.get('image'):
            image_url = deleted_comment.get('image')
            if '/uploads/' in image_url:
                filename = image_url.split('/')[-1]
                image_filepath = os.path.join(UPLOAD_DIR, filename)
                if os.path.exists(image_filepath):
                    os.remove(image_filepath)
                    
        return jsonify({"message": "Bình luận đã được xóa"})
        
    return jsonify({"error": "Không tìm thấy bình luận"}), 404