from flask import Flask
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

# Register API routes and Frontend Serving
integrate_docupedia(app, url_prefix=config.API_PREFIX, serve_frontend=True)


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
