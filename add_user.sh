# Thêm user vào nhóm docker
sudo usermod -aG docker $USER

# Áp dụng thay đổi ngay lập tức
newgrp docker

# Kiểm tra (Nếu không cần sudo mà vẫn hiện danh sách là OK)
docker ps
docker run hello-world
