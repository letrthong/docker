
FROM ubuntu:20.04

# Cài đặt g++
RUN apt-get update && apt-get install -y g++

COPY . /usr/src/myapp
WORKDIR /usr/src/myapp
RUN g++ -std=c++17 -o myapp main.cpp
CMD ["./myapp"]
