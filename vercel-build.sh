#!/bin/bash
set -e

echo "Starting optimized Rust/WASM build..."

# Set up paths
export CARGO_HOME="$HOME/.cargo"
export RUSTUP_HOME="$HOME/.rustup"
export PATH="$CARGO_HOME/bin:$PATH"

# Fast Rust installation check (use cached if available)
if [ ! -f "$CARGO_HOME/bin/cargo" ]; then
    echo "Installing Rust (cached for future builds)..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --no-modify-path
    export PATH="$CARGO_HOME/bin:$PATH"
else
    echo "Using cached Rust installation"
    export PATH="$CARGO_HOME/bin:$PATH"
fi

# Fast Trunk check (use cached if available)
if [ ! -f "$CARGO_HOME/bin/trunk" ]; then
    echo "Installing Trunk (cached for future builds)..."
    cargo install trunk --locked --quiet
else
    echo "Using cached Trunk installation"
fi

# Build with optimizations
echo "Building WASM..."
trunk build --release

echo "Build completed!"
