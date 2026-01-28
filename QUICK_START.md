# Quick Start Guide

## 🚀 Get Running in 2 Minutes

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up API Keys

Edit `.env` file in the root directory:

```env
# Add at least ONE API key to get started:
OPENAI_API_KEY=sk-your-key-here
# OR
ANTHROPIC_API_KEY=sk-ant-your-key-here
# OR
GOOGLE_GEMINI_API_KEY=your-key-here

# Server config (optional)
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

### 3. Start the Backend

```bash
npm run dev:api
```

You should see:
```
🚀 Bloop Backend running on http://localhost:3001
✅ Health check: http://localhost:3001/health
```

### 4. Start the Frontend (in another terminal)

```bash
npm run dev
```

### 5. Or Run Both Together

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
├── src/              # Frontend React app
├── server/           # Backend API (Node.js/TypeScript)
│   ├── api/         # API routes
│   ├── services/    # Business logic (AI, agents, context)
│   └── types/       # TypeScript types
├── backend/          # Rust backend (optional, for production)
└── .env             # Environment variables
```

## 🐛 Troubleshooting

**Port 3001 already in use?**
- Change `PORT` in `.env` to another port (e.g., 3002)

**API returns errors?**
- Make sure at least one API key is set in `.env`
- Check server logs for error messages

**Frontend can't connect?**
- Make sure backend is running on port 3001
- Check CORS_ORIGIN in `.env` matches frontend URL

## 🚀 Next Steps

1. Add your API keys to `.env`
2. Run `npm run dev:full`
3. Start building Phase 2 features!
