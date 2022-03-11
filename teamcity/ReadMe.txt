# Ubuntu
 https://hub.docker.com/_/ubuntu

#Show all images 
	docker images

# Connect image
	sudo docker run -it sshd_tagged_image


# Check version on Linux
	cat /etc/os-release

# docker remove image id
docker rmi a2053118cff3

Example link
https://github.com/osrf/docker_images/blob/master/ros2/nightly/nightly/Dockerfile
https://github.com/osrf/docker_images/blob/master/docker/Dockerfile


# Teamcity
	https://github.com/JetBrains/teamcity-docker-server/blob/master/ubuntu/Dockerfile
	https://github.com/JetBrains/teamcity-docker-images


https://www.geeksforgeeks.org/copying-files-to-and-from-docker-containers/?ref=lbp
sudo docker cp ~/Desktop/to-be-copied.txt 135950565ad8:/to-be-copied.txt