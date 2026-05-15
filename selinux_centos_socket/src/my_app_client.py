# my_app_client.py - Simple TCP client to connect to my_app_socket.py
import socket

HOST = '127.0.0.1'  # Server address (localhost by default)
PORT = 5000          # Must match server port

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    try:
        s.connect((HOST, PORT))
        print(f"Connected to {HOST}:{PORT}")
        data = s.recv(1024)
        print('Received from server:', data.decode().strip())
    except Exception as e:
        print(f"Failed to connect or communicate: {e}")
