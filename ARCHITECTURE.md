# Bloop Site Architecture

## Overview

Bloop Site uses a **hybrid backend architecture** with **Rust** and **Node.js**, designed to exceed KIMI k2.5 and Claude in performance and capabilities.

## Architecture Philosophy

**Rust First, Node.js Fallback**
- **Rust (`backend/`)** - Primary backend for production
- **Node.js (`server/`)** - Development fallback and API gateway
- **Frontend (`src/`)** - React/TypeScript UI components

## Backend Architecture

### Rust Backend (Primary)

**Location:** `backend/`

**Why Rust?**
- **10-100x faster** than Node.js for CPU-intensive tasks
- **Better concurrency** - Handles 200+ agents simultaneously
- **Memory safety** - No garbage collection overhead
- **Perfect for AI** - Code analysis, AST parsing, agent orchestration

**Structure:**
```
backend/
├── src/
│   ├── main.rs              # Axum web server
│   ├── api/                 # API routes
│   │   └── routes/
│   ├── services/            # Business logic
│   │   ├── ai/             # AI model integrations
│   │   ├── agent/          # Agent orchestration (200+ agents)
│   │   └── context/        # Codebase context management
│   ├── types/              # Shared types
│   └── config/             # Configuration
└── Cargo.toml              # Rust dependencies
```

**Key Features:**
- Multi-agent orchestration (200+ agents)
- Intelligent model routing
- AST parsing and code analysis
- High-performance AI integrations

### Node.js Backend (Fallback)

**Location:** `server/`

**Purpose:**
- Quick development when Rust isn't installed
- API gateway and routing
- Development/testing convenience

**Structure:**
```
server/
├── index.ts                # Express server
├── api/routes/            # API route handlers
├── services/              # TypeScript services
│   ├── ai/               # AI integrations (mirrors Rust)
│   └── ...
└── types/                # TypeScript types
```

## Frontend Architecture

**Location:** `src/`

Pure React/TypeScript UI components that connect to backend APIs.

```
src/
├── components/          # React UI components
│   ├── AssistantPanel   # AI assistant UI
│   ├── EditorArea       # Code editor
│   └── ...
├── hooks/              # React hooks
├── utils/              # Frontend utilities
└── types/              # TypeScript types
```

## Code Distribution

### Backend Code: Rust

- **AI Services** - Rust (OpenAI, Anthropic, Google)
- **Model Router** - Rust (intelligent selection)
- **Agent System** - Rust (multi-agent orchestration)
- **Code Analysis** - Rust (AST parsing, dependency graphs)
- **Context Management** - Rust (codebase understanding)

### Backend Code: Node.js

- **API Gateway** - Node.js (Express routing)
- **Development Server** - Node.js (quick start)
- **Fallback Services** - Node.js (when Rust unavailable)

### Frontend Code: TypeScript/React

- All UI components in TypeScript/React
- No backend code in frontend
- Connects to backend via HTTP/WebSocket

## Development Workflow

### Option 1: Rust Backend (Recommended)
```bash
# Install Rust first (see RUST_SETUP.md)
cd backend
cargo run
```

### Option 2: Node.js Backend (Fallback)
```bash
# Quick start without Rust
npm run dev:api:node
```

### Option 3: Both Together
```bash
npm run dev:full
# Tries Rust first, falls back to Node.js
```

## Production Deployment

**Primary:** Deploy Rust backend binary
- Compile: `cargo build --release`
- Binary: `backend/target/release/bloop-backend`
- Deploy binary to server

**Fallback:** Deploy Node.js backend
- Build: `npm run build:api:node`
- Deploy: Standard Node.js deployment

## Performance Targets

- **Latency**: < 50ms for model routing (Rust)
- **Throughput**: 10,000+ concurrent requests (Rust)
- **Agent Capacity**: 200+ simultaneous agents (Rust)
- **Speed**: 6x+ faster than single-agent systems

## Why This Architecture?

1. **Rust** - Maximum performance for AI workloads
2. **Node.js** - Development convenience and fallback
3. **Clear Separation** - Frontend, backend, and services are distinct
4. **Scalability** - Rust handles heavy workloads, Node.js handles routing

This architecture ensures we exceed KIMI k2.5 in performance while maintaining development flexibility.
