# https://docs.docker.com/engine/install/debian/
# https://depot.dev/blog/docker-clear-cache

# stop all containers
docker stop $(docker ps -a -q)

# Removing all containers
docker container prune

# remove all containers
docker rm $(docker ps -a -q)

# remove all unused images to free disk
docker image prune -a -f

# free space
docker system prune -a
