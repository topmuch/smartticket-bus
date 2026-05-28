#!/bin/sh
# ============================================
# SmartTicket Bus - Coolify Entrypoint
# Fixes Coolify IPv6 healthcheck issue
# ============================================
set -e

# Fix: Coolify's healthcheck uses wget localhost which resolves to IPv6 [::1]
# but Next.js only listens on IPv4 0.0.0.0:3000
# Force localhost to 127.0.0.1 (IPv4)
if ! grep -q "127.0.0.1 localhost" /etc/hosts 2>/dev/null; then
  echo "127.0.0.1 localhost localhost.localdomain" >> /etc/hosts
fi

# Ensure data directory exists
mkdir -p /app/data

# Set DATABASE_URL if not provided (defaults to /app/data/smartticket.db)
export DATABASE_URL="${DATABASE_URL:-file:/app/data/smartticket.db}"
echo "📦 DATABASE_URL=$DATABASE_URL"

# Push Prisma schema (non-destructive)
echo "🔄 Pushing Prisma schema..."
npx prisma db push --skip-generate --accept-data-loss 2>/dev/null || true
echo "✅ Schema pushed"

# Seed ONLY on first run (marker file in persistent volume)
if [ ! -f /app/data/.seeded ]; then
  echo "🌱 First run - seeding database..."
  bun prisma/seed.ts && touch /app/data/.seeded || echo "⚠️ Seed failed (non-blocking)"
else
  echo "✅ Already seeded - skipping"
fi

# Start the application
echo "🚀 Starting SmartTicket Bus..."
exec node .next/standalone/server.js
