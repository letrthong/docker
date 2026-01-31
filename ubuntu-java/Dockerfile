
FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y openjdk-11-jdk
# Cần cài đặt g++ để biên dịch code C++
RUN apt-get install -y g++

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
