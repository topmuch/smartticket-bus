# =============================================
# SmartTicket Bus - Production Dockerfile v3
# Self-contained: no external script files needed
# Designed for Coolify
# =============================================
FROM node:20-alpine

# System dependencies
RUN apk add --no-cache libc6-compat sqlite-libs && npm i -g bun

WORKDIR /app

# Copy package files first for better caching
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js standalone
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=file:/app/data/smartticket.db
RUN bun run build

# ---- Production ----
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=file:/app/data/smartticket.db

RUN mkdir -p /app/data

# Create self-contained entrypoint script (no external files needed)
RUN printf '%s\n' '#!/bin/sh' \
  'set -e' \
  '' \
  '# Fix IPv6 localhost for Coolify healthcheck' \
  'if ! grep -q "127.0.0.1 localhost" /etc/hosts 2>/dev/null; then' \
  '  echo "127.0.0.1 localhost localhost.localdomain" >> /etc/hosts' \
  'fi' \
  '' \
  'mkdir -p /app/data' \
  'export DATABASE_URL="${DATABASE_URL:-file:/app/data/smartticket.db}"' \
  'echo "[entrypoint] DATABASE_URL=$DATABASE_URL"' \
  '' \
  '# Push Prisma schema' \
  'echo "[entrypoint] Pushing Prisma schema..."' \
  'npx prisma db push --skip-generate 2>/dev/null || true' \
  '' \
  '# Create admin user' \
  'echo "[entrypoint] Creating admin user..."' \
  'node -e "' \
  'const {PrismaClient}=require(\"@prisma/client\");' \
  'const bcrypt=require(\"bcryptjs\");' \
  '(async()=>{' \
  'const db=new PrismaClient();' \
  'try{' \
  'const e=process.env.ADMIN_EMAIL||\"admin@smartticket.bus\";' \
  'const p=process.env.ADMIN_PASSWORD||\"admin123\";' \
  'const n=process.env.ADMIN_NAME||\"Super Admin\";' \
  'const ex=await db.user.findUnique({where:{email:e}});' \
  'if(ex){console.log(\"Admin exists\");return;}' \
  'const h=await bcrypt.hash(p,12);' \
  'await db.user.create({data:{email:e,passwordHash:h,name:n,role:\"SUPERADMIN\",isActive:true}});' \
  'console.log(\"Admin created\");' \
  '}catch(err){console.error(err.message);}' \
  'await db.\$disconnect();' \
  '})();' \
  '" 2>/dev/null || true' \
  '' \
  '# Seed flag' \
  'if [ ! -f /app/data/.seeded ]; then' \
  '  touch /app/data/.seeded' \
  '  echo "[entrypoint] First run complete"' \
  'else' \
  '  echo "[entrypoint] Already initialized"' \
  'fi' \
  '' \
  '# Start server' \
  'echo "[entrypoint] Starting SmartTicket Bus..."' \
  'exec node server.js' \
  > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]
