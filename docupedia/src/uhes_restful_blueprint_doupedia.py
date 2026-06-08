import os
import sys
from flask import Blueprint, jsonify, request

# Đảm bảo thư mục src của Docupedia nằm trong sys.path để các imports bên dưới hoạt động đúng
DOCUPEDIA_SRC_DIR = os.path.dirname(os.path.abspath(__file__))
if DOCUPEDIA_SRC_DIR not in sys.path:
    sys.path.insert(0, DOCUPEDIA_SRC_DIR)

from config import get_config
from services.auth_service import init_default_admin
from utils.response import error_response

# Khởi tạo Blueprint cha (Unified Blueprint) chứa toàn bộ API
docupedia_bp = Blueprint('docupedia_restful', __name__)

# Thêm Health Check endpoint trực tiếp vào Blueprint
@docupedia_bp.route('/health', methods=['GET'])
def health_check():
    """GET /health - Health check endpoint"""
    return jsonify({
        'success': True,
        'data': {'status': 'ok', 'version': '1.0.0'}
    })

def get_docupedia_blueprint():
    """
    Khởi tạo và trả về Blueprint chứa toàn bộ RESTful API của Docupedia.
    """
    # 1. Luôn đảm bảo data default (admin) được khởi tạo
    print("[Docupedia] Initializing default data and admin user...")
    init_default_admin()
    
    # 2. Bắt buộc import các file route handlers để logic được đính kèm vào các blueprints
    from routes import auth, users, projects, permissions, documents, folders, tree
    
    # 3. Lấy các instance của blueprints con đã được khởi tạo sẵn
    from routes import (
        auth_bp, users_bp, projects_bp, permissions_bp,
        documents_bp, folders_bp, tree_bp
    )
    
    # 4. Gắn (nest) các blueprints con vào Blueprint cha
    docupedia_bp.register_blueprint(auth_bp, url_prefix='/auth')
    docupedia_bp.register_blueprint(users_bp, url_prefix='/users')
    docupedia_bp.register_blueprint(projects_bp, url_prefix='/projects')
    docupedia_bp.register_blueprint(permissions_bp, url_prefix='/projects')
    docupedia_bp.register_blueprint(documents_bp, url_prefix='/projects')
    docupedia_bp.register_blueprint(folders_bp, url_prefix='/projects')
    docupedia_bp.register_blueprint(tree_bp, url_prefix='/projects')
    
    return docupedia_bp

def integrate_docupedia(app, url_prefix=None):
    """
    Hàm tiện ích giúp tích hợp nhanh toàn bộ Docupedia vào Flask app khác.
    
    Cách dùng trong app.py mới:
        from uhes_restful_blueprint_doupedia import integrate_docupedia
        integrate_docupedia(app, url_prefix='/api/v1')
    """
    config = get_config()
    app.config['SECRET_KEY'] = config.JWT_SECRET_KEY
    
    if url_prefix is None:
        url_prefix = config.API_PREFIX
    
    # Enable CORS bằng middleware native của Flask
    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get('Origin')
        allowed_origins = config.CORS_ORIGINS
        if isinstance(allowed_origins, str):
            allowed_origins = [allowed_origins]
            
        if origin and (origin in allowed_origins or '*' in allowed_origins):
            response.headers['Access-Control-Allow-Origin'] = origin
        elif '*' in allowed_origins:
            response.headers['Access-Control-Allow-Origin'] = '*'
            
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept, Origin'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
        return response

    # Lấy blueprint tổng và register vào app
    bp = get_docupedia_blueprint()
    app.register_blueprint(bp, url_prefix=url_prefix)
    
    print(f"[Docupedia] Đã tích hợp thành công Docupedia API tại prefix: {url_prefix}")

    return app