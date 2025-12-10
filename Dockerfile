FROM node:20-alpine

WORKDIR /app

# Install deps first for better layer caching
COPY package*.json ./
RUN npm ci --no-audit --no-fund --prefer-offline || npm i --no-audit --no-fund --prefer-offline

# Python + tools for task runners (pytest, HTTP, diff apply helpers)
RUN apk add --no-cache \
    python3 py3-pip \
    curl git \
    py3-pytest py3-requests \
    patch dos2unix
COPY requirements.txt ./
# Optional: allow extra Python deps from requirements if provided
RUN pip3 install --no-cache-dir -r requirements.txt || true

# App source
COPY . .

# Ensure test runner is executable
RUN chmod +x /app/run_tests.sh

# Default entrypoint lets grader pass TASK_ID
ENTRYPOINT ["./run_tests.sh"]
