import unittest
import json
import os
import tempfile
import shutil
import sys
import io

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import uhes_restful_blueprint_kanban

class CommentApiTestCase(unittest.TestCase):
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

    def test_1_add_and_delete_comment(self):
        # 1. Tạo một task giả để có id
        task_payload = {"title": "Task có bình luận", "status": "todo"}
        res_task = self.client.post('/api/v1/kanban/tasks', json=task_payload)
        task_id = json.loads(res_task.data)["task"]["id"]
        
        # 2. Thêm bình luận vào task đó
        comment_payload = {
            "text": "Đây là bình luận test",
            "author": "test_user"
        }
        res_comment = self.client.post(f'/api/v1/kanban/tasks/{task_id}/comments', json=comment_payload)
        self.assertIn(res_comment.status_code, [200, 201])
        
        # (Tùy chọn) 3. Xóa bình luận nếu hệ thống hỗ trợ API xóa comment độc lập
        if "comment" in json.loads(res_comment.data):
            comment_id = json.loads(res_comment.data)["comment"]["id"]
            res_del_comment = self.client.delete(f'/api/v1/kanban/tasks/{task_id}/comments/{comment_id}')
            # Kỳ vọng mã 200 hoặc 204 tùy thuộc vào thiết kế API của bạn
            self.assertIn(res_del_comment.status_code, [200, 204])

    def test_2_add_and_delete_comment_with_image(self):
        # 1. Tạo task giả
        task_payload = {"title": "Task có bình luận ảnh", "status": "todo"}
        res_task = self.client.post('/api/v1/kanban/tasks', json=task_payload)
        task_id = json.loads(res_task.data)["task"]["id"]
        
        # 2. Giả lập gọi API Upload ảnh
        data = {
            'file': (io.BytesIO(b"fake image data"), 'test_image.jpg')
        }
        res_upload = self.client.post('/api/v1/kanban/upload', data=data, content_type='multipart/form-data')
        self.assertEqual(res_upload.status_code, 200)
        image_url = json.loads(res_upload.data)["url"]
        filename = os.path.basename(image_url)
        file_path = os.path.join(self.uploads_dir, filename)
        self.assertTrue(os.path.exists(file_path), "File ảnh phải được lưu vào thư mục uploads")

        # 3. Tạo bình luận đính kèm đường dẫn ảnh vừa tải lên
        comment_payload = {
            "text": "Đây là bình luận có ảnh",
            "author": "test_user",
            "image": image_url
        }
        res_comment = self.client.post(f'/api/v1/kanban/tasks/{task_id}/comments', json=comment_payload)
        self.assertIn(res_comment.status_code, [200, 201])
        comment_id = json.loads(res_comment.data)["comment"]["id"]

        # 4. Xóa bình luận thông qua API
        res_del_comment = self.client.delete(f'/api/v1/kanban/tasks/{task_id}/comments/{comment_id}?actor=test_user')
        self.assertIn(res_del_comment.status_code, [200, 204])

        # 5. Kiểm tra file ảnh đã bị thu gom dọn dẹp chưa
        self.assertFalse(os.path.exists(file_path), "File ảnh phải bị xóa đi sau khi bình luận chứa nó bị xóa")