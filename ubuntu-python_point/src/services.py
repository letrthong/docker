from flask import Flask, jsonify, request, send_from_directory
from utils import DIST_DIR

# Import Blueprints từ các API phân hệ
from api_config import pos_config_bp
from api_products import pos_products_bp
from api_stores import pos_stores_bp
from api_transactions import pos_transactions_bp

app = Flask(__name__, static_folder=DIST_DIR, static_url_path='')

# Đăng ký các module API
app.register_blueprint(pos_config_bp)
app.register_blueprint(pos_products_bp)
app.register_blueprint(pos_stores_bp)
app.register_blueprint(pos_transactions_bp)

# --- SPA ---
@app.route('/')
def serve_index():
    return send_from_directory(DIST_DIR, 'index.html')

# ==================== 404 fallback for SPA ====================
@app.errorhandler(404)
def fallback(e):
    return send_from_directory(DIST_DIR, 'index.html')

if __name__ == "__main__":
    # Tắt debug để tránh Werkzeug Reloader quét file liên tục gây tràn RAM
    app.run(host="0.0.0.0", port=5000, threaded=True)
