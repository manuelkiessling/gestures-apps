#!/bin/sh
set -e

echo "=== Hello Hands Session Container ==="
echo "SESSION_ID: ${SESSION_ID:-not set}"
echo "APP_ID: ${APP_ID:-hello-hands}"
echo "LOBBY_URL: ${LOBBY_URL:-not set}"

# Generate session config JSON for the client
LOBBY_URL="${LOBBY_URL:-https://gestures-apps.dx-tooling.org}"
WS_URL="wss://${SESSION_ID}-${APP_ID}-gestures.dx-tooling.org/ws"

cat > /usr/share/nginx/html/session.json << EOF
{
  "appId": "${APP_ID}",
  "sessionId": "${SESSION_ID}",
  "wsUrl": "${WS_URL}",
  "lobbyUrl": "${LOBBY_URL}"
}
EOF

echo "Generated session config: $(cat /usr/share/nginx/html/session.json)"

# Start nginx in background
nginx

# Start the Hello Hands server
echo "Starting Hello Hands server on port 8080..."
cd /app/packages/applications/hello-hands
exec node dist/server/server.js

