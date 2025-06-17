FROM gcc:4.9
COPY . /usr/src/myapp
WORKDIR /usr/src/myapp
RUN g++ -std=c++17 -o myapp main.cpp
CMD ["./myapp"]
