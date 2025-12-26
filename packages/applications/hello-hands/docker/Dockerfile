# Hello Hands - Game Session Container
#
# This container runs:
# 1. The Hello Hands WebSocket server (Node.js)
# 2. An nginx server to serve the client and proxy WebSocket connections
#
# Build from repo root:
#   docker build -f packages/applications/hello-hands/docker/Dockerfile -t hello-hands-gestures-app .

FROM node:24-bookworm-slim AS base

# Install nginx
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Build stage
FROM base AS builder

WORKDIR /build

# Copy package files
COPY package.json package-lock.json ./
COPY packages/framework/protocol/package.json ./packages/framework/protocol/
COPY packages/framework/server/package.json ./packages/framework/server/
COPY packages/framework/client/package.json ./packages/framework/client/
COPY packages/framework/input/package.json ./packages/framework/input/
COPY packages/framework/build/package.json ./packages/framework/build/
COPY packages/applications/hello-hands/package.json ./packages/applications/hello-hands/

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY packages/framework/protocol/ ./packages/framework/protocol/
COPY packages/framework/server/ ./packages/framework/server/
COPY packages/framework/client/ ./packages/framework/client/
COPY packages/framework/input/ ./packages/framework/input/
COPY packages/framework/build/ ./packages/framework/build/
COPY packages/applications/hello-hands/ ./packages/applications/hello-hands/

# Build framework packages first
RUN npm run build -w @gesture-app/framework-protocol
RUN npm run build -w @gesture-app/framework-server
RUN npm run build -w @gesture-app/framework-client
RUN npm run build -w @gesture-app/framework-input
RUN npm run build -w @gesture-app/framework-build

# Build hello-hands (server + shared)
RUN npm run build -w @gesture-app/hello-hands

# Build client
RUN npm run build:client -w @gesture-app/hello-hands

# Production stage
FROM base AS production

WORKDIR /app

# Copy package files for production install
COPY package.json package-lock.json ./
COPY packages/framework/protocol/package.json ./packages/framework/protocol/
COPY packages/framework/server/package.json ./packages/framework/server/
COPY packages/framework/client/package.json ./packages/framework/client/
COPY packages/framework/input/package.json ./packages/framework/input/
COPY packages/applications/hello-hands/package.json ./packages/applications/hello-hands/

# Install production dependencies only
RUN npm ci --omit=dev \
    --workspace=@gesture-app/framework-protocol \
    --workspace=@gesture-app/framework-server \
    --workspace=@gesture-app/framework-client \
    --workspace=@gesture-app/framework-input \
    --workspace=@gesture-app/hello-hands

# Copy built artifacts
COPY --from=builder /build/packages/framework/protocol/dist ./packages/framework/protocol/dist
COPY --from=builder /build/packages/framework/server/dist ./packages/framework/server/dist
COPY --from=builder /build/packages/framework/client/dist ./packages/framework/client/dist
COPY --from=builder /build/packages/framework/input/dist ./packages/framework/input/dist
COPY --from=builder /build/packages/applications/hello-hands/dist ./packages/applications/hello-hands/dist

# Copy client build to nginx html directory
COPY --from=builder /build/packages/applications/hello-hands/dist/client /usr/share/nginx/html

# Copy nginx config
COPY packages/applications/hello-hands/docker/nginx.conf /etc/nginx/nginx.conf

# Copy entrypoint script
COPY packages/applications/hello-hands/docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Environment variables
ENV PORT=8080
ENV SESSION_ID=""
ENV APP_ID="hello-hands"
ENV LOBBY_URL="https://gestures-apps.dx-tooling.org"

# Expose port 80 (nginx)
EXPOSE 80

# Start services
CMD ["/app/entrypoint.sh"]
