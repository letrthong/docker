
FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive

# Cài đặt g++
RUN apt-get update && apt-get install -y g++

RUN apt-get update && apt-get install -y git
RUN apt-get update && apt-get install -y cmake

COPY . /usr/src/myapp
WORKDIR /usr/src/myapp
RUN g++ -std=c++17 -o myapp main.cpp
CMD ["./myapp"]
