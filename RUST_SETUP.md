# Rust Backend Setup Guide

## Why Rust?

We're using **Rust** for the backend instead of TypeScript/Node.js because:

- **Performance**: Near C++ speed (10-100x faster than Node.js for CPU-intensive tasks)
- **Memory Safety**: Zero-cost abstractions with compile-time guarantees
- **Concurrency**: Excellent async/await for handling 200+ agents simultaneously
- **Reliability**: Strong type system prevents entire classes of bugs
- **Perfect for AI**: Ideal for code analysis, AST parsing, and agent orchestration

## Installation

### 1. Install Rust

**Windows:**
1. Download [rustup-init.exe](https://rustup.rs/)
2. Run the installer
3. Restart your terminal

**macOS/Linux:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 2. Verify Installation

```bash
rustc --version
cargo --version
```

### 3. Set Up Environment

```bash
cd backend
cp .env.example .env
# Edit .env with your API keys:
# - OPENAI_API_KEY
# - ANTHROPIC_API_KEY  
# - GOOGLE_GEMINI_API_KEY
```

### 4. Install Development Tools

```bash
# Cargo watch for hot reload
cargo install cargo-watch

# Clippy for linting
rustup component add clippy

# Rustfmt for formatting
rustup component add rustfmt
```

## Running the Backend

```bash
# Development mode (with hot reload)
cd backend
cargo watch -x run

# Or standard run
cargo run

# Production build
cargo build --release
# Binary will be at: backend/target/release/bloop-backend
```

## Development Workflow

```bash
# Format code
cargo fmt

# Lint code
cargo clippy

# Run tests
cargo test

# Check without building
cargo check
```

## Project Structure

```
backend/
├── Cargo.toml          # Dependencies and project config
├── src/
│   ├── main.rs        # Entry point
│   ├── config.rs       # Configuration
│   ├── types.rs        # Shared types
│   ├── api/           # API routes
│   │   └── routes/
│   ├── services/      # Business logic
│   │   ├── ai/        # AI integrations
│   │   ├── agent/     # Agent system
│   │   └── context/   # Context management
│   ├── middleware/    # HTTP middleware
│   └── utils/         # Utilities
└── .env               # Environment variables
```

## Performance Benefits

- **10-100x faster** than Node.js for CPU-intensive tasks
- **Lower memory usage** - no garbage collection overhead
- **Better concurrency** - can handle thousands of concurrent requests
- **Type safety** - catches bugs at compile time, not runtime

## Next Steps

1. Install Rust (see above)
2. Set up `.env` file with API keys
3. Run `cargo run` in the `backend/` directory
4. The API will be available at `http://localhost:3001`

## Troubleshooting

**"cargo: command not found"**
- Make sure Rust is installed and PATH is updated
- Restart your terminal after installation

**"error: linker `cc` not found"**
- Windows: Install [Build Tools for Visual Studio](https://visualstudio.microsoft.com/downloads/)
- macOS: `xcode-select --install`
- Linux: `sudo apt-get install build-essential` (or equivalent)

**Compilation errors**
- Run `cargo clean` and try again
- Make sure you're using Rust 1.70+ (`rustc --version`)
