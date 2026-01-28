# Quick Start Guide

## 🚀 Get Running

### Option 1: Rust Backend (Recommended - 75%+ of backend)

**1. Install Rust** (if not already installed)
```bash
# See RUST_SETUP.md for detailed instructions
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

**2. Install Frontend Dependencies**
```bash
npm install
```

**3. Set Up API Keys**
Edit `.env` file in the root directory:
```env
# Add at least ONE API key:
OPENAI_API_KEY=sk-your-key-here
# OR
ANTHROPIC_API_KEY=sk-ant-your-key-here
# OR
GOOGLE_GEMINI_API_KEY=your-key-here

PORT=3001
CORS_ORIGIN=http://localhost:5173
```

**4. Start Rust Backend**
```bash
cd backend
cargo run
```

**5. Start Frontend** (in another terminal)
```bash
npm run dev
```

### Option 2: Node.js Backend (Fallback - 25% of backend)

**1. Install Dependencies**
```bash
npm install
```

**2. Set Up API Keys** (same as above)

**3. Start Node.js Backend**
```bash
npm run dev:api:node
```

**4. Start Frontend** (in another terminal)
```bash
npm run dev
```

### Option 3: Auto-Detect (Tries Rust, Falls Back to Node.js)

```bash
npm run dev:full
```

## ✅ Verify It's Working

Open your browser:
- Frontend: http://localhost:5173
- Backend health: http://localhost:3001/health

## 🎯 Test the API

```bash
# Health check
curl http://localhost:3001/health

# Chat endpoint (requires API key)
curl -X POST http://localhost:3001/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello!"}]}'
```

## 📁 Project Structure

```
Bloop-Site/
├── src/              # Frontend React app (100% TypeScript/React)
├── backend/          # Rust backend (75%+ of backend code)
│   └── src/         # Rust source code
├── server/           # Node.js backend (25% - fallback)
│   ├── api/         # API routes
│   └── services/    # TypeScript services
└── .env             # Environment variables
```

**Code Distribution:**
- **75%+ Rust** - AI services, agents, code analysis
- **25% Node.js** - API gateway, development fallback
- **100% TypeScript/React** - Frontend UI

## 🐛 Troubleshooting

**Rust not installed?**
- Install Rust: See `RUST_SETUP.md` for instructions
- Or use Node.js fallback: `npm run dev:api:node`

**Port 3001 already in use?**
- Change `PORT` in `.env` to another port (e.g., 3002)

**API returns errors?**
- Make sure at least one API key is set in `.env`
- Check server logs for error messages
- Rust backend: Check `backend/` logs
- Node.js backend: Check terminal output

**Frontend can't connect?**
- Make sure backend is running on port 3001
- Check CORS_ORIGIN in `.env` matches frontend URL
- Verify backend health: `curl http://localhost:3001/health`

## 🚀 Next Steps

1. Add your API keys to `.env`
2. Run `npm run dev:full`
3. Start building Phase 2 features!
