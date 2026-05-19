
FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive

# Cài đặt các gói cần thiết cho DLT Daemon và build C++
RUN apt-get update && apt-get install -y \
	g++ \
	git \
	cmake \
	zlib1g-dev \
	libdbus-glib-1-dev \
	build-essential \
	openssh-server

# Cài đặt Google Test (gtest)
RUN apt-get update && apt-get install -y libgtest-dev
RUN cd /usr/src/gtest && cmake . && make && cp lib/*.a /usr/lib

WORKDIR /opt/myapp
COPY src/example4.c /opt/myapp
COPY src/CMakeLists.txt /opt/myapp

WORKDIR /opt/dlt-daemon
COPY dlt-daemon /opt/dlt-daemon

# Clone, build, and install DLT Daemon (bao gồm cả unit test với Google Test)

WORKDIR /opt/dlt-daemon
RUN mkdir build \
	&& cd build \
	&& cmake -DBUILD_TESTING=ON .. \
	&& make \
	&& make install \
	&& ldconfig \
	&& chmod -R 777 /opt/dlt-daemon/build


WORKDIR /opt/myapp
RUN mkdir -p build \
	&& cd build \
	&& cmake .. \
	&& make

# SSH setup
RUN mkdir /var/run/sshd \
	&& echo 'root:1234' | chpasswd \
	&& sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config \
	&& sed -i 's@session\\s*required\\s*pam_loginuid.so@session optional pam_loginuid.so@g' /etc/pam.d/sshd

ENV NOTVISIBLE "in users profile"
RUN echo "export VISIBLE=now" >> /etc/profile

EXPOSE 22
CMD ["/usr/sbin/sshd", "-D"]

 