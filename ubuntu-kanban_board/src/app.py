from flask import Flask, send_from_directory, request
import os
from uhes_restful_blueprint_kanban import kanban_api, init_kanban_db

app = Flask(__name__, static_folder="static")

# Gọi hàm khởi tạo dữ liệu từ blueprint
init_kanban_db()

# Đăng ký blueprint với tiền tố /api/v1/kanban
app.register_blueprint(kanban_api, url_prefix='/api/v1/kanban')

# --- MIDDLEWARE ---

# @app.before_request
# def log_request():
#     print(f"[Flask] {request.method} {request.path}")

# --- FRONTEND PROXY ROUTES ---

@app.route("/")
def index():
    index_path = os.path.join(app.static_folder, "index.html")
    if not os.path.exists(index_path):
        print(f"[Flask][ERROR] index.html not found at {index_path}")
    return send_from_directory(app.static_folder, "index.html")

# @app.route("/<path:path>")
# def static_proxy(path):
#     file_path = os.path.join(app.static_folder, path)
#     if not os.path.exists(file_path):
#         print(f"[Flask][ERROR] File not found: {file_path}")
#     return send_from_directory(app.static_folder, path)

if __name__ == "__main__":
    print("[Flask] Starting server...")
    app.run(host="0.0.0.0", debug=True)
