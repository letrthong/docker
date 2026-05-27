import unittest
import json
import os
import tempfile
import shutil
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import uhes_restful_blueprint_kanban
import uhes_restful_blueprint_user

class UserApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.test_dir = tempfile.mkdtemp()
        cls.users_dir = os.path.join(cls.test_dir, 'users')
        os.makedirs(cls.users_dir, exist_ok=True)
        
        uhes_restful_blueprint_kanban.USERS_DIR = cls.users_dir
        uhes_restful_blueprint_user.USERS_DIR = cls.users_dir
        
        from app import app
        app.config['TESTING'] = True
        cls.app = app
        cls.client = cls.app.test_client()

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.test_dir)

    def test_1_add_and_edit_user(self):
        payload = {
            "username": "testuser_api",
            "password": "password123",
            "permission": "view"
        }
        res_post = self.client.post('/api/v1/kanban/users', json=payload)
        self.assertEqual(res_post.status_code, 201)
        data_post = json.loads(res_post.data)
        useruid = data_post["user"]["useruid"]
        
        update_payload = {
            "disabled": True,
            "permission": "edit"
        }
        res_put = self.client.put(f'/api/v1/kanban/users/{useruid}', json=update_payload)
        self.assertEqual(res_put.status_code, 200)
        self.assertTrue(json.loads(res_put.data)["user"]["disabled"])

    def test_2_duplicate_username(self):
        payload = {
            "username": "duplicate_user",
            "password": "123",
            "permission": "view"
        }
        self.client.post('/api/v1/kanban/users', json=payload)
        res_duplicate = self.client.post('/api/v1/kanban/users', json=payload)
        self.assertNotEqual(res_duplicate.status_code, 201, "API không được phép tạo 2 user trùng username")