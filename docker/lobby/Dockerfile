# Lobby Container
# Contains: Express server serving static frontend + REST API
# Base: node:24-bookworm-slim (Debian-based)

FROM node:24-bookworm-slim AS base

# Build stage - compile TypeScript
FROM base AS builder

WORKDIR /build

# Copy package files
COPY package.json package-lock.json ./
COPY packages/lobby/package.json ./packages/lobby/

# Install all dependencies (including dev)
RUN npm ci --workspace=@gesture-app/lobby

# Copy source code
COPY packages/lobby/ ./packages/lobby/

# Build lobby (server + frontend)
RUN npm run build -w @gesture-app/lobby

# Production stage
FROM base AS production

WORKDIR /app

# Install Docker CLI to communicate with host Docker daemon
# We'll mount /var/run/docker.sock from the host
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
    && chmod a+r /etc/apt/keyrings/docker.asc \
    && echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update \
    && apt-get install -y --no-install-recommends docker.io \
    && rm -rf /var/lib/apt/lists/*

# Copy package files for production install
COPY package.json package-lock.json ./
COPY packages/lobby/package.json ./packages/lobby/

# Install production dependencies only
RUN npm ci --omit=dev --workspace=@gesture-app/lobby

# Copy built artifacts
COPY --from=builder /build/packages/lobby/dist ./dist
COPY --from=builder /build/packages/lobby/public ./public

# Environment variables
ENV PORT=80
ENV NODE_ENV=production
ENV DOCKER_WRAPPER_PATH=/app/bin/docker-cli-wrapper.sh

# Expose port 80
EXPOSE 80

# Start server
CMD ["node", "dist/index.js"]

