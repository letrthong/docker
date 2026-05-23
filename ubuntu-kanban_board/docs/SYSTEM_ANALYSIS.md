# Phân tích Kiến trúc và Hệ thống Bảng Kanban (Kanban Board)

Tài liệu này cung cấp một cái nhìn tổng quan, phân tích sâu về kiến trúc hiện tại của hệ thống, đánh giá ưu/nhược điểm và vạch ra lộ trình nâng cấp (Roadmap) trong tương lai.

---

## 1. Tổng quan Kiến trúc (Architecture Overview)

- **Mô hình:** Client - Server API-based.
- **Frontend:** Vanilla JavaScript (ES6 Modules), HTML5, Tailwind CSS (qua CDN), FontAwesome, Quill JS.
- **Backend:** Python Flask (Cung cấp RESTful API).
- **Database:** File-based JSON (Lưu trữ dữ liệu dạng tệp văn bản `.json`).
- **Deployment:** Docker & Docker Compose.

---

## 2. Phân tích Frontend

### Điểm mạnh:
- **Kiến trúc Module hóa (Modular Design):** Mặc dù sử dụng Vanilla JS, mã nguồn được chia nhỏ rất khoa học thành các file `main.js`, `api.js`, `ui.js`, `task.js`, `user.js`. Giúp dễ bảo trì và mở rộng.
- **UI/UX hiện đại:** Sử dụng Tailwind CSS mang lại giao diện nhất quán, responsive tốt. Tích hợp các hiệu ứng (Micro-interactions) như Spinner loading trên từng thẻ, Modal, Toast Message.
- **Quản lý State & DOM:** Áp dụng kỹ thuật cập nhật DOM tăng dần (Incremental DOM) cho bình luận/lịch sử để chống giật/chớp màn hình.
- **Tối ưu hóa tài nguyên:** Tích hợp nén ảnh WebP (Client-side) và giới hạn độ phân giải (Max 1200px) trước khi chèn vào Quill Editor, giúp giảm thiểu đáng kể băng thông mạng.

### Điểm hạn chế:
- Code thao tác DOM thủ công (như `document.createElement`) khá dài dòng.
- Sử dụng Tailwind qua CDN không tối ưu cho môi trường Production (tốn thời gian biên dịch trên trình duyệt của người dùng cuối).

---

## 3. Phân tích Backend & Database

### Điểm mạnh:
- **Nhẹ và Cơ động:** Việc sử dụng Flask kết hợp lưu tệp JSON (File-based DB) loại bỏ hoàn toàn sự phức tạp của việc cài đặt và cấu hình các Database Engine (MySQL, MongoDB). Ứng dụng có thể chạy ngay lập tức trên mọi môi trường Docker.
- **Bảo mật:** Sử dụng JWT Token có thời hạn để xác thực. Mật khẩu được mã hóa an toàn bằng `werkzeug.security` (PBKDF2/Scrypt).
- **Lọc dữ liệu API hiệu quả:** Backend hỗ trợ query parameter (`?view=summary`, `?projectId=...`) để chỉ trả về đúng lượng dữ liệu cần thiết (Lazy Loading), giúp tăng tốc độ tải trang lên nhiều lần.

### Điểm hạn chế:
- **File-based Database Limits:** Không hỗ trợ ACID, không khóa bản ghi (Row-level lock). Có nguy cơ xảy ra Race Condition nếu có cấu hình multi-threading (Gunicorn/uWSGI) khi ghi đè tệp tin JSON cùng một mili-giây.
- **Lưu trữ Base64:** Việc lưu trữ hình ảnh Base64 lồng chung với dữ liệu JSON của Task làm cho tệp JSON phình to, giảm tốc độ đọc/ghi từ ổ cứng.

---

## 4. Cơ chế Đồng bộ (Synchronization)

Hiện tại hệ thống đang sử dụng cơ chế **Polling 30s** kết hợp với **Fetch-Before-Write (Chống ghi đè)**. 
*(Chi tiết xem thêm tại tệp `SYNC_Backend_Fontend.md`)*

- **Ưu điểm:** Khá an toàn, chi phí triển khai server thấp, bảo vệ tốt dữ liệu người dùng đang nhập dở.
- **Nhược điểm:** Vẫn có độ trễ tối đa 30 giây đối với các thiết bị khác khi có cập nhật, không phải Real-time thuần túy.

---

## 5. Lộ trình Nâng cấp Đề xuất (Future Roadmap)

Để nâng tầm ứng dụng từ mức "Dùng cho nhóm nhỏ" lên mức "Enterprise/SaaS", dự án nên cân nhắc các bước sau:

### Giai đoạn 1: Tối ưu Lưu trữ (Storage Optimization)
1. **Tách biệt File Uploads:** Xây dựng API `/api/v1/kanban/upload` bằng Flask. Frontend sẽ gửi ảnh dưới dạng `FormData`, Backend lưu thành file tĩnh (vd: `.webp`, `.png`) và trả về URL. Quill Editor sẽ chỉ lưu chuỗi URL ngắn thay vì nguyên cục Base64.
2. **Build Frontend:** Chuyển sang sử dụng `Vite` hoặc `Webpack` để biên dịch (build) Tailwind CSS thành một file `.css` tĩnh siêu nhẹ thay vì dùng script CDN.

### Giai đoạn 2: Tối ưu Đồng bộ (Real-time Sync)
1. **Tích hợp WebSockets:** Thay thế cơ chế `setInterval` (Polling) bằng `Flask-SocketIO`. Server sẽ chủ động gửi tín hiệu "Push" tới tất cả các clients ngay khoảnh khắc một thẻ (Task) bị kéo thả hoặc có người vừa bấm bình luận.

### Giai đoạn 3: Tối ưu Kiến trúc (Scale up)
1. **Chuyển đổi sang React/Vue/Svelte:** Di chuyển các module UI thuần túy (`main.js`, `ui.js`) sang các framework Component-based (VD: `KanbanApp.jsx`) để dễ dàng quản lý State phức tạp hơn, cũng như loại bỏ các hàm tạo DOM thủ công.
2. **Chuyển đổi Database:** Thay thế thư mục JSON bằng MongoDB hoặc PostgreSQL (thông qua SQLAlchemy) để tận dụng các chỉ mục (Indexes), khả năng tìm kiếm Full-text search và đảm bảo tính toàn vẹn dữ liệu (Transactions).