import os
import sys
from flask import Blueprint, request, jsonify, send_from_directory
from flask_cors import CORS

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

def integrate_docupedia(app, url_prefix='/api/docupedia', serve_frontend=False, static_folder=None):
    """
    Hàm tiện ích giúp tích hợp nhanh toàn bộ Docupedia vào Flask app khác.
    
    Cách dùng trong app.py mới:
        from uhes_restful_blueprint_doupedia import integrate_docupedia
        integrate_docupedia(app, url_prefix='/api/v1')
    """
    config = get_config()
    app.config['SECRET_KEY'] = config.JWT_SECRET_KEY
    
    # Enable CORS
    CORS(app, origins=config.CORS_ORIGINS, supports_credentials=True)

    # Lấy blueprint tổng và register vào app
    bp = get_docupedia_blueprint()
    app.register_blueprint(bp, url_prefix=url_prefix)
    
    print(f"[Docupedia] Đã tích hợp thành công Docupedia API tại prefix: {url_prefix}")

    if serve_frontend:
        _setup_frontend_and_errors(app, url_prefix, static_folder)
    
    return app

def _setup_frontend_and_errors(app, api_prefix, static_folder=None):
    """Cấu hình phục vụ giao diện React (SPA) và Error Handlers cho app"""
    
    frontend_dir = static_folder if static_folder else app.static_folder
    
    @app.route("/")
    def index():
        index_path = os.path.join(frontend_dir, "index.html")
        if not os.path.exists(index_path):
            print(f"[Flask][ERROR] index.html not found at {index_path}")
            return jsonify({'error': 'Frontend not built'}), 404
        return send_from_directory(frontend_dir, "index.html")

    @app.route('/<path:path>')
    def static_proxy(path):
        file_path = os.path.join(frontend_dir, path)
        if os.path.exists(file_path):
            return send_from_directory(frontend_dir, path)
        return send_from_directory(frontend_dir, "index.html")

    @app.errorhandler(404)
    def not_found(e):
        if request.path.startswith(api_prefix):
            from utils.response import error_response
            return error_response('Endpoint không tồn tại', 'NOT_FOUND', 404)
        return send_from_directory(frontend_dir, "index.html")

    @app.errorhandler(500)
    def server_error(e):
        from utils.response import error_response
        return error_response('Lỗi server', 'SERVER_ERROR', 500)
        
    print("[Docupedia] Đã cấu hình phục vụ giao diện React (SPA) và Error Handlers.")