
FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive

# Thiết lập JAVA_HOME để g++ có thể tìm thấy jni.h
ENV JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64

# Cài đặt OpenJDK và g++ trong cùng một layer để tối ưu kích thước
# Xóa danh sách apt sau khi cài đặt để giảm dung lượng image
RUN apt-get update && apt-get install -y openjdk-11-jdk g++ && rm -rf /var/lib/apt/lists/*

COPY . /usr/src/myapp
WORKDIR /usr/src/myapp

# 1. Biên dịch Java và tạo file header C++ (Main.h) bằng flag -h
RUN javac -h . -encoding UTF-8 Main.java

# 2. Biên dịch C++ thành thư viện chia sẻ (.so)
# -fPIC: Position Independent Code (bắt buộc cho thư viện chia sẻ)
# -I: Chỉ định đường dẫn include cho JNI header
RUN g++ -shared -fPIC -I"$JAVA_HOME/include" -I"$JAVA_HOME/include/linux" -o libhello.so HelloJNI.cpp

# 3. Chạy Java, chỉ định đường dẫn thư viện native (-Djava.library.path)
CMD ["java", "-Djava.library.path=.", "Main"]
