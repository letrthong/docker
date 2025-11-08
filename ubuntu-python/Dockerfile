FROM ubuntu:22.04

# 1. INSTALL TOOLS AND SOURCE CODE
# Install necessary packages: build-essential (g++), cmake, git.
# libgtest-dev package downloads the SOURCE CODE for both GTest and GMock to /usr/src/googletest/
RUN apt-get update &&  apt-get install -y python3 python3-pip
#

# 3. SET UP PROJECT ENVIRONMENT
# Set the working directory
WORKDIR /app

# Copy the test files from the local build directory into the container
COPY *.py /app/
COPY *.sh /app/

# 5. RUN TESTS ON CONTAINER STARTUP
# Use bash -c to execute both test binaries sequentially
CMD ["/bin/bash", "/app/start.sh"]
