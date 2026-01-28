# Bloop Site - Tech Repository

<p align="center">
  <img src="public/bloop-header.png" alt="Bloop" width="100%" />
</p>

<p align="center">
  <strong>The technical foundation for Bloop's AI-powered development platform.</strong>
</p>

<p align="center">
  <a href="#about-this-repo">About This Repo</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#security">Security</a>
</p>

---

## About This Repository

This is the **full-stack technical repository** for the Bloop platform. This repository contains:

- **Frontend UI** - React/TypeScript application (UI components from Bloop-UI)
- **Backend Infrastructure** - **75%+ Rust backend** with Node.js/TypeScript fallback
- **AI Services** - High-performance AI integrations and agent orchestration
- **Site Architecture** - Complete full-stack implementation

> **Note:** This repository is separate from the [Bloop UI](https://github.com/BloopTeam/Bloop-UI) repository, which contains **only** UI components. The UI repo is pure frontend with no backend code.

### Architecture Overview

**Backend: 75%+ Rust, 25% Node.js**
- **Rust (`backend/`)** - Primary backend (AI services, agent orchestration, code analysis)
- **Node.js (`server/`)** - Development fallback and API gateway
- **Frontend (`src/`)** - React UI components

### Repository Structure

```
Bloop-Site/
├── src/              # Frontend React app (UI components)
├── backend/          # Rust backend (75%+ of backend code)
│   └── src/         # Rust source code
├── server/           # Node.js backend (fallback/development)
│   └── services/    # TypeScript services
└── public/          # Static assets
```

---

## What is Bloop?

Bloop is not just another code editor—it's a complete reimagining of how developers interact with AI to build software. Every pixel, every interaction, and every feature has been designed from the ground up to create the most intuitive, powerful, and secure coding experience ever made.

This repository houses the technical implementation that powers the Bloop platform, including both the user interface and the backend services that make it all work.

---

## Security

Security isn't an afterthought—it's foundational to everything we build.

### Content Security
- Strict Content Security Policy (CSP) enforcement
- XSS protection with sanitized rendering
- No unsafe inline scripts or styles

### Input Validation
- All user inputs sanitized before processing
- Command injection prevention
- Path traversal protection

### Data Protection
- No telemetry without explicit consent
- Local-first architecture—your code stays yours
- Encrypted storage for sensitive configurations

### Secure Development
- Strict TypeScript with no `any` types in production
- Dependency auditing with automated vulnerability scanning
- Regular security reviews and updates

---

## Getting Started

### Prerequisites

**Required:**
- Node.js 18+ (for frontend)
- npm, yarn, or pnpm

**Recommended (for Rust backend):**
- Rust 1.70+ (see [RUST_SETUP.md](./RUST_SETUP.md))
- Cargo (comes with Rust)

> **Note:** Rust backend is recommended for production. Node.js backend works as a fallback for development.

### Installation

```bash
# Clone the repository
git clone https://github.com/BloopTeam/Bloop-Site.git

# Navigate to the project
cd Bloop-Site

# Install frontend dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add at least one AI API key:
# - OPENAI_API_KEY
# - ANTHROPIC_API_KEY
# - GOOGLE_GEMINI_API_KEY
```

### Running the Application

**Option 1: Rust Backend (Recommended - 75%+ of backend)**
```bash
# Install Rust first (see RUST_SETUP.md)
cd backend
cargo run
# Backend runs on http://localhost:3001

# In another terminal, start frontend
npm run dev
# Frontend runs on http://localhost:5173
```

**Option 2: Node.js Backend (Fallback - 25% of backend)**
```bash
# Quick start without Rust
npm run dev:api:node
# Backend runs on http://localhost:3001

# In another terminal, start frontend
npm run dev
# Frontend runs on http://localhost:5173
```

**Option 3: Both Together (Auto-detects Rust, falls back to Node.js)**
```bash
npm run dev:full
# Tries Rust backend first, falls back to Node.js if unavailable
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

### Build for Production

**Rust Backend (Recommended):**
```bash
# Build Rust backend
cd backend
cargo build --release
# Binary: backend/target/release/bloop-backend

# Build frontend
npm run build
```

**Node.js Backend (Fallback):**
```bash
# Build Node.js backend
npm run build:api:node

# Build frontend
npm run build
```

---

## Architecture

This repository follows a **hybrid backend architecture** (75%+ Rust, 25% Node.js):

```
Bloop-Site/
├── src/                  # Frontend (React/TypeScript)
│   ├── components/       # React UI components
│   ├── hooks/           # React hooks
│   └── utils/           # Frontend utilities
│
├── backend/              # Rust Backend (75%+ of backend code)
│   └── src/
│       ├── main.rs      # Axum web server
│       ├── api/         # API routes
│       ├── services/    # AI services, agents, code analysis
│       └── types/       # Rust types
│
└── server/               # Node.js Backend (25% - fallback)
    ├── index.ts         # Express server
    ├── api/routes/      # API routes
    └── services/        # TypeScript services
```

### Code Distribution

- **75%+ Rust** - AI services, agent orchestration, code analysis
- **25% Node.js** - API gateway, development fallback
- **100% TypeScript/React** - Frontend UI

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | Component architecture |
| TypeScript | Type-safe development |
| Vite | Build tooling and dev server |
| Tailwind CSS | Styling and design system |
| Lucide React | Iconography |

### Backend (75%+ Rust, 25% Node.js)

**Rust Backend (`backend/`)** - Primary implementation:
- **Axum** - High-performance async web framework
- **OpenAI API** - GPT-4 Turbo integration
- **Anthropic API** - Claude 3.5 Sonnet integration  
- **Google Gemini API** - Gemini 1.5 Pro integration
- **Intelligent Model Router** - Auto-selects best AI model per request
- **Agent Orchestration** - Multi-agent system (200+ agents)
- **Code Analysis** - AST parsing, dependency graphs
- **Performance** - 10-100x faster than Node.js for CPU-intensive tasks

**Node.js Backend (`server/`)** - Development fallback:
- **Express.js** - Quick development server
- Same AI integrations (for development/testing)
- Used when Rust isn't available or for quick prototyping

**Why Rust?**
- Superior performance for AI workloads
- Better concurrency for multi-agent systems
- Memory safety without GC overhead
- Perfect for code analysis and AST parsing

> **Production:** Rust backend is the primary implementation. Node.js is for development convenience.

### Infrastructure
- Vercel (deployment platform)
- CI/CD pipelines
- Monitoring and analytics

---

## Development Workflow

This repository is actively developed for the Bloop platform. When working on this codebase:

1. **UI Changes** - UI components are included here for the site, but major UI design work should be coordinated with the [Bloop UI](https://github.com/BloopTeam/Bloop-UI) repository
2. **Backend Development** - All backend, API, and infrastructure work happens here
3. **Integration** - This is where UI and backend come together

---

## Contributing

We welcome contributions from developers who share our vision. Please read our contributing guidelines and code of conduct before submitting pull requests.

**Note:** For UI/design contributions, please also check the [Bloop UI](https://github.com/BloopTeam/Bloop-UI) repository.

---

## License

MIT License — Build on it, improve it, make it yours.

---

<p align="center">
  <strong>Ready to change how you code?</strong>
</p>

<p align="center">
  Star this repository to follow our journey.
</p>
