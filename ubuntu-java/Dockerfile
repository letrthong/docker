
FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive

# Install OpenJDK and g++ in the same layer to optimize size
# Remove apt lists after installation to reduce image size
RUN apt-get update && apt-get install -y openjdk-11-jdk g++ && rm -rf /var/lib/apt/lists/*

COPY . /usr/src/myapp
WORKDIR /usr/src/myapp

# 1. Compile Java and generate C++ header file (Main.h) using -h flag
RUN javac -h . -encoding UTF-8 Main.java

# 2. Compile C++ into shared library (.so)
# -fPIC: Position Independent Code (required for shared libraries)
# -I: Specify include path for JNI headers
RUN JAVA_HOME="$(dirname $(dirname $(readlink -f $(which javac))))" && \
    g++ -shared -fPIC -I"$JAVA_HOME/include" -I"$JAVA_HOME/include/linux" -o libhello.so HelloJNI.cpp Greeting.cpp
# 3. Run Java, specifying the native library path (-Djava.library.path)
CMD ["java", "-Djava.library.path=.", "Main"]
