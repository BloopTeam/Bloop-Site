# Bloop Backend - Rust Implementation

High-performance Rust backend for the Bloop AI platform. Built to exceed KIMI k2.5 and Claude in performance, reliability, and capabilities.

## Why Rust?

- **Performance**: Near C++ speed with memory safety
- **Concurrency**: Excellent async/await for multi-agent orchestration
- **Safety**: Memory safety without garbage collection overhead
- **Reliability**: Strong type system prevents entire classes of bugs
- **Ecosystem**: Growing web framework ecosystem (Axum)

## Prerequisites

Install Rust from [rustup.rs](https://rustup.rs/):

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Or on Windows:
```powershell
# Download and run rustup-init.exe from https://rustup.rs/
```

## Setup

1. **Install Rust** (if not already installed)
2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Run the backend**:
   ```bash
   cd backend
   cargo run
   ```

## Development

```bash
# Run in development mode (with hot reload via cargo-watch)
cargo install cargo-watch
cargo watch -x run

# Run tests
cargo test

# Build for production
cargo build --release
```

## Architecture

```
backend/
├── src/
│   ├── main.rs              # Application entry point
│   ├── api/                 # API routes and handlers
│   │   └── routes/
│   ├── services/            # Business logic
│   │   ├── ai/             # AI model integrations
│   │   ├── agent/          # Agent orchestration
│   │   └── context/        # Context management
│   ├── middleware/          # HTTP middleware
│   ├── types/              # Shared types
│   ├── config/             # Configuration
│   └── utils/              # Utilities
└── Cargo.toml              # Dependencies
```

## Performance Targets

- **Latency**: < 50ms for model routing decisions
- **Throughput**: Handle 10,000+ concurrent agent tasks
- **Memory**: Efficient memory usage for large codebases
- **Speed**: 6x+ faster than single-agent systems

## API Endpoints

- `POST /api/v1/chat` - Chat with AI
- `POST /api/v1/agents/create` - Create agent task
- `GET /api/v1/agents/:id` - Get agent status
- `POST /api/v1/context/analyze` - Analyze codebase context
- `WS /api/v1/stream` - WebSocket streaming
