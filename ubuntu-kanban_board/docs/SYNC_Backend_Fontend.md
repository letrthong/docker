# Cơ chế Đồng bộ Dữ liệu (Synchronization) Frontend - Backend

Tài liệu này mô tả chi tiết cách hệ thống Kanban Board đảm bảo dữ liệu được đồng bộ liên tục giữa nhiều người dùng cùng lúc (Concurrency) mà không làm mất dữ liệu thao tác dở dang, dựa trên kiến trúc **Vanilla JS** và **Flask JSON File-based Backend**.

---

## 1. Tổng quan (Overview)

Hệ thống không sử dụng WebSockets để duy trì kết nối liên tục nhằm tối giản việc cài đặt server. Thay vào đó, hệ thống sử dụng kết hợp 2 kỹ thuật chính:
1. **Silent Polling (Hỏi thăm ngầm):** Định kỳ kiểm tra sự thay đổi ở cấp độ file hệ thống (mtime).
2. **Fetch-Before-Write (Kiểm tra trước khi ghi):** Ngăn chặn ghi đè dữ liệu cục bộ lên dữ liệu mới của người khác.
3. **Server-side Filtering:** Tối ưu hóa API lấy danh sách, giảm tải lượng dữ liệu khi đồng bộ.

---

## 2. API Kiểm tra Thay đổi (Backend - Update Checker)

- **Endpoint:** `GET /api/v1/kanban/updates/check?projectId={id}&lastSync={timestamp}`
- **Cách hoạt động:**
  - Frontend gửi mốc thời gian đồng bộ cuối cùng (`lastSync`).
  - Backend **không đọc nội dung file JSON** (để tối ưu hiệu suất). Thay vào đó, Backend dùng lệnh `os.path.getmtime(DIR_PATH)` để kiểm tra thời gian chỉnh sửa cuối cùng của thư mục `/tasks` và file dự án hiện tại.
  - Trả về `{"changed": true, "timestamp": current_time}` nếu phát hiện có người khác vừa thay đổi dữ liệu.

---

## 3. Vòng lặp Đồng bộ tự động (Frontend - Auto-Refresh Polling)

- **Chu kỳ:** Mỗi 30 giây (`setInterval` trong `js/main.js`).
- **Silent Request:** Gọi API `checkUpdatesAPI` với option `{ silent: true }` để ẩn hoàn toàn biểu tượng Loading, không làm gián đoạn màn hình người dùng.
- **Cập nhật Giao diện:** Nếu API báo có thay đổi (`changed: true`), ứng dụng sẽ gọi lại hàm `loadTasks()` để nạp lại Bảng Kanban.

---

## 4. Lá chắn Bảo vệ Dữ liệu (Safety Mechanisms)

Việc tải lại bảng (Refresh) một cách bất ngờ có thể làm tuột thẻ công việc đang kéo thả, hoặc mất đoạn văn bản người dùng đang gõ dở. Hệ thống giải quyết việc này bằng cơ chế "Chặn" (Blockers):

1. **Khi đang kéo thả (Dragging):** 
   - Nếu biến `draggedItemId !== null`, tiến trình Refresh sẽ tự động bị bỏ qua (Return).
2. **Khi đang nhập liệu (Forms & Modals):**
   - Nếu có bất kỳ Hộp thoại Thêm/Sửa công việc nào đang mở, tiến trình Refresh sẽ bị chặn hoàn toàn.
3. **Ngoại lệ - Cập nhật Thời gian thực khi xem Chi tiết (Detail Modal):**
   - Nếu hộp thoại duy nhất đang mở là "Chi tiết công việc" (Detail Modal), tiến trình Refresh vẫn chạy.
   - Nó sẽ tải lại bình luận và lịch sử của công việc đó và chèn nối tiếp vào danh sách (Incremental DOM update) mà không làm mất nội dung đang gõ dở trong ô Nhập Bình luận.

---

## 5. Cơ chế Chống ghi đè (Anti-overwrite / Fetch-Before-Write)

Vì dữ liệu (Comments, Checklist, Description) được gom chung trong 1 file JSON duy nhất, nếu User A và User B cùng mở 1 công việc, thao tác "Lưu" của người sau có nguy cơ ghi đè và làm mất dữ liệu của người trước.

**Giải pháp:**
Trước khi thực hiện một hành động ghi (Write) vào Backend, Frontend luôn buộc phải gọi API lấy trạng thái mới nhất từ server, ghép thay đổi cục bộ vào rồi mới lưu.

**Quy trình chuẩn khi Cập nhật Checklist hoặc Description:**
1. Người dùng bấm Gửi/Check.
2. Disable nút Gửi (Tránh spam click).
3. Gọi `GET /tasks/<task_id>` lấy dữ liệu JSON mới nhất từ Backend về (Chỉ mất vài mili-giây).
4. Đổi trạng thái Checklist vào đối tượng mới lấy về.
5. Gọi `PUT /tasks/<task_id>` để lưu lại lên máy chủ.
6. Cập nhật lại giao diện.

**Lưu ý với Bình luận (Comments):**
Để tối ưu hóa và chống ghi đè triệt để khi nhiều người cùng chat, chức năng Bình luận đã được tách thành API độc lập (`POST` và `DELETE` trên `/tasks/<task_id>/comments`). Backend sẽ chịu trách nhiệm tự động cập nhật file `comments` rời và ghi thêm log vào mảng `history` của file công việc gốc mà không yêu cầu client phải gửi lại (PUT) toàn bộ dữ liệu Task.

**Lưu ý khi Đồng bộ Danh sách (Tasks):**
Thay vì tải toàn bộ công việc về Frontend, hàm `loadTasks()` giờ đây luôn gắn kèm `projectId` và `sprintId` vào URL (`GET /tasks?projectId=...&sprintId=...`). Backend sẽ chủ động bỏ qua (skip) việc đọc các tệp công việc không khớp điều kiện để trả về mảng dữ liệu siêu nhỏ. Nhờ vậy, vòng lặp Auto-Refresh 30s diễn ra cực kỳ nhanh chóng và không làm treo hay ngốn RAM trình duyệt!

---

## 6. Hướng nâng cấp trong tương lai (Future Roadmap)

Khi ứng dụng vượt quá quy mô hàng trăm người dùng hoạt động đồng thời:

1. **Chuyển sang WebSockets:** Thay thế Polling 30 giây bằng Push Notifications thông qua thư viện `Flask-SocketIO` để thẻ Kanban có thể "nhảy" theo thời gian thực giữa các trình duyệt.
2. **Database Thực thụ:** Chuyển đổi từ File JSON sang PostgreSQL/MongoDB kết hợp cơ chế khóa bản ghi (Row-level Locking) ở Backend để giải quyết triệt để các rủi ro Race Conditions khi lưu file.
3. **API Upload Hình Ảnh Độc lập:** Ngừng việc lưu hình ảnh bằng chuỗi Base64 trong tệp JSON để tránh làm tệp JSON phình to. Cần tách việc tải hình ảnh thành một API riêng và chỉ lưu URL vào JSON.