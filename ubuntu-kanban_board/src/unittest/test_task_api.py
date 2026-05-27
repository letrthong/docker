import unittest
import json
import os
import tempfile
import shutil
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import uhes_restful_blueprint_kanban

class TaskApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.test_dir = tempfile.mkdtemp()
        cls.tasks_dir = os.path.join(cls.test_dir, 'tasks')
        os.makedirs(cls.tasks_dir, exist_ok=True)
        
        uhes_restful_blueprint_kanban.TASKS_DIR = cls.tasks_dir
        
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