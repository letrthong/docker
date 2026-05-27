# Hướng dẫn và Kịch bản Kiểm thử (Unit Tests)

Tài liệu này mô tả kịch bản kiểm thử tự động (Unit Tests) cho Backend API của hệ thống Kanban Board sử dụng module `unittest` của Python.

## Cài đặt và Khởi chạy Kiểm thử

Để chạy các test cases, bạn cần mở Terminal, di chuyển vào thư mục `src` và thực thi script test:

```bash
cd src
python -m unittest discover -s unittest -p "test_*.py"
```

*Lưu ý:* Các dữ liệu kiểm thử được sinh ra trong một thư mục tạm thời của hệ điều hành (tempfile) và sẽ được tự động dọn dẹp sau khi kiểm thử kết thúc. Điều này đảm bảo quá trình test không bao giờ làm hỏng hay ghi đè lên dữ liệu thật của ứng dụng.

## Các Kịch bản Kiểm thử (Test Cases)

Hiện tại, hệ thống hỗ trợ các kịch bản kiểm thử chính yếu sau:

### 1. Quản lý Người dùng (User Management)
- **Thêm Người dùng (Add User):** Gửi yêu cầu `POST /api/v1/kanban/users` với payload giả lập, xác nhận trả về mã trạng thái HTTP `201 Created` và thông điệp thành công. Hệ thống đồng thời cấp phát một `useruid` hợp lệ.
- **Cập nhật Người dùng (Edit User):** Gửi yêu cầu `PUT /api/v1/kanban/users/<useruid>` để chỉnh sửa quyền (`permission`) và trạng thái khóa tài khoản (`disabled`). Đảm bảo kết quả trả về `200 OK` và lưu lại thông tin sửa đổi thành công.

### 2. Quản lý Công việc (Task Management)
- **Thêm Công việc mới (Add Task):** Sử dụng `POST /api/v1/kanban/tasks` để tạo mới một task. Xác minh mã trạng thái `201 Created` và kiểm tra lại bằng API `GET /api/v1/kanban/tasks/<task_id>` xem thông tin có thực sự được lưu hay không (`200 OK`).
- **Xóa Công việc (Delete Task):** Dùng phương thức `DELETE /api/v1/kanban/tasks/<task_id>` để xóa một công việc hiện có. Đảm bảo thao tác này trả về `200 OK`. Sau đó, gọi lại lệnh GET và đảm bảo hệ thống trả về mã lỗi `404 Not Found` (tức là file JSON đã hoàn toàn bị loại bỏ khỏi máy chủ).

*Tài liệu này sẽ tiếp tục được cập nhật khi hệ thống có thêm nhiều kịch bản test mới (Project, Uploads, Auth,...).*