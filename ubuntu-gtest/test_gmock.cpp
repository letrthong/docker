#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include <iostream>
#include <string>

// Sử dụng các namespace của GTest/GMock
using ::testing::Return;
using ::testing::_; // Dùng để khớp với bất kỳ đối số nào

// ====================================================================
// PHẦN 1: CODE CẦN KIỂM THỬ (Production Code)
// ====================================================================

/**
 * @brief Giao diện (Interface) cho hoạt động cơ sở dữ liệu.
 * Đây là đối tượng mà chúng ta muốn MOCK.
 */
class DatabaseInterface {
public:
    virtual ~DatabaseInterface() = default;
    virtual bool open() = 0;
    virtual bool close() = 0;
    virtual std::string query(const std::string& sql) = 0;
    virtual bool execute(const std::string& sql) = 0;
};

/**
 * @brief Lớp Logic Xử lý Dữ liệu (Class Under Test - CUT).
 * Nó phụ thuộc vào DatabaseInterface.
 */
class DataProcessor {
public:
    // Sử dụng Dependency Injection thông qua Constructor
    DataProcessor(DatabaseInterface* db) : db_(db) {}

    /**
     * @brief Thực hiện quy trình xử lý bao gồm Mở, Thực thi và Đóng DB.
     * @param data Dữ liệu đầu vào cần xử lý.
     * @return true nếu quá trình thành công, false nếu thất bại.
     */
    bool processTransaction(const std::string& data) {
        // 1. Mở kết nối
        if (!db_->open()) {
            std::cerr << "ERROR: Failed to open database." << std::endl;
            return false;
        }

        std::string sql_command = "INSERT INTO LOGS VALUES ('" + data + "')";

        // 2. Thực thi lệnh
        if (!db_->execute(sql_command)) {
            std::cerr << "ERROR: Failed to execute command." << std::endl;
            // Cố gắng đóng kết nối dù thất bại
            db_->close(); 
            return false;
        }

        // 3. Đóng kết nối
        if (!db_->close()) {
            std::cerr << "ERROR: Failed to close database." << std::endl;
            return false;
        }

        return true;
    }

private:
    DatabaseInterface* db_;
};


// ====================================================================
// PHẦN 2: LỚP MOCK VÀ UNIT TESTS (Testing Code)
// ====================================================================

/**
 * @brief Lớp Mock cho DatabaseInterface.
 * Kế thừa giao diện và sử dụng macro MOCK_METHOD.
 */
class MockDatabase : public DatabaseInterface {
public:
    MOCK_METHOD(bool, open, (), (override));
    MOCK_METHOD(bool, close, (), (override));
    // Dùng const std::string& làm tham số
    MOCK_METHOD(std::string, query, (const std::string& sql), (override));
    MOCK_METHOD(bool, execute, (const std::string& sql), (override));
};


/**
 * @brief Test Suite cho lớp DataProcessor.
 */
class DataProcessorTest : public ::testing::Test {
protected:
    // Setup - Khởi tạo các đối tượng chung cho mỗi test case
    MockDatabase mock_db;
    DataProcessor* processor = nullptr;

    void SetUp() override {
        // Khởi tạo DataProcessor với đối tượng Mock
        processor = new DataProcessor(&mock_db);
    }

    void TearDown() override {
        // Dọn dẹp
        delete processor;
        processor = nullptr;
    }
};


// --------------------------------------------------------------------
// TEST CASE 1: THÀNH CÔNG HOÀN TOÀN
// --------------------------------------------------------------------
TEST_F(DataProcessorTest, SuccessfulTransaction) {
    std::string test_data = "TestValue123";
    std::string expected_sql = "INSERT INTO LOGS VALUES ('TestValue123')";

    // KỲ VỌNG: 
    // 1. open() được gọi 1 lần và trả về TRUE.
    EXPECT_CALL(mock_db, open()).Times(1).WillOnce(Return(true));

    // 2. execute() được gọi 1 lần với chuỗi SQL chính xác và trả về TRUE.
    EXPECT_CALL(mock_db, execute(expected_sql)).Times(1).WillOnce(Return(true));
    
    // 3. close() được gọi 1 lần và trả về TRUE.
    EXPECT_CALL(mock_db, close()).Times(1).WillOnce(Return(true));

    // Thực hiện hàm cần kiểm thử
    bool result = processor->processTransaction(test_data);

    // Khẳng định kết quả cuối cùng
    EXPECT_TRUE(result) << "Transaction should succeed.";
}


// --------------------------------------------------------------------
// TEST CASE 2: THẤT BẠI KHI MỞ KẾT NỐI DB
// --------------------------------------------------------------------
TEST_F(DataProcessorTest, OpenFailure) {
    // KỲ VỌNG: 
    // 1. open() được gọi 1 lần và trả về FALSE.
    EXPECT_CALL(mock_db, open()).Times(1).WillOnce(Return(false));

    // 2. Các hàm execute và close KHÔNG được gọi.
    EXPECT_CALL(mock_db, execute(_)).Times(0);
    EXPECT_CALL(mock_db, close()).Times(0);

    // Thực hiện hàm cần kiểm thử
    bool result = processor->processTransaction("Data");

    // Khẳng định kết quả cuối cùng
    EXPECT_FALSE(result) << "Transaction should fail due to database open failure.";
}

// --------------------------------------------------------------------
// TEST CASE 3: THẤT BẠI KHI THỰC THI (NHƯNG PHẢI GỌI CLOSE)
// --------------------------------------------------------------------
TEST_F(DataProcessorTest, ExecuteFailure) {
    // KỲ VỌNG: 
    // 1. open() thành công.
    EXPECT_CALL(mock_db, open()).Times(1).WillOnce(Return(true));

    // 2. execute() thất bại.
    EXPECT_CALL(mock_db, execute(_)).Times(1).WillOnce(Return(false));
    
    // 3. close() PHẢI được gọi để dọn dẹp, dù execute thất bại.
    EXPECT_CALL(mock_db, close()).Times(1).WillOnce(Return(true)); 

    // Thực hiện hàm cần kiểm thử
    bool result = processor->processTransaction("Critical Data");

    // Khẳng định kết quả cuối cùng
    EXPECT_FALSE(result) << "Transaction should fail due to execute command failure.";
}


// ====================================================================
// PHẦN 3: HÀM MAIN
// ====================================================================

int main(int argc, char **argv) {
    // Khởi tạo GTest/GMock
    ::testing::InitGoogleTest(&argc, argv);

    // Chạy tất cả các bài kiểm thử
    return RUN_ALL_TESTS();
}
