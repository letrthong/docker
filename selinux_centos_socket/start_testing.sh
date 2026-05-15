#!/bin/bash

# python3 /app/src/my_app.py
python3 /app/src/my_app_socket.py

# python3 /app/src/my_app_client.py
# python3 /app/src/my_app_reader.py
echo "Container will keep running so you can exec into it. Press Ctrl+C to exit if running directly."
tail -f /dev/null 