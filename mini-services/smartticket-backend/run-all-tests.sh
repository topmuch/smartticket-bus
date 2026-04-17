#!/bin/bash
# SmartTicket Bus - Complete Test Runner
# Starts server, runs ALL tests, logs results, shuts down
set -e

BACKEND_DIR="/home/z/my-project/mini-services/smartticket-backend"
LOG_DIR="/home/z/my-project"
SERVER_PID=""

cleanup() {
  echo ""
  echo "🧹 Cleaning up..."
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  🧪 SMARTTICKET BUS - TEST RUNNER COMPLET                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Start server in background
echo "🚀 Starting backend server..."
cd "$BACKEND_DIR"
bun src/app.js > /tmp/backend-test.log 2>&1 &
SERVER_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for server..."
for i in $(seq 1 15); do
  if curl -s --max-time 2 http://localhost:3001/ > /dev/null 2>&1; then
    echo "✅ Server ready (after ${i}s)"
    break
  fi
  if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "❌ Server crashed!"
    cat /tmp/backend-test.log
    exit 1
  fi
  sleep 1
done

# Verify server is up
if ! curl -s --max-time 5 http://localhost:3001/ > /dev/null 2>&1; then
  echo "❌ Server not responding after 15s!"
  cat /tmp/backend-test.log
  exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  PHASE 1: SECURITY TESTS (63 tests)"
echo "═══════════════════════════════════════════════════════════════"
cd "$BACKEND_DIR"
node test-security.js
SEC_RESULT=$?

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  PHASE 2: API TESTS (47 tests)"
echo "═══════════════════════════════════════════════════════════════"

# Kill server and re-seed for clean state (resets in-memory rate limiter)
echo "🔄 Restarting server for clean API test state..."
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true
sleep 1

# Re-seed database
rm -f data/smartticket.db
bun run seed.js > /dev/null 2>&1

# Start fresh server
bun src/app.js > /tmp/backend-test.log 2>&1 &
SERVER_PID=$!

echo "⏳ Waiting for server..."
for i in $(seq 1 15); do
  if curl -s --max-time 2 http://localhost:3001/ > /dev/null 2>&1; then
    echo "✅ Server ready (after ${i}s)"
    break
  fi
  if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "❌ Server crashed!"
    cat /tmp/backend-test.log
    exit 1
  fi
  sleep 1
done

if ! curl -s --max-time 5 http://localhost:3001/ > /dev/null 2>&1; then
  echo "❌ Server failed to restart!"
  cat /tmp/backend-test.log
  exit 1
fi

bun test-api.js
API_RESULT=$?

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  TEST RESULTS SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Security Tests:  $([ $SEC_RESULT -eq 0 ] && echo '✅ ALL PASS' || echo '❌ FAILURES')"
echo "  API Tests:       $([ $API_RESULT -eq 0 ] && echo '✅ ALL PASS' || echo '❌ FAILURES')"
echo ""
if [ $SEC_RESULT -eq 0 ] && [ $API_RESULT -eq 0 ]; then
  echo "  🎉 110/110 — 100% SUCCESS RATE"
else
  echo "  ⚠️  Some tests failed — see above for details"
fi
echo ""

# Server log (last 20 lines)
echo "═══════════════════════════════════════════════════════════════"
echo "  SERVER LOG (last 20 lines)"
echo "═══════════════════════════════════════════════════════════════"
tail -20 /tmp/backend-test.log

exit $((SEC_RESULT + API_RESULT))
