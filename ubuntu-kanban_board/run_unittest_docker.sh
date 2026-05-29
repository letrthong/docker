#!/bin/bash

echo "===================================================="
echo "🚀 Running unit tests inside Docker container..."
echo "===================================================="

# Cài đặt thư viện xuất report XML (chỉ chạy 1 lần/container)
# docker exec -it telua_python_kanban_board pip install unittest-xml-reporting

docker exec -w /app/src telua_python_kanban_board mkdir -p test-reports
# Thực thi unit test
docker exec -w /app/src telua_python_kanban_board sh -c 'python -m xmlrunner discover -s unittest -p "test_*.py" && mkdir -p test-reports && mv TEST-*.xml test-reports/'
# Copy file XML report từ container ra ngoài máy host
echo "===================================================="
echo "📥 Copying XML report to host machine..."
rm -rf test-reports
docker cp telua_python_kanban_board:/app/src/test-reports ./test-reports
echo "✅ Report saved to ./test-reports/results.xml"
