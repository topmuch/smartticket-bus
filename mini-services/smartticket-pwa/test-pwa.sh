#!/bin/bash
set -e

echo "╔══════════════════════════════════════════════════╗"
echo "║  🧪 SMARTTICKET PWA — TEST RUNNER               ║"
echo "╚══════════════════════════════════════════════════╝"

# Start backend
echo "🚀 Starting backend (3001)..."
cd /home/z/my-project/mini-services/smartticket-backend
node src/app.js > /tmp/backend-pwa.log 2>&1 &
BPID=$!
for i in $(seq 1 10); do
  curl -s --max-time 2 http://localhost:3001/api/v1/ > /dev/null 2>&1 && break
  sleep 1
done

# Start PWA
echo "🚀 Starting PWA (3002)..."
cd /home/z/my-project/mini-services/smartticket-pwa
npx vite --port 3002 --host > /tmp/pwa.log 2>&1 &
VITE_PID=$!
for i in $(seq 1 10); do
  curl -s --max-time 2 http://localhost:3002/ > /dev/null 2>&1 && break
  sleep 1
done

echo "✅ Both servers ready"
echo ""

# Run test
node test-pwa.cjs

# Cleanup
kill $BPID 2>/dev/null || true
kill $VITE_PID 2>/dev/null || true
wait $BPID 2>/dev/null || true
wait $VITE_PID 2>/dev/null || true
