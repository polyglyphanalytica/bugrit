# Multi-stage Dockerfile for production Next.js deployment on Cloud Run
# Firebase App Hosting compatible with Chromium for Puppeteer and security scanning tools
# Stage 1: Install dependencies and build
# Stage 2: Production runtime with standalone output

# ---- Stage 1: Build ----
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies needed for build)
RUN npm ci

# Copy application code
COPY . .

# Accept NEXT_PUBLIC build args (embedded into client JS at build time)
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID

# Build the Next.js application (standalone output)
ENV NODE_ENV=production
RUN npm run build

# ---- Stage 2: Production runtime ----
FROM node:20-slim AS runner

# Install Chromium, git, and dependencies for browser-based scanning tools
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

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy node_modules for serverExternalPackages that standalone doesn't bundle
# These are loaded via safeRequire() at runtime for scanning tools
COPY --from=builder /app/node_modules ./node_modules

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
