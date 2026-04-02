#!/bin/bash
set -e

echo "[1/3] Navigating to /app directory..."
cd /app

echo "[2/3] Installing npm packages..."
npm install

echo "[3/3] Generating production build..."
npm run build

echo "  Deployment preparation finished!"
