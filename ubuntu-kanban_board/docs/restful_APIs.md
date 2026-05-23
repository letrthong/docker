# Bảng Kanban - RESTful API Documentation

Tài liệu này định nghĩa các Interface (API) cần được triển khai trên backend Python Flask (`src/app.py`) để giao tiếp với Frontend.

## Base URL
Tất cả các API endpoints sẽ bắt đầu với: `http://localhost:5000/api/v1/kanban`

---

## 1. User API (Quản lý Người dùng)

### 1.1 Lấy thông tin người dùng hiện tại
- **URL:** `/users/me`
- **Method:** `GET`
- **Mô tả:** Trả về thông tin cá nhân và quyền hạn (permissions) của phiên đăng nhập hiện tại.
- **Success Response (200 OK):**
  ```json
  {
    "useruid": "101",
    "username": "alice",
    "permission": "create" 
  }
  ```
  *(Lưu ý: `permission` có thể là `view`, `owner`, `edit`, `create`)*

### 1.2 Lấy danh sách toàn bộ người dùng
- **URL:** `/users`
- **Method:** `GET`
- **Mô tả:** Trả về danh sách tất cả người dùng để hiển thị trong Dropdown phân công (Assignee) và bộ lọc (Filter).
- **Success Response (200 OK):**
  ```json
  [
    {"useruid": "101", "username": "alice"},
    {"useruid": "102", "username": "bob"},
    {"useruid": "103", "username": "charlie"}
  ]
  ```

---

## 2. Task API (Quản lý Công việc)

### Cấu trúc (Schema) của một Task Model:
```json
{
  "id": "string (UUID)",
  "title": "string",
  "assignee": "string (username)",
  "sprintIds": ["string (sprint_id 1)", "string (sprint_id 2)"],
  "items": [
    {"text": "string", "completed": "boolean"}
  ],
  "status": "string (todo, in-progress, blocked, review, done)",
  "createdAt": "string (ISO 8601 Datetime)",
  "completedAt": "string (ISO 8601 Datetime) hoặc null",
  "locked": "boolean",
  "ownerId": "string (username)"
}
```

### 2.1 Lấy toàn bộ danh sách công việc
- **URL:** `/tasks` (Hỗ trợ query parameters: `?view=summary`, `?projectId=...`, `?sprintId=...`)
- **Method:** `GET`
- **Mô tả:** Lấy danh sách toàn bộ công việc để render lên Kanban Board. Hỗ trợ Server-side Filtering để tối ưu tốc độ tải.
- **Success Response (200 OK):** Trả về mảng (array) chứa các Task Objects.

### 2.2 Tạo công việc mới
- **URL:** `/tasks`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Body Payload:** Trực tiếp gửi lên một Task Object.
- **Success Response (201 Created):** 
  ```json
  { "message": "Task created successfully", "task": { /* Task Object */ } }
  ```

### 2.3 Cập nhật công việc (Trạng thái, Assignee, Checklist, Title)
- **URL:** `/tasks/<task_id>`
- **Method:** `PUT` (hoặc `PATCH`)
- **Headers:** `Content-Type: application/json`
- **Body Payload:** Các trường (fields) cần cập nhật.
- **Success Response (200 OK):**
  ```json
  { "message": "Task updated successfully" }
  ```

### 2.4 Xóa công việc
- **URL:** `/tasks/<task_id>`
- **Method:** `DELETE`
- **Success Response (200 OK):**
  ```json
  { "message": "Task deleted successfully" }
  ```