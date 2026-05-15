# my_app_reader.py - Chỉ đọc file log để kiểm tra policy SELinux

def main():
    log_path = "/tmp/my_app.log"
    try:
        with open(log_path, "r") as f:
            content = f.read()
        print(f"Read from log: {content.strip()}")
    except Exception as e:
        print(f"Failed to read log: {e}")

if __name__ == "__main__":
    main()
