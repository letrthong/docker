#!/bin/bash

echo "===================================================="
echo "🚀 Running unit tests inside Docker container..."
echo "===================================================="
docker exec -it -w /app/src telua_python_kanban_board python unittest/test_app.py