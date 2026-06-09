from flask import Flask, send_from_directory
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

# Register API routes
app.register_blueprint(docupedia_bp, url_prefix=config.API_PREFIX)

# --- FRONTEND PROXY ROUTES ---

@app.route("/")
def index():
    # Gọi hàm khởi tạo dữ liệu mỗi khi người dùng tải trang chủ
    init_docupedia_db()

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
