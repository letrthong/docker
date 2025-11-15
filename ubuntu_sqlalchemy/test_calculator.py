#
#file_name: telua_pymysql.py
#
import unittest
from unittest.mock import patch, MagicMock
from telua_pymysql import create_db_engine, check_connection_and_get_db_name

# Giả sử bạn lưu code refactor ở trên vào file `your_module_name.py`

class TestDatabaseConnection(unittest.TestCase):

    # --- Unit Test cho create_db_engine (Kiểm tra logic xây dựng URL) ---
    def test_create_db_engine_success(self):
        """Kiểm tra tạo engine với mật khẩu chứa ký tự đặc biệt."""
        engine = create_db_engine("root", "b5sLNk3v9gq}8HZ)", "35.202.109.33", 3306, "iot_ecommerce", "utf8mb4")
        if engine:
                print("✅ Engine được khởi tạo thành công.")

        self.assertIsNotNone(engine)
        
        # Kiểm tra chuỗi URL có được mã hóa đúng không
        # 'pass@word!' phải được mã hóa thành 'pass%40word%21'
        #self.assertIn("pass%40word%21@35.202.109.33:3306/iot_ecommerce", str(engine.url))

    # --- Integration/Mock Test cho check_connection_and_get_db_name ---

    @patch('telua_pymysql.SQLAlchemyError', Exception) # Giả lập lỗi chung
    @patch('telua_pymysql.create_engine') # Giả lập Engine
    def test_check_connection_failure(self, MockCreateEngine):
        """Kiểm tra khi kết nối thất bại."""
        # Setup: Giả lập engine.connect() khi được gọi sẽ raise lỗi
        mock_engine = MockCreateEngine.return_value
        mock_engine.connect.side_effect = Exception("Test Connection Error")
        
        is_connected, db_name = check_connection_and_get_db_name(mock_engine)
        
        self.assertFalse(is_connected)
        self.assertIsNone(db_name)

    # Nếu bạn muốn test kết nối thành công (dùng Mock để tránh kết nối DB thật)
    @patch('telua_pymysql.create_engine')
    def test_check_connection_success(self, MockCreateEngine):
        """Kiểm tra khi kết nối thành công và trả về tên DB."""
        # Setup: Giả lập đối tượng connection và kết quả truy vấn
        mock_result = MagicMock()
        mock_result.scalar_one.return_value = 'mock_iot_db'
        
        mock_connection = MagicMock()
        mock_connection.execute.return_value = mock_result
        
        mock_engine = MockCreateEngine.return_value
        # Giả lập connect() trả về context manager chứa mock_connection
        mock_engine.connect.return_value.__enter__.return_value = mock_connection

        is_connected, db_name = check_connection_and_get_db_name(mock_engine)
        
        self.assertTrue(is_connected)
        self.assertEqual(db_name, 'mock_iot_db')

if __name__ == '__main__':
    unittest.main()