FROM ubuntu:22.04

# 1. CÀI ĐẶT CÔNG CỤ VÀ MÃ NGUỒN
# Cài đặt các gói cần thiết: build-essential (g++), cmake, git.
# Gói libgtest-dev tải MÃ NGUỒN của cả GTest và GMock về /usr/src/googletest/
RUN apt update && apt install -y \
    build-essential \
    cmake \
    git \
    libgtest-dev \
    && rm -rf /var/lib/apt/lists/*

# 2. BIÊN DỊCH VÀ CÀI ĐẶT GTEST & GMOCK
# Biên dịch cả GTest và GMock từ mã nguồn đã tải về.
# Thư mục mã nguồn được tải về là /usr/src/googletest
RUN cd /usr/src/googletest && \
    mkdir build && \
    cd build && \
    # Cấu hình biên dịch
    cmake .. && \
    # Biên dịch (dùng -j$(nproc) để tăng tốc độ)
    make -j$(nproc) && \
    # Cài đặt: copy headers và các thư viện .a (libgtest.a, libgmock.a, ...) 
    # vào các thư mục hệ thống chuẩn (/usr/include, /usr/lib)
    make install && \
    # Cập nhật cache thư viện
    ldconfig

# 3. CHUẨN BỊ MÔI TRƯỜNG DỰ ÁN
# Tạo thư mục làm việc
WORKDIR /app

# Copy các file test từ thư mục local (thư mục chứa Dockerfile) vào container
COPY test.cpp /app/
COPY test_gmock.cpp /app/

# 4. BIÊN DỊCH CÁC FILE TEST
# Biên dịch test.cpp (chỉ dùng GTest)
RUN g++ test.cpp -lgtest -lgtest_main -pthread -o test

# Biên dịch test_gmock.cpp (dùng cả GTest và GMock)
# Sau bước 2, các thư viện libgtest.a và libgmock.a đã nằm trong /usr/lib, 
# nên chỉ cần dùng cờ -l
RUN g++ test_gmock.cpp -lgtest -lgmock -lgtest_main -pthread -o test_gmock

# 5. CHẠY TEST KHI CONTAINER KHỞI ĐỘNG
# Sửa lỗi: Chỉ có lệnh CMD cuối cùng mới có hiệu lực. 
# Ta sẽ tạo một script để chạy cả hai.
CMD ["/bin/bash", "-c", "./test && ./test_gmock"]
