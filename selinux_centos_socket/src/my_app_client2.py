# my_app_client2.py - Another TCP client for testing SELinux policy
import socket

HOST = '127.0.0.1'
PORT = 5000

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    try:
        s.connect((HOST, PORT))
        print(f"Connected to {HOST}:{PORT}")
        data = s.recv(1024)
        print('Received from server:', data.decode().strip())
    except Exception as e:
        print(f"Failed to connect or communicate: {e}")
