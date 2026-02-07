# ─── Stage 1: Build frontend ──────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files first (cache layer)
COPY package.json package-lock.json ./
RUN npm ci --production=false

# Copy source and build
COPY . .
RUN npm run build

# ─── Stage 2: Production runtime ─────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# Install production deps only
COPY package.json package-lock.json ./
RUN npm ci --production && npm cache clean --force

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy server source (tsx runs TypeScript directly)
COPY server/ ./server/

# Create data directory for SQLite
RUN mkdir -p data && chown -R node:node data

# Security: run as non-root
USER node

# Environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/health || exit 1

CMD ["npx", "tsx", "server/dev-server.ts"]
