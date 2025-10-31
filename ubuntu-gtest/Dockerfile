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
# Copy mã nguồn test vào container (nếu có)
# COPY . /app
# Mặc định chạy bash để bạn có thể biên dịch và test thủ công
CMD ["/bin/bash"]
