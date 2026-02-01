
FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive

# Install OpenJDK and g++ in the same layer to optimize size
# Added wget to download JUnit standalone jar
# Remove apt lists after installation to reduce image size
RUN apt-get update && apt-get install -y openjdk-11-jdk g++ wget && rm -rf /var/lib/apt/lists/*

COPY . /usr/src/myapp
WORKDIR /usr/src/myapp

# Download JUnit Platform Console Standalone (includes JUnit Jupiter)
RUN wget https://repo1.maven.org/maven2/org/junit/platform/junit-platform-console-standalone/1.10.0/junit-platform-console-standalone-1.10.0.jar

# 1. Compile Java and generate C++ header file (Main.h) using -h flag
RUN javac -h . -encoding UTF-8 Main.java

# 2. Compile C++ into shared library (.so)
# -fPIC: Position Independent Code (required for shared libraries)
# -I: Specify include path for JNI headers
RUN JAVA_HOME="$(dirname $(dirname $(readlink -f $(which javac))))" && \
    g++ -shared -fPIC -I"$JAVA_HOME/include" -I"$JAVA_HOME/include/linux" -o libhello.so HelloJNI.cpp Greeting.cpp

# 3. Compile and Run Unit Tests
# Compile MainTest.java with JUnit in classpath
RUN javac -cp .:junit-platform-console-standalone-1.10.0.jar MainTest.java
# Run tests using Console Launcher. -Djava.library.path=. is crucial for JNI
# --reports-dir generates XML reports (TEST-*.xml) suitable for Jenkins integration
RUN java -Djava.library.path=. -jar junit-platform-console-standalone-1.10.0.jar -cp . -c MainTest --reports-dir=test-reports

# 4. Run Java App (Runtime)
CMD ["java", "-Djava.library.path=.", "Main"]
