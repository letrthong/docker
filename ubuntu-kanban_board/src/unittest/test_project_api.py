import unittest
import json
import os
import tempfile
import shutil
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import uhes_restful_blueprint_kanban
import uhes_restful_blueprint_user

class ProjectApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.test_dir = tempfile.mkdtemp()
        cls.projects_dir = os.path.join(cls.test_dir, 'projects')
        cls.users_dir = os.path.join(cls.test_dir, 'users')
        os.makedirs(cls.projects_dir, exist_ok=True)
        os.makedirs(cls.users_dir, exist_ok=True)
        
        uhes_restful_blueprint_kanban.PROJECTS_DIR = cls.projects_dir
        uhes_restful_blueprint_kanban.USERS_DIR = cls.users_dir
        uhes_restful_blueprint_user.USERS_DIR = cls.users_dir
        
        uhes_restful_blueprint_kanban.init_kanban_db()
        
        # Đảm bảo tài khoản admin luôn tồn tại trong DB Test với mật khẩu gốc
        admin_user = {"useruid": "admin", "username": "admin", "permission": "owner", "password": "admin"}
        uhes_restful_blueprint_kanban.write_json(os.path.join(cls.users_dir, "admin.json"), admin_user)
        
        from app import app
        app.config['TESTING'] = True
        cls.app = app
        cls.client = cls.app.test_client()

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.test_dir)

    def test_1_add_edit_delete_project(self):
        # Lấy token Admin
        login_payload = {"username": "admin", "password": "admin"}
        res_login = self.client.post('/api/v1/kanban/users/login', json=login_payload)
        self.assertEqual(res_login.status_code, 200)
        token = json.loads(res_login.data).get("token", "")
        headers = {"Authorization": f"Bearer {token}"}

        project_payload = {"name": "Test Project", "users": []}
        
        # Tạo
        res_post = self.client.post('/api/v1/kanban/projects', json=project_payload, headers=headers)
        self.assertEqual(res_post.status_code, 201)
        project_id = json.loads(res_post.data)["project"]["id"]
        
        # Sửa
        res_put = self.client.put(f'/api/v1/kanban/projects/{project_id}', json={"name": "Test Project Updated"}, headers=headers)
        self.assertEqual(res_put.status_code, 200)
        
        # Xóa (Soft Delete)
        res_del = self.client.delete(f'/api/v1/kanban/projects/{project_id}', headers=headers)
        self.assertEqual(res_del.status_code, 200)
        
        # Kiểm tra danh sách hiển thị
        res_get = self.client.get('/api/v1/kanban/projects')
        self.assertFalse(any(p['id'] == project_id for p in json.loads(res_get.data)))
        
        res_get_deleted = self.client.get('/api/v1/kanban/projects?status=deleted')
        self.assertTrue(any(p['id'] == project_id for p in json.loads(res_get_deleted.data)))

    def test_2_regular_user_cannot_delete_project(self):
        # Lấy token Admin để tạo dự án
        login_payload_admin = {"username": "admin", "password": "admin"}
        res_login_admin = self.client.post('/api/v1/kanban/users/login', json=login_payload_admin)
        self.assertEqual(res_login_admin.status_code, 200)
        admin_token = json.loads(res_login_admin.data).get("token", "")
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # 1. Tạo một dự án trước (giả định quyền mặc định là admin khi chưa có token)
        project_payload = {"name": "Dự án Test RBAC", "users": []}
        res_post = self.client.post('/api/v1/kanban/projects', json=project_payload, headers=admin_headers)
        self.assertEqual(res_post.status_code, 201)
        project_id = json.loads(res_post.data)["project"]["id"]
        
        # 2. Tạo một User với quyền thấp ("user" hoặc "view")
        user_payload = {
            "username": "normal_user",
            "password": "password123",
            "permission": "user" 
        }
        self.client.post('/api/v1/kanban/users', json=user_payload)
        
        # 3. Đăng nhập để lấy Token của user bình thường
        login_payload = {"username": "normal_user", "password": "password123"}
        res_login = self.client.post('/api/v1/kanban/users/login', json=login_payload)
        
        headers = {}
        if res_login.status_code == 200:
            token = json.loads(res_login.data).get("token", "")
            headers = {"Authorization": f"Bearer {token}"}
            
        # 4. Thử xóa dự án bằng Token của user quyền thấp
        res_del = self.client.delete(f'/api/v1/kanban/projects/{project_id}', headers=headers)
        
        # 5. Kỳ vọng Backend chặn lại, trả về mã 403 Forbidden (hoặc 401)
        self.assertIn(res_del.status_code, [403, 401], "User bình thường không được phép xóa dự án")
        
        # 6. Xác nhận dự án vẫn không bị xóa (Double-check)
        res_get = self.client.get('/api/v1/kanban/projects')
        active_projects = json.loads(res_get.data)
        self.assertTrue(any(p['id'] == project_id for p in active_projects), "Dự án phải được giữ nguyên, không bị xóa")

    def test_3_regular_user_cannot_create_project(self):
        # 1. Tạo một User với quyền thấp ("user" hoặc "view")
        user_payload = {
            "username": "normal_user_create",
            "password": "password123",
            "permission": "user" 
        }
        self.client.post('/api/v1/kanban/users', json=user_payload)
        
        # 2. Đăng nhập để lấy Token của user bình thường
        login_payload = {"username": "normal_user_create", "password": "password123"}
        res_login = self.client.post('/api/v1/kanban/users/login', json=login_payload)
        
        headers = {}
        if res_login.status_code == 200:
            token = json.loads(res_login.data).get("token", "")
            headers = {"Authorization": f"Bearer {token}"}
            
        # 3. Thử tạo dự án bằng Token của user quyền thấp
        project_payload = {"name": "Dự án Không Thể Tạo", "users": []}
        res_post = self.client.post('/api/v1/kanban/projects', json=project_payload, headers=headers)
        
        # 4. Kỳ vọng Backend chặn lại, trả về mã 403 Forbidden (hoặc 401)
        self.assertIn(res_post.status_code, [403, 401], "User bình thường không được phép tạo dự án")