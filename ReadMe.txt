https://docs.docker.com/get-started/part2/#apppy

How to install on Debian 
  https://docs.docker.com/install/linux/docker-ce/debian/
  
  https://docs.docker.com/engine/install/ubuntu/
DockerFile
  https://docs.docker.com/develop/develop-images/dockerfile_best-practices/


https://hub.docker.com/r/letrthong/ros2

https://docs.docker.com/engine/reference/commandline/save/

https://docs.docker.com/engine/reference/commandline/import/

check log
journalctl -eu docker

Install by the script

https://depot.dev/blog/docker-clear-cache
docker system df



#free space
docker system prune -a


root@instance-redis-1:/opt/shop# sudo dockerd
INFO[2024-10-12T01:48:17.561521110Z] Starting up                                  
failed to start daemon: Unable to get the TempDir under /var/lib/docker: mkdir /var/lib/docker/tmp: no space left on device
=>https://github.com/letrthong/redis install new docker
 
Java
RUN apt-get update && apt-get install -y openjdk-11-jdk 
RUN chmod +x gen_jni.sh build_jni.sh run_jni.sh
CMD bash -c "./gen_jni.sh && ./build_jni.sh && ./run_jni.sh"
