# Tài liệu Hệ thống Docupedia

Đây là tài liệu hướng dẫn và mô tả hệ thống khởi chạy ứng dụng Docupedia thông qua Docker.

## Yêu cầu hệ thống
- Đã cài đặt **Docker** và **Docker Compose**.
- Hệ điều hành Linux/macOS hoặc môi trường hỗ trợ chạy Bash shell.

## Hướng dẫn Khởi chạy

Quá trình khởi chạy và cập nhật hệ thống được tự động hóa hoàn toàn thông qua script `start_docker.sh`. 

Để chạy hệ thống, bạn cấp quyền thực thi cho script và chạy lệnh sau:

```bash
chmod +x start_docker.sh
./start_docker.sh
```

## Chi tiết các bước hoạt động của Script

Khi thực thi, script sẽ thực hiện các thao tác sau theo thứ tự:

1. **Chuẩn bị thư mục:** Tạo thư mục `docupedia_data` trên máy host (nếu chưa có) để chứa các dữ liệu được trích xuất từ container.
2. **Dọn dẹp môi trường:** Chạy `docker compose down` để dừng và gỡ bỏ các container cũ đang chạy, đảm bảo không bị xung đột tài nguyên hoặc port.
3. **Build và Chạy Container:** Thực thi `docker compose up -d --build`. Lệnh này sẽ build lại Docker image (giúp cập nhật nếu `Dockerfile` hoặc `requirements` có thay đổi) có sử dụng cache, và khởi chạy container ở chế độ ngầm (detached mode).
4. **Trích xuất file:** Tự động copy file `index.html` được build xong từ bên trong container (tên container là `telua_docupedia`, tại đường dẫn `/app/dist/index.html`) ra thư mục `docupedia_data` đã tạo ở bước 1.