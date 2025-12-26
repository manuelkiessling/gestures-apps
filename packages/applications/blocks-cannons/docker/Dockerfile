# Blocks & Cannons Game Session Container
# Contains: nginx (static client) + game server + optional bot
# Base: node:24-bookworm-slim (Debian-based)
#
# Build from repo root:
#   docker build -f packages/applications/blocks-cannons/docker/Dockerfile -t blocks-cannons-game-session .

FROM node:24-bookworm-slim AS base

# Install nginx
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Build stage - compile TypeScript
FROM base AS builder

WORKDIR /build

# Copy package files
COPY package.json package-lock.json ./
COPY packages/framework/protocol/package.json ./packages/framework/protocol/
COPY packages/framework/server/package.json ./packages/framework/server/
COPY packages/framework/client/package.json ./packages/framework/client/
COPY packages/applications/blocks-cannons/package.json ./packages/applications/blocks-cannons/

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY packages/framework/protocol/ ./packages/framework/protocol/
COPY packages/framework/server/ ./packages/framework/server/
COPY packages/framework/client/ ./packages/framework/client/
COPY packages/applications/blocks-cannons/ ./packages/applications/blocks-cannons/

# Build framework packages first
RUN npm run build -w @gesture-app/framework-protocol
RUN npm run build -w @gesture-app/framework-server
RUN npm run build -w @gesture-app/framework-client

# Build blocks-cannons (server + shared)
RUN npm run build -w @gesture-app/blocks-cannons

# Build client
RUN npm run build:client -w @gesture-app/blocks-cannons

# Production stage
FROM base AS production

WORKDIR /app

# Copy package files for production install
COPY package.json package-lock.json ./
COPY packages/framework/protocol/package.json ./packages/framework/protocol/
COPY packages/framework/server/package.json ./packages/framework/server/
COPY packages/framework/client/package.json ./packages/framework/client/
COPY packages/applications/blocks-cannons/package.json ./packages/applications/blocks-cannons/

# Install production dependencies only
RUN npm ci --omit=dev \
    --workspace=@gesture-app/framework-protocol \
    --workspace=@gesture-app/framework-server \
    --workspace=@gesture-app/framework-client \
    --workspace=@gesture-app/blocks-cannons

# Copy built artifacts
COPY --from=builder /build/packages/framework/protocol/dist ./packages/framework/protocol/dist
COPY --from=builder /build/packages/framework/server/dist ./packages/framework/server/dist
COPY --from=builder /build/packages/framework/client/dist ./packages/framework/client/dist
COPY --from=builder /build/packages/applications/blocks-cannons/dist ./packages/applications/blocks-cannons/dist

# Copy config to expected location (code looks for ./config/game.yaml relative to cwd)
COPY --from=builder /build/packages/applications/blocks-cannons/config ./config

# Copy client build
COPY --from=builder /build/packages/applications/blocks-cannons/dist/client ./client

# Copy nginx config
COPY packages/applications/blocks-cannons/docker/nginx.conf /etc/nginx/nginx.conf

# Copy entrypoint script
COPY packages/applications/blocks-cannons/docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Environment variables
ENV PORT=3001
ENV SESSION_ID=""
ENV APP_ID="blocks-cannons"
ENV WITH_BOT="false"
ENV BOT_DIFFICULTY="0.5"
ENV LOBBY_URL="https://gestures-apps.dx-tooling.org"

# Expose port 80 (nginx)
EXPOSE 80

# Start services
CMD ["/entrypoint.sh"]
