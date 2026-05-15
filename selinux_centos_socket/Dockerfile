FROM fedora:39

# Cài Python, SELinux tools, make, gcc
RUN dnf install -y python3 policycoreutils checkpolicy selinux-policy-devel make gcc

# Set the working directory
WORKDIR /app


# Copy source code
COPY src/ /app/src/
COPY policy/ /app/policy/
COPY *.sh /app/

# Build policy module
RUN make -f /usr/share/selinux/devel/Makefile -C /app/policy my_app.pp
# Nếu chạy trên hệ thống hỗ trợ SELinux (CentOS/Fedora/RHEL), bỏ comment dòng dưới để cài policy:
# RUN semodule -i /app/policy/my_app.pp


# Build policy module for my_app_socket.te
#RUN make -f /usr/share/selinux/devel/Makefile  -C /app/policy  my_app_socket.pp
# If running on SELinux-enabled system, uncomment below to install policy
# RUN semodule -i /app/policy/my_app_socket.pp



# Default command: run test script
CMD ["bash", "/app/start_testing.sh"]
