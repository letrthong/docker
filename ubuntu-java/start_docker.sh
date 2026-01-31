#!/bin/bash
# Stop script immediately on error (important for detecting build errors)
set -e

# remove the rest containers if have
docker compose down

# Ensure old container is removed if down command didn't handle it or if manually created
docker rm -f ubuntu_java 2>/dev/null || true

# build images
docker compose build --no-cache

# start up containers from all images
docker compose up

#docker compose up -d  ( -d Detached)
