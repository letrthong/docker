FROM ubuntu:22.04

# Cài đặt các gói cần thiết
RUN apt update && apt install -y \
    build-essential \
    cmake \
    git \
    libgtest-dev \
    && rm -rf /var/lib/apt/lists/*

# Build Google Test từ mã nguồn
RUN cd /usr/src/gtest && \
    cmake . && \
    make && \
    cp lib/*.a /usr/lib

# Tạo thư mục làm việc
WORKDIR /app

# Copy file test.cpp từ thư mục build vào container
COPY test.cpp /app/test.cpp

# Biên dịch test.cpp
RUN g++ test.cpp -lgtest -lgtest_main -pthread -o test

# Chạy test khi container khởi động
CMD ["./test"]
