# Troubleshooting Guide

## Issue: localhost:3001 Not Working

### Problem 1: Rust Not Installed ✅ (This is your issue)

**Symptoms:**
- `cargo: command not found`
- Cannot run `cargo run`

**Solution:**
1. **Install Rust**: https://rustup.rs/
   - Windows: Download and run `rustup-init.exe`
   - After installation, **restart your terminal**
   
2. **Verify installation**:
   ```powershell
   rustc --version
   cargo --version
   ```

3. **Run the backend**:
   ```powershell
   cd backend
   cargo run
   ```

### Problem 2: Missing API Keys

**Symptoms:**
- Server starts but returns errors when calling `/api/v1/chat`
- "Service unavailable" errors

**Solution:**
1. Edit `backend/.env` file
2. Add at least ONE API key:
   ```env
   OPENAI_API_KEY=sk-...
   # OR
   ANTHROPIC_API_KEY=sk-ant-...
   # OR  
   GOOGLE_GEMINI_API_KEY=...
   ```

### Problem 3: Port Already in Use

**Symptoms:**
- "Address already in use" error
- Cannot bind to port 3001

**Solution:**
1. Change port in `backend/.env`:
   ```env
   PORT=3002
   ```
2. Or kill the process using port 3001:
   ```powershell
   # Find process
   netstat -ano | findstr :3001
   # Kill it (replace PID)
   taskkill /PID <PID> /F
   ```

### Problem 4: Compilation Errors

**Symptoms:**
- `cargo build` fails with errors
- Type mismatches

**Solution:**
1. Make sure you're in the `backend/` directory
2. Clean and rebuild:
   ```powershell
   cargo clean
   cargo build
   ```
3. Check for missing dependencies in `Cargo.toml`

### Problem 5: Missing Build Tools (Windows)

**Symptoms:**
- "linker `cc` not found"
- "error: could not compile"

**Solution:**
Install one of these:
- **Visual Studio Build Tools**: https://visualstudio.microsoft.com/downloads/
  - Select "C++ build tools" workload
- **OR MinGW-w64**: https://www.mingw-w64.org/downloads/

### Problem 6: Server Starts But API Doesn't Respond

**Symptoms:**
- Server shows "ready" but curl/requests fail
- Connection refused

**Solution:**
1. Check if server is actually running:
   ```powershell
   # Should show process
   netstat -ano | findstr :3001
   ```
2. Check firewall settings
3. Try accessing `http://127.0.0.1:3001/health` instead of `localhost`

## Quick Test

Once Rust is installed and server is running:

```powershell
# Test health endpoint
curl http://localhost:3001/health
# Should return: OK

# Test chat endpoint (requires API key)
curl -X POST http://localhost:3001/api/v1/chat `
  -H "Content-Type: application/json" `
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

## Still Having Issues?

1. Check `backend/.env` exists and has at least one API key
2. Verify Rust installation: `cargo --version`
3. Check server logs for error messages
4. Make sure port 3001 is not blocked by firewall
