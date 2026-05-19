FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1

# Cài Node.js và npm
RUN apt-get update && apt-get install -y curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app


# Cài Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy package.json và lockfile trước để cache npm install
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy toàn bộ project (sau khi đã npm install)
COPY . .

# Build frontend
RUN npm run build

# Copy file tĩnh sang Flask static

# Diagnostic: Check if build output exists
 
RUN ls -l /app/dist

# Ensure static directory exists
RUN mkdir -p /app/src/static

# Copy ALL static files, not just index.html
RUN cp -fv /app/dist/*html /app/src/static/

# List contents after copy for verification
RUN ls -l /app/src/static

EXPOSE 5000

CMD ["python", "/app/src/app.py"]
