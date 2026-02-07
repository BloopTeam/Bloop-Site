# ─── Stage 1: Build frontend ──────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files first (cache layer)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ─── Stage 2: Production runtime ─────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# Install native build tools for better-sqlite3
RUN apk add --no-cache python3 make g++

# Install production deps only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Remove build tools after native modules are compiled
RUN apk del python3 make g++

# Copy built frontend
COPY --from=builder /app/dist ./dist

# Copy server source (tsx runs TypeScript directly)
COPY server/ ./server/

# Create persistent data directories
RUN mkdir -p data workspaces && chown -R node:node data workspaces

# Security: run as non-root
USER node

# Environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/health || exit 1

CMD ["npx", "tsx", "server/dev-server.ts"]
