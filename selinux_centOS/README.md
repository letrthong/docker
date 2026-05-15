# Lưu ý khi chạy trên Ubuntu

* Ubuntu mặc định không bật SELinux mà dùng AppArmor. Để kiểm tra SELinux thực sự, nên dùng CentOS, Fedora, RHEL hoặc bật SELinux trên Ubuntu (không khuyến khích).
* Nếu chạy trên Ubuntu, các lệnh SELinux (`semodule`, `checkpolicy`, `selinux-policy-devel`) có thể không hoạt động hoặc không có hiệu lực thực tế.
* Nếu chỉ cần kiểm tra logic Python, vẫn chạy được, nhưng không kiểm tra được hiệu lực SELinux thực sự.

---


## Kiểm tra hệ thống có hỗ trợ SELinux hoặc AppArmor
Chạy lệnh sau trên máy host hoặc trong container:

**Kiểm tra SELinux:**
```sh
sestatus
# hoặc
getenforce
```
* Nếu trả về `SELinux status: enabled` hoặc `Enforcing`, hệ thống có hỗ trợ SELinux.
* Nếu trả về `command not found` hoặc `Disabled`, hệ thống không hỗ trợ SELinux.

**Kiểm tra AppArmor (thường trên Ubuntu):**
```sh
sudo aa-status
```
* Nếu trả về danh sách profile hoặc trạng thái `apparmor module is loaded.`, nghĩa là AppArmor đang hoạt động.

---


## Lưu ý khi build policy trên Ubuntu

- Khi chạy Docker trên Ubuntu, chỉ build file policy (.pp), không cài policy SELinux (bỏ lệnh `semodule -i my_app.pp` trong Dockerfile) vì Ubuntu không hỗ trợ SELinux mặc định.
- Nếu muốn test cài policy SELinux thực sự, hãy sử dụng CentOS, Fedora, RHEL hoặc máy ảo có SELinux.

---

## Hướng dẫn test SELinux với Docker

### Build và chạy container
```sh
docker compose up --build -d
```

### Enter the container (if needed)
```sh
# Access the running container shell
docker exec -it selinux_python_demo bash
```

### Test ghi/đọc log với SELinux policy
```sh
python3 my_app.py
# Kết quả: Nếu policy cho phép, sẽ ghi và đọc được /tmp/my_app.log
```

### Test chỉ đọc log (dùng file riêng để kiểm tra quyền đọc)
```sh
python3 my_app_reader.py
# Nếu policy chặn quyền đọc, sẽ báo lỗi. Có thể chỉnh my_app.te để kiểm tra các trường hợp khác nhau.
```
