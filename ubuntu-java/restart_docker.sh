# remove the rest containers if have
docker compose down

# Đảm bảo xóa container cũ nếu lệnh down chưa xử lý hết hoặc container được tạo thủ công
docker rm -f ubuntu_java 2>/dev/null || true
 

# start up containers from all images
docker compose up
 
