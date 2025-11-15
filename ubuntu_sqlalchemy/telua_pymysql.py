from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
import urllib.parse
from typing import Optional, Tuple

# --- 1. THÔNG TIN KẾT NỐI (CONSTANTS) ---
# Thường nên lưu trong file cấu hình .env và dùng thư viện dotenv để tải
DB_USERNAME = 'root'
DB_PASSWORD = 'b5sLNk3v9gq}8HZ)'
DB_HOST = '35.202.109.33'
DB_PORT = 3306
DB_NAME = 'iot_ecommerce'
DB_CHARSET = 'utf8mb4'


# --- 2. CÁC HÀM LOGIC ĐỂ DỄ DÀNG TEST ---

def create_db_engine(
    username: str,
    password: str,
    host: str,
    port: int,
    db_name: str,
    charset: str
) -> Optional[create_engine]:
    """
    Tạo và trả về đối tượng SQLAlchemy Engine.

    Returns:
        Engine hoặc None nếu có lỗi.
    """
    try:
        # Mã hóa mật khẩu
        safe_password = urllib.parse.quote_plus(password)

        # Tạo chuỗi kết nối (Database URL)
        database_url = (
            f"mysql+mysqlconnector://{username}:{safe_password}@{host}:{port}/{db_name}"
            f"?charset={charset}"
        )

        # Tạo Engine
        engine = create_engine(database_url)
        return engine

    except Exception as e:
        # Bắt các lỗi chung trong quá trình xây dựng URL/Engine
        print(f"❌ Lỗi khi khởi tạo Engine: {e}")
        return None

def check_connection_and_get_db_name(engine: create_engine) -> Tuple[bool, Optional[str]]:
    """
    Thử kết nối và thực hiện truy vấn để xác nhận.

    Returns:
        (Trạng thái kết nối, Tên Database).
    """
    if engine is None:
        return False, None

    try:
        # Thử kết nối
        with engine.connect() as connection:
            # Thực hiện truy vấn
            result = connection.execute(text("SELECT DATABASE()"))
            db_name = result.scalar_one()
            return True, db_name

    except SQLAlchemyError as e:
        print(f"❌ Lỗi kết nối SQLAlchemy: {e}")
        print("   Kiểm tra lại: IP, cổng 3306 đã mở chưa, tên DB, username/password.")
        return False, None

# --- 3. HÀM MAIN ĐỂ CHẠY CHƯƠNG TRÌNH ---

def main():
    """Chức năng chính của script."""
    print("--- KHỞI TẠO KẾT NỐI DATABASE ---")

    # 1. Tạo Engine
    engine = create_db_engine(
        DB_USERNAME, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME, DB_CHARSET
    )

    if engine:
        print("✅ Engine được khởi tạo thành công.")

        # 2. Kiểm tra kết nối
        is_connected, db_name = check_connection_and_get_db_name(engine)

        if is_connected:
            print("✅ Kết nối SQLAlchemy đến MySQL thành công!")
            print(f"   Đã kết nối tới Database: {db_name}")
        else:
            print("❌ Kết nối thất bại. Xem thông báo lỗi chi tiết ở trên.")

    else:
        print("❌ Không thể khởi tạo Engine, không thể tiếp tục kiểm tra kết nối.")

# --- 4. ĐIỂM KHỞI CHẠY (ENTRY POINT) ---

if __name__ == '__main__':
    main()