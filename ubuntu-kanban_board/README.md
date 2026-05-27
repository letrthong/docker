# Bảng Kanban (Kanban Board)

Ứng dụng quản lý công việc (Kanban Board) cơ bản sử dụng Vanilla JS (Frontend) và Python Flask (Backend) với cơ sở dữ liệu lưu trữ dưới dạng file JSON.

## Tính năng chính

- **Quản lý Công việc (Tasks):** Thêm, sửa, xóa, kéo thả công việc giữa các cột trạng thái. Hỗ trợ mô tả phong phú (Rich text), checklist, độ ưu tiên (Priority), Story Points, bình luận, và lịch sử hoạt động.
- **Quản lý Dự án & Sprint:** Tạo dự án, phân công thành viên vào dự án, lên kế hoạch các đợt chạy nước rút (sprints).
- **Phân quyền (Role-Based Access Control):** Hỗ trợ chi tiết các nhóm quyền: Owner, Create, Edit, View.
- **Đồng bộ:** Cơ chế Auto-refresh và Anti-overwrite an toàn, giúp nhiều người dùng có thể tương tác đồng thời.
- **Giao diện & Tùy chỉnh (UI/UX):** Hỗ trợ Dark Mode (Chế độ tối), cho phép ẩn/hiện thanh công cụ lọc để tối ưu không gian trên Mobile, tự động lưu trạng thái vào trình duyệt (`localStorage`). Bộ lọc mặc định hiển thị "Việc của tôi".

## Cài đặt và Khởi chạy

Dự án được cấu hình sẵn để chạy dễ dàng bằng Docker.

```bash
# Cấp quyền thực thi cho script
chmod +x start_docker.sh

# Chạy script để khởi động Docker và tạo các thư mục cấu hình
./start_docker.sh
```

Sau khi chạy thành công, truy cập giao diện tại: `http://localhost:5000`

## Tài liệu (Documentation)

Các tài liệu phân tích kỹ thuật và định nghĩa API được đặt trong thư mục `docs/`:

- Tài liệu API (RESTful APIs)
- Cơ chế Đồng bộ Dữ liệu
- Phân tích Kiến trúc Hệ thống
- Hướng dẫn Simulator Docker
- Hướng dẫn và Kịch bản Kiểm thử (Unit Tests)

---

## Ghi chú khác (Notes)

### sprints trong dự án
1 dụ án sẽ có nhiều sprints và lúc tạo task lựa chọn multiselect sprints do thực tế 1 task có thể làm trong nhiều sprints


docker cp -fv telua_python_point:/app/dist/index.html ./dist/index.html


js/components: Chứa các component nhỏ, tái sử dụng được (nút, modal, form, card, ...).
js/pages: Chứa các component cấp trang (mỗi file đại diện cho một trang lớn, ví dụ: KanbanBoard.jsx, LoginPage.jsx).

# Cài đặt Jest cho unit test

###  Detail
- Assignee
- Priority
- Status
- Sprint
- Description
- Tags
- Notes
- Block reason
-  Story Points
-  Project Scope: 
### IBM  Jira

README.md
ARCHITECTURE.md
CONTRIBUTING.md
API.md
WORKFLOW.md
TASK_MODEL.md

https://www.ibm.com/docs/en/engineering-lifecycle-management-suite/workflow-management/7.3.0_beta?topic=boards-viewing-work-items-kanban-board
