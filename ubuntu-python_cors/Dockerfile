FROM ubuntu:22.04

# 1. INSTALL TOOLS AND SOURCE CODE
# Install necessary packages: build-essential (g++), cmake, git.
# libgtest-dev package downloads the SOURCE CODE for both GTest and GMock to /usr/src/googletest/
RUN apt-get update && apt-get install -y python3 python3-pip
#

# 3. SET UP PROJECT ENVIRONMENT
# Set the working directory
WORKDIR /app

# Copy and install Python dependencies
COPY requirements.txt /app/
RUN pip3 install -r requirements.txt

# Copy the rest of the application files
COPY *.py /app/
COPY *.sh /app/

# 5. EXPOSE PORT AND RUN THE APPLICATION
# Expose the port the app runs on
EXPOSE 5000
# Run the application
CMD ["python3", "/app/services.py"]
