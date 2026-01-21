# Bugrit Scan Worker
# Hybrid architecture: This runs on Cloud Run with full Docker support
# Includes Chromium, Puppeteer, and Docker-in-Docker for external tool images

FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    # Chromium and dependencies
    chromium \
    fonts-liberation \
    fonts-noto-color-emoji \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    # Git for repo cloning
    git \
    # Docker CLI for running external tool images
    docker.io \
    # Build tools for native modules
    python3 \
    make \
    g++ \
    # Hadolint for Dockerfile linting
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install Hadolint
RUN wget -qO /usr/local/bin/hadolint https://github.com/hadolint/hadolint/releases/latest/download/hadolint-Linux-x86_64 \
    && chmod +x /usr/local/bin/hadolint

# Configure Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV NODE_ENV=production

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build:worker 2>/dev/null || echo "No worker build script, using source directly"

# Create non-root user for security
RUN groupadd -r bugrit && useradd -r -g bugrit bugrit
RUN chown -R bugrit:bugrit /app

# Add bugrit user to docker group for Docker-in-Docker
RUN usermod -aG docker bugrit || true

USER bugrit

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start the worker
CMD ["node", "worker/server.js"]
