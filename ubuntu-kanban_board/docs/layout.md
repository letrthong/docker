# Kiến trúc Giao diện và Layout (UI/UX Design)

Tài liệu này ghi chú lại các quyết định thiết kế về mặt giao diện, cách phân bổ không gian (Layout) và các chiến lược tối ưu hiển thị trên mọi thiết bị (Responsive Design) của ứng dụng Kanban Board.

---

## 1. Cấu trúc Bố cục chung (General Layout)
Giao diện chính được chia thành 3 phần rõ rệt từ trên xuống dưới nhằm tối ưu hóa tầm nhìn của người dùng:

- **Header (Thanh công cụ trên cùng):**
  - Tiêu đề ứng dụng (Kanban).
  - Cụm nút hành động chính, được đẩy góc phải: Thêm User, Thêm Việc, User Profile (Dropdown Menu) và nút Đăng xuất.
  - *Lý do:* Giải phóng không gian cho khu vực bảng điều khiển bên dưới, giúp giao diện không bị ngợp.

- **Filter Bar (Thanh bộ lọc):**
  - Các Dropdown lọc: Theo Dự án, theo Sprint, theo Người thực hiện, và Trạng thái.
  - Hiển thị tóm tắt "Tổng số công việc" trực quan.

- **Kanban Board (Bảng công việc):**
  - Sử dụng CSS Grid (`grid-cols-1 md:grid-cols-5`) chia làm 5 cột trạng thái: Viêc cần làm, Đang tiến hành, Bị khóa, Đánh giá, Hoàn thành.
  - Hỗ trợ Drag & Drop mượt mà với API HTML5.

---

## 2. Tối ưu hóa Di động (Mobile & Responsive Optimization)
Dự án sử dụng các tiện ích (Utility classes) của **Tailwind CSS** để giải quyết triệt để các vấn đề hiển thị trên màn hình nhỏ (Mobile/Tablet):

### A. Ẩn chữ, giữ lại Biểu tượng (Icon-only on Mobile)
- Các nút bấm có văn bản dài (như "Thêm Công việc", "Thêm User", "Sửa / Thêm User", "Khôi phục") được áp dụng cấu trúc bọc thẻ `<span>` với class `hidden sm:inline`.
- *Kết quả:* Trên điện thoại (< 640px), nút bấm tự động rút gọn chỉ còn lại icon (FontAwesome), giải phóng triệt để không gian bề ngang.

### B. Chống tràn màn hình (Overflow Prevention)
- **Text dài / Link URL:** Sử dụng kết hợp các class `break-words` và `min-w-0` (bắt buộc trong cấu trúc Flexbox) để các thẻ nội dung tự động xuống dòng, không đẩy layout tràn ra khỏi màn hình điện thoại.
- **Hình ảnh (Images):** Hình chèn trong Modal hoặc Quill Editor đều được giới hạn `max-w-full h-auto` để co giãn theo khung chứa.
- **Bảng (Table):** Khung chứa nội dung mô tả được bao bọc bởi `overflow-x-auto` để sinh ra thanh cuộn ngang độc lập nếu người dùng chèn một bảng (Table) có kích thước quá lớn, bảo vệ an toàn cho layout gốc.

---

## 3. Hệ thống Hộp thoại (Modals & Dialogs)
Ứng dụng sử dụng một số lượng lớn Hộp thoại bật lên. Để ngăn việc chúng đè lên nhau sai thứ tự, hệ thống phân cấp (z-index) được quy định nghiêm ngặt:

- `z-[10000]`: Màn hình Loading và Toast Message (Thông báo góc màn hình). Luôn ở trên cùng.
- `z-[9999]`: Modal Xác nhận hành động (Xóa/Nhân bản).
- `z-[9998]`: Modal Chi tiết công việc (Detail Modal).
- `z-[7000]`: Modal Đổi mật khẩu, Form Nhập User/Dự án.
- `z-[6000]`: Modal Bảng Quản lý Admin (Quản lý User, Quản lý Dự án, Thùng rác).