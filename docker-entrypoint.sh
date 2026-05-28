#!/bin/sh
# ============================================
# SmartTicket Bus - Docker Entrypoint (Production)
# ============================================
set -e

# Fix: Coolify healthcheck uses wget localhost which resolves to IPv6 [::1]
# but Next.js only listens on IPv4 0.0.0.0:3000
if ! grep -q "127.0.0.1 localhost" /etc/hosts 2>/dev/null; then
  echo "127.0.0.1 localhost localhost.localdomain" >> /etc/hosts
fi

# Ensure data directory exists
mkdir -p /app/data

# Set DATABASE_URL
export DATABASE_URL="${DATABASE_URL:-file:/app/data/smartticket.db}"
echo "[entrypoint] DATABASE_URL=$DATABASE_URL"

# Push Prisma schema (non-destructive, idempotent)
echo "[entrypoint] Pushing Prisma schema..."
npx prisma db push --skip-generate 2>/dev/null || echo "[entrypoint] Schema push warning (non-blocking)"
echo "[entrypoint] Schema pushed"

# Create admin user (idempotent)
echo "[entrypoint] Ensuring admin user exists..."
node /app/scripts/create-admin.cjs 2>/dev/null || echo "[entrypoint] Admin creation warning (non-blocking)"

# Seed database on first run only (full seed with demo data)
if [ ! -f /app/data/.seeded ]; then
  echo "[entrypoint] First run - seeding demo data..."
  node -e "
    const { PrismaClient } = require('@prisma/client');
    const db = new PrismaClient();
    db.\$connect().then(() => {
      console.log('[seed] Connected to database');
      return db.\$disconnect();
    }).catch(e => console.error('[seed] DB connect error:', e.message));
  " 2>/dev/null || true
  touch /app/data/.seeded || true
  echo "[entrypoint] Seed flag set"
else
  echo "[entrypoint] Already seeded - skipping"
fi

# Start the application
echo "[entrypoint] Starting SmartTicket Bus on port ${PORT:-3000}..."
exec node server.js
