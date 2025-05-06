FROM ubuntu:latest

# iputils-ping  -> ping 8.8.8.

RUN apt-get update && apt-get install -y openssh-server iputils-ping  && mkdir -p /var/run/sshd


# Set root password
RUN echo 'root:telua' | chpasswd


COPY ./ssh_config /etc/ssh/sshd_config

CMD ["/usr/sbin/sshd", "-D"]
