from flask import Flask

app = Flask(__name__)

@app.route('/')
def home():
    """Trang chủ của Telua Fan Page."""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Telua Fan Page</title>
        <style>
            body { font-family: sans-serif; text-align: center; padding: 50px; background-color: #f0f8ff; }
            h1 { color: #007bff; }
            p { font-size: 1.2em; color: #333; }
            .footer { margin-top: 50px; font-size: 0.8em; color: #777; }
        </style>
    </head>
    <body>
        <h1>Chào mừng đến với Telua Fan Page!</h1>
        <p>Nơi chia sẻ niềm đam mê về Telua.</p>
        <div class="footer">&copy; 2024 Telua Community</div>
    </body>
    </html>
    """

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
