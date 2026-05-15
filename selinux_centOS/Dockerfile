FROM fedora:39

# Cài Python, SELinux tools, make, gcc
RUN dnf install -y python3 policycoreutils checkpolicy selinux-policy-devel make gcc

# Set the working directory
WORKDIR /app

# Copy source code và policy
COPY *.py /app/
COPY *.sh /app/
COPY *.te /app/


# Build policy module
RUN make -f /usr/share/selinux/devel/Makefile my_app.pp
# Nếu chạy trên hệ thống hỗ trợ SELinux (CentOS/Fedora/RHEL), bỏ comment dòng dưới để cài policy:
# RUN semodule -i my_app.pp

# Default command: run test script
CMD ["bash", "/app/start_testing.sh"]
