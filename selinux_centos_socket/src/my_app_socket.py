# my_app_socket.py - Simple TCP server that logs connections
import socket

HOST = '0.0.0.0'  # Listen on all interfaces
PORT = 5000        # Arbitrary non-privileged port
LOG_PATH = '/tmp/my_app_socket.log'

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
    s.bind((HOST, PORT))
    s.listen()
    print(f"Listening on {HOST}:{PORT} ...")
    while True:
        conn, addr = s.accept()
        with conn:
            print(f"Connected by {addr}")
            try:
                with open(LOG_PATH, 'a') as f:
                    f.write(f"Connection from {addr}\n")
                conn.sendall(b'Logged your connection!\n')
            except Exception as e:
                print(f"Failed to write log: {e}")
                conn.sendall(b'Failed to log your connection!\n')
