#!/bin/bash

echo "===================================================="
echo "🚀 Running unit tests inside Docker container..."
echo "===================================================="

# Cài đặt thư viện xuất report XML (chỉ chạy 1 lần/container)
docker exec -it telua_python_kanban_board pip install unittest-xml-reporting -q

# Thực thi unit test
docker exec -it -w /app/src telua_python_kanban_board python unittest/test_app.py

# Copy file XML report từ container ra ngoài máy host
echo "===================================================="
echo "📥 Copying XML report to host machine..."
mkdir -p test-reports
docker cp telua_python_kanban_board:/app/src/test-reports/ .
echo "✅ Report saved to ./test-reports/"