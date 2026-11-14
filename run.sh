#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  🔥 Starting ZeroBurn (Backend + Frontend + PostgreSQL)  "
echo "=========================================================="

# 1. Start PostgreSQL on port 5433 if not running
if ! /usr/lib/postgresql/18/bin/psql -h 127.0.0.1 -p 5433 -U postgres -c "SELECT 1;" >/dev/null 2>&1; then
    echo "[1/3] Starting user PostgreSQL cluster on port 5433..."
    /usr/lib/postgresql/18/bin/pg_ctl -D /home/ridam/pgdata -o "-p 5433 -k /tmp" -l /home/ridam/pgdata/logfile start
else
    echo "[1/3] PostgreSQL is already running on port 5433."
fi

# Detect LAN IP
LAN_IP=$(ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | head -n 1 || echo "localhost")

echo "Detected LAN IP: ${LAN_IP}"
echo ""
echo "[2/3] Launching Spring Boot Backend on http://0.0.0.0:8080..."
cd /home/ridam/Documents/pbls/backend
./mvnw spring-boot:run &
BACKEND_PID=$!

echo "[3/3] Launching Vite Frontend on http://0.0.0.0:5173..."
cd /home/ridam/Documents/pbls/frontend
npm run dev -- --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!

# 4. Optional Cloudflare Quick Tunnel for guaranteed mobile access (no AP-isolation/firewall blocks)
TUNNEL_PID=""
if [ -f "/home/ridam/.gemini/antigravity/cloudflared" ]; then
    echo "[4/4] Starting Cloudflare Quick Tunnel for 100% reliable mobile phone access..."
    /home/ridam/.gemini/antigravity/cloudflared tunnel --url http://localhost:5173 > /home/ridam/Documents/pbls/tunnel.log 2>&1 &
    TUNNEL_PID=$!
    for i in {1..8}; do
        TUNNEL_URL=$(grep -o 'https://[a-zA-Z0-9.-]*\.trycloudflare\.com' /home/ridam/Documents/pbls/tunnel.log | head -n 1 || true)
        if [ -n "$TUNNEL_URL" ]; then break; fi
        sleep 1
    done
fi

trap "kill $BACKEND_PID $FRONTEND_PID $TUNNEL_PID 2>/dev/null; exit 0" SIGINT SIGTERM

echo ""
echo "=========================================================="
echo "  ✅ ZeroBurn is LIVE!"
echo "  💻 Laptop Browser:   http://localhost:5173"
echo "  📱 Mobile Wi-Fi IP:  http://${LAN_IP}:5173"
if [ -n "$TUNNEL_URL" ]; then
echo "  🌐 Mobile (Anywhere): $TUNNEL_URL"
fi
echo "=========================================================="
echo "Press Ctrl+C to stop both servers."

wait
