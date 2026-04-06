#!/bin/bash
# single_page copy.sh
# docker exec -w /app $CONTAINER_NAME /bin/sh ./create_single_page.sh
#
set -e

echo "[1/3] Navigating to /app directory..."
cd /app

echo "[2/3] Installing npm packages..."
npm install

echo "[3/3] Generating production build..."
npm run build

echo "  Deployment preparation finished!"


docker exec -it telua_python_point bash

docker cp -fv telua_python_point:/app/dist/index.html ./dist/index.html