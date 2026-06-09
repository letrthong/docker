from flask import Flask, send_from_directory, request
import os
import sys

# Add src to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config_doupedia import get_config_doupedia
from uhes_restful_blueprint_doupedia import docupedia_bp, init_docupedia_db

# Get configuration
config = get_config_doupedia()

# Create Flask app
app = Flask(__name__, static_folder="static")
app.config['SECRET_KEY'] = config.JWT_SECRET_KEY

# Khởi tạo dữ liệu và tài khoản Admin ngay lập tức để đảm bảo luôn tồn tại
init_docupedia_db()

# Register API routes
app.register_blueprint(docupedia_bp, url_prefix=config.API_PREFIX)

# --- MIDDLEWARE & ERROR HANDLERS ---

@app.after_request
def add_cors_headers(response):
    origin = request.headers.get('Origin')
    if origin:
        response.headers['Access-Control-Allow-Origin'] = origin
    else:
        response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept, Origin'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
    return response

@app.errorhandler(404)
def not_found(e):
    if request.path.startswith(config.API_PREFIX):
        from utils.response import error_response
        return error_response('Endpoint không tồn tại', 'NOT_FOUND', 404)
    return send_from_directory(app.static_folder, "index.html")

# --- FRONTEND PROXY ROUTES ---

@app.route("/")
def index():
    index_path = os.path.join(app.static_folder, "index.html")
    if not os.path.exists(index_path):
        print(f"[Flask][ERROR] index.html not found at {index_path}")

    return send_from_directory(app.static_folder, "index.html")

@app.route("/<path:path>")
def static_proxy(path):
    """Phục vụ file tĩnh (JS, CSS, hình ảnh) hoặc fallback về index.html cho React Router"""
    file_path = os.path.join(app.static_folder, path)
    if os.path.exists(file_path):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")

if __name__ == "__main__":
    print("[Flask] Initializing application...")
    
    print(f"[Flask] API available at {config.API_PREFIX}")
    print(f"[Flask] Default admin: {config.DEFAULT_ADMIN_USERNAME}/{config.DEFAULT_ADMIN_PASSWORD}")
    print("[Flask] Starting server...")
    
    app.run(host="0.0.0.0", debug=True)
