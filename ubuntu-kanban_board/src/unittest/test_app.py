import unittest
import json
import os
import tempfile
import shutil
import sys

# Thêm thư mục src vào sys.path để import các module app, blueprint
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import uhes_restful_blueprint_kanban
import uhes_restful_blueprint_user
from test_failing import FailingTestCase

class KanbanAppTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Tạo thư mục test_dir tạm thời trong hệ thống để chứa DB test (tránh làm ảnh hưởng db thực)
        cls.test_dir = tempfile.mkdtemp()
        
        cls.users_dir = os.path.join(cls.test_dir, 'users')
        cls.tasks_dir = os.path.join(cls.test_dir, 'tasks')
        cls.projects_dir = os.path.join(cls.test_dir, 'projects')
        cls.comments_dir = os.path.join(cls.test_dir, 'comments')
        cls.uploads_dir = os.path.join(cls.test_dir, 'uploads')
        
        os.makedirs(cls.users_dir, exist_ok=True)
        os.makedirs(cls.tasks_dir, exist_ok=True)
        os.makedirs(cls.projects_dir, exist_ok=True)
        os.makedirs(cls.comments_dir, exist_ok=True)
        os.makedirs(cls.uploads_dir, exist_ok=True)
        
        # Mock thư mục lưu trữ thực tế vào thư mục tạm vừa tạo
        uhes_restful_blueprint_kanban.USERS_DIR = cls.users_dir
        uhes_restful_blueprint_kanban.TASKS_DIR = cls.tasks_dir
        uhes_restful_blueprint_kanban.PROJECTS_DIR = cls.projects_dir
        uhes_restful_blueprint_kanban.COMMENTS_DIR = cls.comments_dir
        uhes_restful_blueprint_kanban.UPLOAD_DIR = cls.uploads_dir
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
        # Dọn dẹp và xóa thư mục test sau khi chạy xong
        shutil.rmtree(cls.test_dir)

    def test_1_add_and_edit_user(self):
        # 1. Thêm người dùng (Add User)
        payload = {
            "username": "testuser_1",
            "password": "password123",
            "permission": "view"
        }
        res_post = self.client.post('/api/v1/kanban/users', json=payload)
        self.assertEqual(res_post.status_code, 201)
        data_post = json.loads(res_post.data)
        self.assertEqual(data_post["message"], "Tạo người dùng thành công")
        
        useruid = data_post["user"]["useruid"]
        self.assertIsNotNone(useruid)
        
        # 2. Cập nhật người dùng (Edit User)
        update_payload = {
            "disabled": True,
            "permission": "edit"
        }
        res_put = self.client.put(f'/api/v1/kanban/users/{useruid}', json=update_payload)
        self.assertEqual(res_put.status_code, 200)
        data_put = json.loads(res_put.data)
        self.assertEqual(data_put["message"], "User updated successfully")
        self.assertTrue(data_put["user"]["disabled"])
        self.assertEqual(data_put["user"]["permission"], "edit")

    def test_2_add_and_delete_task(self):
        # 1. Tạo task mới (Add Task)
        task_payload = {
            "title": "Task Unit Test",
            "description": "Nội dung test",
            "status": "todo"
        }
        res_post = self.client.post('/api/v1/kanban/tasks', json=task_payload)
        self.assertEqual(res_post.status_code, 201)
        data_post = json.loads(res_post.data)
        self.assertEqual(data_post["message"], "Task created successfully")
        
        task_id = data_post["task"]["id"]
        self.assertIsNotNone(task_id)
        
        # Kiểm tra API Get xem task đã thực sự được tạo chưa
        res_get = self.client.get(f'/api/v1/kanban/tasks/{task_id}')
        self.assertEqual(res_get.status_code, 200)
        
        # 2. Xóa task (Delete Task)
        res_del = self.client.delete(f'/api/v1/kanban/tasks/{task_id}')
        self.assertEqual(res_del.status_code, 200)
        data_del = json.loads(res_del.data)
        self.assertEqual(data_del["message"], "Task deleted successfully")
        
        # Kiểm tra xem task đã biến mất khỏi hệ thống chưa
        res_get_after = self.client.get(f'/api/v1/kanban/tasks/{task_id}')
        self.assertEqual(res_get_after.status_code, 404)

    def test_3_add_and_delete_project(self):
        # Lấy token Admin
        login_payload = {"username": "admin", "password": "admin"}
        res_login = self.client.post('/api/v1/kanban/users/login', json=login_payload)
        self.assertEqual(res_login.status_code, 200)
        token = json.loads(res_login.data).get("token", "")
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Tạo dự án mới (Add Project)
        project_payload = {
            "name": "Project Unit Test",
            "users": []
        }
        res_post = self.client.post('/api/v1/kanban/projects', json=project_payload, headers=headers)
        self.assertEqual(res_post.status_code, 201)
        data_post = json.loads(res_post.data)
        self.assertEqual(data_post["message"], "Tạo dự án thành công")
        
        project_id = data_post["project"]["id"]
        self.assertIsNotNone(project_id)
        
        # 2. Cập nhật dự án (Edit Project)
        update_payload = {
            "name": "Project Unit Test Updated"
        }
        res_put = self.client.put(f'/api/v1/kanban/projects/{project_id}', json=update_payload, headers=headers)
        self.assertEqual(res_put.status_code, 200)
        
        # 3. Xóa dự án (Soft Delete Project)
        res_del = self.client.delete(f'/api/v1/kanban/projects/{project_id}', headers=headers)
        self.assertEqual(res_del.status_code, 200)
        data_del = json.loads(res_del.data)
        self.assertEqual(data_del["message"], "Đã xóa dự án thành công (chuyển vào thùng rác)")
        
        # Kiểm tra xem dự án không còn ở trạng thái active (Get mặc định)
        res_get = self.client.get('/api/v1/kanban/projects')
        active_projects = json.loads(res_get.data)
        self.assertFalse(any(p['id'] == project_id for p in active_projects))
        
        # Kiểm tra dự án nằm trong danh sách đã xóa (Get với tham số status=deleted)
        res_get_deleted = self.client.get('/api/v1/kanban/projects?status=deleted')
        deleted_projects = json.loads(res_get_deleted.data)
        self.assertTrue(any(p['id'] == project_id for p in deleted_projects))

if __name__ == '__main__':
    try:
        import xmlrunner
        os.makedirs('test-reports', exist_ok=True)
        with open('test-reports/results.xml', 'wb') as output:
            runner = xmlrunner.XMLTestRunner(output=output)
            result = unittest.main(testRunner=runner, exit=False)
        sys.exit(not result.result.wasSuccessful())
    except ImportError:
        print("Cảnh báo: Không tìm thấy thư viện xmlrunner. Đang chạy test bằng giao diện console mặc định...")
        unittest.main()