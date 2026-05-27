import unittest
import json
import os
import tempfile
import shutil
import sys
import io

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import uhes_restful_blueprint_kanban

class TaskApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.test_dir = tempfile.mkdtemp()
        cls.tasks_dir = os.path.join(cls.test_dir, 'tasks')
        cls.comments_dir = os.path.join(cls.test_dir, 'comments')
        cls.uploads_dir = os.path.join(cls.test_dir, 'uploads')
        
        os.makedirs(cls.tasks_dir, exist_ok=True)
        os.makedirs(cls.comments_dir, exist_ok=True)
        os.makedirs(cls.uploads_dir, exist_ok=True)
        
        uhes_restful_blueprint_kanban.TASKS_DIR = cls.tasks_dir
        uhes_restful_blueprint_kanban.COMMENTS_DIR = cls.comments_dir
        uhes_restful_blueprint_kanban.UPLOAD_DIR = cls.uploads_dir
        
        from app import app
        app.config['TESTING'] = True
        cls.app = app
        cls.client = cls.app.test_client()

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.test_dir)

    def test_1_add_get_delete_task(self):
        task_payload = {
            "title": "Task Unit Test API",
            "description": "Nội dung test",
            "status": "todo"
        }
        # Tạo Task
        res_post = self.client.post('/api/v1/kanban/tasks', json=task_payload)
        self.assertEqual(res_post.status_code, 201)
        task_id = json.loads(res_post.data)["task"]["id"]
        
        # Get Task
        res_get = self.client.get(f'/api/v1/kanban/tasks/{task_id}')
        self.assertEqual(res_get.status_code, 200)
        
        # Cập nhật Task
        res_put = self.client.put(f'/api/v1/kanban/tasks/{task_id}', json={"status": "inprogress"})
        self.assertEqual(res_put.status_code, 200)
        
        # Xóa Task
        res_del = self.client.delete(f'/api/v1/kanban/tasks/{task_id}')
        self.assertEqual(res_del.status_code, 200)
        res_get_after = self.client.get(f'/api/v1/kanban/tasks/{task_id}')
        self.assertEqual(res_get_after.status_code, 404)

    def test_2_delete_task_with_comments_and_images(self):
        # 1. Tạo task giả
        task_payload = {"title": "Task test xóa liên đới", "status": "todo"}
        res_task = self.client.post('/api/v1/kanban/tasks', json=task_payload)
        self.assertEqual(res_task.status_code, 201)
        task_id = json.loads(res_task.data)["task"]["id"]
        
        # 2. Upload ảnh giả
        data = {'file': (io.BytesIO(b"fake image data"), 'test_image.jpg')}
        res_upload = self.client.post('/api/v1/kanban/upload', data=data, content_type='multipart/form-data')
        self.assertIn(res_upload.status_code, [200, 201])
        image_url = json.loads(res_upload.data)["url"]
        filename = os.path.basename(image_url)
        file_path = os.path.join(self.uploads_dir, filename)
        
        # 3. Tạo comment đính kèm ảnh
        comment_payload = {
            "text": "Bình luận có ảnh",
            "author": "test_user",
            "image": image_url
        }
        res_comment = self.client.post(f'/api/v1/kanban/tasks/{task_id}/comments', json=comment_payload)
        self.assertIn(res_comment.status_code, [200, 201])
        comment_file_path = os.path.join(self.comments_dir, f"{task_id}.json")
        
        # Đảm bảo file tồn tại trước khi xóa
        self.assertTrue(os.path.exists(comment_file_path), "File comment phải tồn tại")
        self.assertTrue(os.path.exists(file_path), "File ảnh phải tồn tại")
        
        # 4. Xóa Task
        res_del_task = self.client.delete(f'/api/v1/kanban/tasks/{task_id}')
        self.assertEqual(res_del_task.status_code, 200)
        
        # 5. Kiểm tra file task, file comment và file ảnh có bị thu gom dọn dẹp chưa
        task_file_path = os.path.join(self.tasks_dir, f"{task_id}.json")
        self.assertFalse(os.path.exists(task_file_path), "File task phải bị xóa")
        self.assertFalse(os.path.exists(comment_file_path), "File comment phải bị xóa cùng task")
        self.assertFalse(os.path.exists(file_path), "File ảnh phải bị xóa cùng task")