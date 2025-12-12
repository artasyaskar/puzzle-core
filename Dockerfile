FROM node:20

WORKDIR /app

# Install deps first for better layer caching
COPY package*.json ./
RUN npm ci --no-audit --no-fund --prefer-offline || npm i --no-audit --no-fund --prefer-offline

# Python + tools for task runners (pytest, HTTP, diff apply helpers)
RUN apt-get update && apt-get install -y \
    python3 python3-pip \
    curl \
    python3-pytest python3-requests \
    patch \
    git \
    && git --version \
    && which git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt ./
# Optional: allow extra Python deps from requirements if provided
RUN pip3 install --no-cache-dir -r requirements.txt || true

# App source
COPY . .

# Ensure test runner is executable
RUN chmod +x /app/run_tests.sh

# Default entrypoint lets grader pass TASK_ID
ENTRYPOINT ["./run_tests.sh"]
