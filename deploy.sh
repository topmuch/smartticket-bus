#!/bin/bash
# SmartTicket Bus - Production Deployment Script
set -e

echo "🚌 SmartTicket Bus - Production Deploy"
echo "========================================"

# Check .env.production
if [ ! -f .env.production ]; then
  echo "❌ .env.production not found!"
  echo "   Copy .env.production.example to .env.production and fill in the secrets"
  exit 1
fi

# Load environment
export $(grep -v '^#' .env.production | xargs)

# Validate secrets
if [ "$JWT_SECRET" = "CHANGE_ME_GENERATE_WITH_CRYPTO_RANDOMBYTES" ]; then
  echo "❌ JWT_SECRET not configured!"
  exit 1
fi

echo "✅ Environment validated"
echo ""

# Build all images
echo "🔨 Building Docker images..."
docker compose build --no-cache

echo ""
echo "🚀 Starting services..."
docker compose up -d

echo ""
echo "⏳ Waiting for services..."
sleep 10

# Check health
echo ""
echo "📋 Service Status:"
docker compose ps

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "   Main App:    http://localhost"
echo "   API:         http://localhost/api/v1"
echo "   Controller:  http://localhost/controller/"
echo "   Counter:     http://localhost/counter/"
echo ""
echo "   Logs: docker compose logs -f"
echo "   Stop: docker compose down"
