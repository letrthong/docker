from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
import urllib.parse # Thư viện để mã hóa mật khẩu nếu cần

# Thông tin kết nối của bạn
DB_USERNAME = 'root'
DB_PASSWORD = 'b5sLNk3v9gq}8HZ)'
DB_HOST = '35.202.109.xxx'
DB_PORT = 3306
DB_NAME = 'iot_xx'
DB_CHARSET = 'utf8mb4'

# Mã hóa mật khẩu để đảm bảo các ký tự đặc biệt được xử lý đúng trong URL
safe_password = urllib.parse.quote_plus(DB_PASSWORD)

# Tạo chuỗi kết nối (Database URL)
# Định dạng: mysql+driver://user:pass@host:port/dbname?charset=charset_name
# Ở đây dùng driver mặc định của mysql-connector-python
DATABASE_URL = (
    f"mysql+mysqlconnector://{DB_USERNAME}:{safe_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    f"?charset={DB_CHARSET}"
)

# Tạo Engine (Đối tượng quản lý kết nối)
try:
    engine = create_engine(DATABASE_URL)

    # Thử kết nối để kiểm tra
    with engine.connect() as connection:
        print("✅ Kết nối SQLAlchemy đến MySQL thành công!")

        result = connection.execute(text("SELECT DATABASE()"))

        # Dùng .scalar_one() hoặc .scalar_one_or_none() tiện hơn cho 1 giá trị
        db_name = result.scalar_one()
        print(f"   Đã kết nối tới Database: {db_name}")

except SQLAlchemyError as e:
    print(f"❌ Lỗi kết nối SQLAlchemy: {e}")
    print("   Kiểm tra lại: IP, cổng 3306 đã mở chưa, tên DB, username/password.")

# Đối tượng 'engine' đã sẵn sàng để sử dụng với Session và Model.