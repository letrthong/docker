FROM ubuntu:22.04

# 1. INSTALL TOOLS AND SOURCE CODE
# Install necessary packages: build-essential (g++), cmake, git.
# libgtest-dev package downloads the SOURCE CODE for both GTest and GMock to /usr/src/googletest/
RUN apt update && apt install -y \
    build-essential \
    cmake \
    git \
    libgtest-dev \
    && rm -rf /var/lib/apt/lists/*

# 2. BUILD AND INSTALL GTEST & GMOCK
# Compile and install both GTest and GMock from the downloaded source code.
# The source code is located in /usr/src/googletest
RUN cd /usr/src/googletest && \
    mkdir build && \
    cd build && \
    # Configure the build
    cmake .. && \
    # Compile (using -j$(nproc) for faster compilation)
    make -j$(nproc) && \
    # Install: copies headers and static libraries (.a) 
    # (including libgmock.a and libgtest.a) to standard system directories (/usr/include, /usr/lib)
    make install && \
    # Update shared library cache
    ldconfig

# 3. SET UP PROJECT ENVIRONMENT
# Set the working directory
WORKDIR /app

# Copy the test files from the local build directory into the container
COPY test.cpp /app/
COPY test_gmock.cpp /app/

# 4. COMPILE THE TEST FILES
# Compile test.cpp (using GTest only)
# Headers are found via default search paths, libraries via -l
RUN g++ test.cpp -lgtest -lgtest_main -pthread -o test

# Compile test_gmock.cpp (using both GTest and GMock)
RUN g++ test_gmock.cpp -lgtest -lgmock -lgtest_main -pthread -o test_gmock

# 5. RUN TESTS ON CONTAINER STARTUP
# Use bash -c to execute both test binaries sequentially
CMD ["/bin/bash", "-c", "./test && ./test_gmock"]
