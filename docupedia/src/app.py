from flask import Flask, jsonify, send_from_directory, request
import os
import sys

# Add src to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import get_config
from uhes_restful_blueprint_doupedia import integrate_docupedia

# Get configuration
config = get_config()

# Create Flask app
app = Flask(__name__, static_folder="static")
frontend_dir = app.static_folder

# Register API routes
integrate_docupedia(app, url_prefix=config.API_PREFIX)


# ==========================================
# Frontend SPA Serving & Error Handlers
# ==========================================
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
    if request.path.startswith(config.API_PREFIX):
        from utils.response import error_response
        return error_response('Endpoint không tồn tại', 'NOT_FOUND', 404)
    return send_from_directory(frontend_dir, "index.html")

@app.errorhandler(500)
def server_error(e):
    from utils.response import error_response
    return error_response('Lỗi server', 'SERVER_ERROR', 500)


if __name__ == "__main__":
    print("[Flask] Initializing application...")
    
    print(f"[Flask] API available at {config.API_PREFIX}")
    print(f"[Flask] Default admin: {config.DEFAULT_ADMIN_USERNAME}/{config.DEFAULT_ADMIN_PASSWORD}")
    print("[Flask] Starting server...")
    
    app.run(
        host="0.0.0.0", 
        port=int(os.environ.get('PORT', 5000)),
        debug=os.environ.get('FLASK_DEBUG', 'true').lower() == 'true'
    )
