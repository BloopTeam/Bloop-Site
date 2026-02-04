# Localhost Access Guide

## 🎯 Important: Two Different Servers

### Frontend (React App) - Port 5173
**This is what you see in the browser:**
- URL: `http://localhost:5173`
- This is the **Bloop UI** - the actual application
- Run with: `npm run dev`

### Backend (API Server) - Port 3001
**This is the API, not a web page:**
- URL: `http://localhost:3001`
- Returns JSON data, not HTML
- **Rust backend (recommended):** `cd backend && cargo run`
- **Node.js backend (fallback):** `npm run dev:api:node`
- **Auto-detect:** `npm run dev:api` (tries Rust, falls back to Node.js)
- Used by the frontend to get AI responses

## 🚀 Quick Start

### Option 1: Run Both Together (Recommended)
```bash
npm run dev:full
```
This starts both frontend (5173) and backend (3001) automatically.

### Option 2: Run Separately

**Terminal 1 - Backend:**
```bash
# Option A: Rust backend (recommended)
cd backend && cargo run

# Option B: Node.js backend (fallback)
npm run dev:api:node

# Option C: Auto-detect (tries Rust, falls back to Node.js)
npm run dev:api
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

## 🌐 What to Open in Browser

**Open this:** `http://localhost:5173` ✅
- This is the Bloop application UI

**Don't open this:** `http://localhost:3001` ❌
- This is just the API (shows JSON, not a page)

## 🔍 Verify Everything is Running

```bash
# Check backend API
curl http://localhost:3001/health
# Should return: {"status":"OK",...}

# Check frontend (open in browser)
# http://localhost:5173
# Should show the Bloop UI
```

## 📝 Summary

- **Frontend (5173)** = The actual Bloop app you interact with
- **Backend (3001)** = API that powers the AI features
- **Access the app at:** `http://localhost:5173`
