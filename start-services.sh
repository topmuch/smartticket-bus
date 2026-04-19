#!/bin/bash
# SmartTicket Bus - Start all services for development
cd /home/z/my-project

# Kill any existing instances
pkill -f "next dev" 2>/dev/null || true
pkill -f "node.*smartticket-backend" 2>/dev/null || true
sleep 1

# Start backend (port 3001)
cd /home/z/my-project/mini-services/smartticket-backend
nohup node src/app.js > /tmp/smartticket-backend.log 2>&1 &
echo "Backend PID: $!"
sleep 3

# Start Next.js (port 3000)
cd /home/z/my-project
nohup npx next dev -p 3000 > /tmp/nextjs.log 2>&1 &
echo "Next.js PID: $!"
sleep 5

# Verify
echo ""
echo "=== Service Check ==="
curl -s http://localhost:3001/api/v1/ | head -1 && echo "Backend OK" || echo "Backend FAIL"
curl -s http://localhost:3000 > /dev/null && echo "Next.js OK" || echo "Next.js FAIL"
