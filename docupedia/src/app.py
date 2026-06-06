from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
import os
import sys

# Add src to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import get_config
from uhes_restful_blueprint_doupedia import integrate_docupedia
from services.auth_service import init_default_admin

# Get configuration
config = get_config()

# Create Flask app
app = Flask(__name__, static_folder="static")
app.config['SECRET_KEY'] = config.JWT_SECRET_KEY

# Enable CORS
CORS(app, origins=config.CORS_ORIGINS, supports_credentials=True)

# Register API routes
integrate_docupedia(app, url_prefix=config.API_PREFIX)

# ===== Static File Serving =====

@app.route("/")
def index():
    """Serve main index.html"""
    index_path = os.path.join(app.static_folder, "index.html")
    if not os.path.exists(index_path):
        print(f"[Flask][ERROR] index.html not found at {index_path}")
        return jsonify({'error': 'Frontend not built'}), 404
    return send_from_directory(app.static_folder, "index.html")


@app.route('/<path:path>')
def static_proxy(path):
    """Serve static files (js, css, assets...)"""
    file_path = os.path.join(app.static_folder, path)
    if os.path.exists(file_path):
        return send_from_directory(app.static_folder, path)
    # SPA fallback - return index.html for non-file routes
    return send_from_directory(app.static_folder, "index.html")


# ===== Error Handlers =====

@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors"""
    if request.path.startswith(config.API_PREFIX):
        return jsonify({
            'success': False,
            'error': {'code': 'NOT_FOUND', 'message': 'Endpoint không tồn tại'}
        }), 404
    # SPA fallback
    return send_from_directory(app.static_folder, "index.html")


@app.errorhandler(500)
def server_error(e):
    """Handle 500 errors"""
    return jsonify({
        'success': False,
        'error': {'code': 'SERVER_ERROR', 'message': 'Lỗi server'}
    }), 500


# ===== Health Check =====

@app.route(f'{config.API_PREFIX}/health', methods=['GET'])
def health_check():
    """GET /api/v1/health - Health check endpoint"""
    return jsonify({
        'success': True,
        'data': {'status': 'ok', 'version': '1.0.0'}
    })


if __name__ == "__main__":
    print("[Flask] Initializing application...")
    
    # Initialize default admin user
    init_default_admin()
    
    print(f"[Flask] API available at {config.API_PREFIX}")
    print(f"[Flask] Default admin: {config.DEFAULT_ADMIN_USERNAME}/{config.DEFAULT_ADMIN_PASSWORD}")
    print("[Flask] Starting server...")
    
    app.run(
        host="0.0.0.0", 
        port=int(os.environ.get('PORT', 5000)),
        debug=os.environ.get('FLASK_DEBUG', 'true').lower() == 'true'
    )
