#!/bin/sh
set -e

mkdir -p /app/data
export DATABASE_URL=file:/app/data/smartticket.db

echo "[entrypoint] Pushing schema..."
npx prisma db push --skip-generate 2>/dev/null || true

echo "[entrypoint] Creating admin..."
node scripts/create-admin.cjs

if [ ! -f /app/data/.seeded ]; then
  echo "[entrypoint] Seeding database..."
  npx tsx prisma/seed.ts || true
  touch /app/data/.seeded
fi

echo "[entrypoint] Starting server..."
exec node .next/standalone/server.js
