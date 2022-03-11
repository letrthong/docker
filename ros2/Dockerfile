# Use an official Python runtime as a parent image
# https://hub.docker.com/_/ubuntu
FROM ubuntu:20.04

 
 ENV DEBIAN_FRONTEND=noninteractive
# Update image

# https://docs.ros.org/en/galactic/Installation/Ubuntu-Development-Setup.html
# check for UTF-8
RUN locale  

RUN apt-get update
RUN apt-get install -yq apt-utils 
RUN apt-get install -y locales
RUN locale-gen en_US en_US.UTF-8
RUN update-locale LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
RUN export LANG=en_US.UTF-8
# verify settings
RUN locale 

ENV DEBIAN_FRONTEND=noninteractive

# Add the ROS 2 apt repository
RUN  apt-get install -y software-properties-common
RUN  add-apt-repository universe


# Now add the ROS 2 apt repository to your system
RUN apt-get update 
RUN apt-get install -y curl gnupg lsb-release
RUN curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key -o /usr/share/keyrings/ros-archive-keyring.gpg


#Then add the repository to your sources list.
#RUN echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] http://packages.ros.org/ros2/ubuntu $(source /etc/os-release && echo $UBUNTU_CODENAME) #main" | tee /etc/apt/sources.list.d/ros2.list > /dev/null

RUN echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] http://packages.ros.org/ros2/ubuntu $(. /etc/os-release && echo $UBUNTU_CODENAME) main" | tee /etc/apt/sources.list.d/ros2.list > /dev/null
 
RUN apt-get update
RUN apt-get install -y  build-essential  
RUN apt-get install -y  wget git
RUN apt-get install -y cmake
RUN apt-get install -y python3-flake8 python3-pip python3-pytest-cov python3-rosdep
RUN apt-get install -y  python3-setuptools  
RUN apt-get install -y python3-vcstool     
RUN apt-get install -y  python3-colcon-common-extensions 
 
# Install any needed packages specified in requirements.txt
RUN python3 -m pip install -U \
  flake8-blind-except \
  flake8-builtins \
  flake8-class-newline \
  flake8-comprehensions \
  flake8-deprecated \
  flake8-docstrings \
  flake8-import-order \
  flake8-quotes \
  pytest-repeat \
  pytest-rerunfailures \
  pytest \
  setuptools


# Create a workspace and clone all repos
RUN mkdir -p ~/ros2_galactic/src
RUN cd ~/ros2_galactic
RUN wget https://raw.githubusercontent.com/ros2/ros2/galactic/ros2.repos
RUN vcs import ~/ros2_galactic/src < ros2.repos



# Install dependencies using rosdep
RUN rosdep init
RUN rosdep update
RUN rosdep install --from-paths ~/ros2_galactic/src --ignore-src -y --skip-keys "fastcdr rti-connext-dds-5.3.1 urdfdom_headers"

# Build the code in the workspace
RUN cd ~/ros2_galactic/ && colcon build --symlink-install
 

# Run example 
RUN cd ~/ros2_galactic/src 
RUN git clone https://github.com/letrthong/ros2 thong

RUN cd ~/ros2_galactic/src
RUN git clone https://github.com/GENIVI/dlt-daemon.git
# DLT log
RUN apt-get install cmake zlib1g-dev libdbus-glib-1-dev
RUN cd ~/ros2_galactic/src/dlt-daemon
RUN mkdir build
RUN cd build
RUN cmake ..
RUN make
RUN make install
RUN ldconfig 

# Set the working directory to /app
#WORKDIR /app

# Copy the current directory contents into the container at /app
#ADD . /app


# Make port 80 available to the world outside this container
#EXPOSE 5000

# Define environment variable
#ENV NAME World

# Run app.py when the container launches
#CMD ["python", "app.py"]
