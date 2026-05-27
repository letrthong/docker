import unittest
import json
import os
import tempfile
import shutil
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import uhes_restful_blueprint_kanban

class ProjectApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.test_dir = tempfile.mkdtemp()
        cls.projects_dir = os.path.join(cls.test_dir, 'projects')
        os.makedirs(cls.projects_dir, exist_ok=True)
        
        uhes_restful_blueprint_kanban.PROJECTS_DIR = cls.projects_dir
        
        from app import app
        app.config['TESTING'] = True
        cls.app = app
        cls.client = cls.app.test_client()

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.test_dir)

    def test_1_add_edit_delete_project(self):
        project_payload = {"name": "Test Project", "users": []}
        
        # Tạo
        res_post = self.client.post('/api/v1/kanban/projects', json=project_payload)
        self.assertEqual(res_post.status_code, 201)
        project_id = json.loads(res_post.data)["project"]["id"]
        
        # Sửa
        res_put = self.client.put(f'/api/v1/kanban/projects/{project_id}', json={"name": "Test Project Updated"})
        self.assertEqual(res_put.status_code, 200)
        
        # Xóa (Soft Delete)
        res_del = self.client.delete(f'/api/v1/kanban/projects/{project_id}')
        self.assertEqual(res_del.status_code, 200)
        
        # Kiểm tra danh sách hiển thị
        res_get = self.client.get('/api/v1/kanban/projects')
        self.assertFalse(any(p['id'] == project_id for p in json.loads(res_get.data)))
        
        res_get_deleted = self.client.get('/api/v1/kanban/projects?status=deleted')
        self.assertTrue(any(p['id'] == project_id for p in json.loads(res_get_deleted.data)))