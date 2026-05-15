#!/bin/bash
# restart_docker.sh - Restart container and automatically access its shell

echo "Stopping and removing old container..."
docker compose down

echo "Starting container..."
docker compose up -d

#+# Wait for the container to start
sleep 2

#+# Set container name (edit if you change the name in docker-compose.yml)
CONTAINER=selinux_python_demo

echo "Accessing container shell..."
docker exec -it $CONTAINER bash
