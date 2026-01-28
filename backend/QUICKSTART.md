# Quick Start Guide - Rust Backend

## 🚨 Issue: Rust Not Installed

The backend requires **Rust** to be installed. Here's how to fix it:

## Step 1: Install Rust

### Windows:
1. **Download Rust installer**: Go to https://rustup.rs/
2. **Run `rustup-init.exe`**
3. **Follow the prompts** (defaults are fine)
4. **Restart your terminal/PowerShell**

### Verify Installation:
```powershell
rustc --version
cargo --version
```

You should see version numbers. If you get "command not found", restart your terminal.

## Step 2: Set Up Environment

```powershell
cd backend
# Create .env file (copy from example if needed)
# Add at least ONE API key to test:
```

Create `backend/.env`:
```env
PORT=3001
OPENAI_API_KEY=your_key_here
# Or use Anthropic or Google instead
```

**Note**: You only need ONE API key to get started. The router will use whichever services are available.

## Step 3: Run the Backend

```powershell
cd backend
cargo run
```

**First time will take 5-10 minutes** (downloading and compiling dependencies)

You should see:
```
🚀 Starting Bloop Backend v0.1.0
📍 Listening on 0.0.0.0:3001
✅ Server ready at http://0.0.0.0:3001
```

## Step 4: Test the API

Open a new terminal and test:

```powershell
# Health check
curl http://localhost:3001/health

# Should return: OK
```

## Troubleshooting

### "cargo: command not found"
- **Solution**: Restart your terminal after installing Rust
- Or add Rust to PATH manually

### "error: linker `cc` not found" (Windows)
- **Solution**: Install [Build Tools for Visual Studio](https://visualstudio.microsoft.com/downloads/)
- Or install [MinGW-w64](https://www.mingw-w64.org/downloads/)

### "API key not set" errors
- **Solution**: Create `backend/.env` file with at least one API key
- The server will start but that service won't be available

### Port 3001 already in use
- **Solution**: Change PORT in `.env` to another port (e.g., 3002)

## Alternative: Quick Node.js Backend (Temporary)

If you want to test the frontend immediately while setting up Rust, I can create a simple Node.js backend. But Rust is recommended for production performance.

Let me know if you want the Node.js version or if you need help with Rust installation!
