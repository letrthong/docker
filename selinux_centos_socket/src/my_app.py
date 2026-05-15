# my_app.py - Demo Python app for SELinux policy example


def main():
    log_path = "/tmp/my_app.log"
    # Ghi log
    try:
        with open(log_path, "w") as f:
            f.write("This is a test log from my_app.\n")
        print(f"Successfully wrote to {log_path}")
    except Exception as e:
        print(f"Failed to write log: {e}")

    # Đọc log
    try:
        with open(log_path, "r") as f:
            content = f.read()
        print(f"Read from log: {content.strip()}")
    except Exception as e:
        print(f"Failed to read log: {e}")

if __name__ == "__main__":
    main()
