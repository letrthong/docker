from flask import Flask, send_from_directory, request
import os
 
app = Flask(__name__, static_folder="static")
 

@app.route("/")
def index():
   
    index_path = os.path.join(app.static_folder, "index.html")
    if not os.path.exists(index_path):
        print(f"[Flask][ERROR] index.html not found at {index_path}")
    return send_from_directory(app.static_folder, "index.html")
 
@app.route('/<path:path>')
def static_proxy(path):
    # Phục vụ các file tĩnh (js, css, assets...)
    return send_from_directory(app.static_folder, path)

if __name__ == "__main__":
    print("[Flask] Starting server...")
    app.run(host="0.0.0.0", debug=True)
