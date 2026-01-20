# Firebase App Hosting compatible Dockerfile with Chromium support
# Based on Node.js 20 with Chromium for Puppeteer and security scanning tools

FROM node:20-slim

# Install Chromium, git, and dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    curl \
    git \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# ============================================================
# Phase 1 Security Tools (stable, single-binary, no external deps)
# ============================================================

# Hadolint - Dockerfile linter (v2.12.0)
RUN curl -sSL https://github.com/hadolint/hadolint/releases/download/v2.12.0/hadolint-Linux-x86_64 \
    -o /usr/local/bin/hadolint && chmod +x /usr/local/bin/hadolint

# Gitleaks - Secret detection (v8.18.4)
RUN curl -sSL https://github.com/gitleaks/gitleaks/releases/download/v8.18.4/gitleaks_8.18.4_linux_x64.tar.gz \
    | tar xz -C /usr/local/bin gitleaks

# Dockle - Container image linter (v0.4.14)
RUN curl -sSL https://github.com/goodwithtech/dockle/releases/download/v0.4.14/dockle_0.4.14_Linux-64bit.tar.gz \
    | tar xz -C /usr/local/bin dockle

# Syft - SBOM generator (v1.9.0)
RUN curl -sSL https://github.com/anchore/syft/releases/download/v1.9.0/syft_1.9.0_linux_amd64.tar.gz \
    | tar xz -C /usr/local/bin syft

# Verify installations
RUN hadolint --version && gitleaks version && dockle --version && syft version

# Set Puppeteer environment variables
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Build the Next.js application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
