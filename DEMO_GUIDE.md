# Phase 4 Collaboration Demo Guide

## 🚀 Quick Start

### Step 1: Start Backend (Rust)
```powershell
cd backend
cargo run
```
**Note**: First compilation takes 5-10 minutes. Backend runs on `http://localhost:3001`

### Step 2: Start Frontend
```powershell
npm run dev
```
Frontend runs on `http://localhost:5173`

### Step 3: Open Browser
Navigate to: **http://localhost:5173**

---

## 🎯 Demo Walkthrough: Real-Time Collaboration

### 1. **Access Collaboration Panel**
- Click on the **"Collaborate"** tab in the right sidebar
- You'll see the collaboration panel with options to create or join a session

### 2. **Create a New Session**
- Click **"Create Session"** button
- Fill in:
  - **Session Name**: "Demo Collaboration Session"
  - **Project Path**: "/path/to/project" (or any path)
- Click **"Create"**
- ✅ Session created! You'll see:
  - Session name and project path
  - Connection status (green dot = connected)
  - Share button

### 3. **Share Session**
- Click **"Share"** button
- You'll see:
  - Share link (copyable)
  - Session token
- Click **"Copy"** to copy the share link
- Share this link with others to join your session

### 4. **Join Session (Alternative Tab)**
- In a new browser tab/window, open `http://localhost:5173`
- Go to **Collaborate** tab
- Click **"Join by Token"**
- Paste the token from step 3
- Click **"Join"**
- ✅ You're now in the same session!

### 5. **See Participants**
- Both tabs should show:
  - Participant count
  - List of all participants
  - Their roles (Owner, Editor, Viewer, Agent)
  - Their status (Online, Away, Idle)
  - What file they're editing (if any)

### 6. **Real-Time Features**
- **Presence Tracking**: See when participants join/leave
- **Cursor Sync**: (Coming soon - will show cursor positions)
- **Edit Sync**: (Coming soon - will sync file edits in real-time)

### 7. **Leave Session**
- Click **"Leave"** button
- Session disconnects
- You can rejoin later using the token

---

## 🔧 Troubleshooting

### Backend Not Starting?
- **Check Rust installation**: `rustc --version`
- **Check .env file**: `backend/.env` should exist
- **Check port**: Make sure port 3001 is not in use
- **Check logs**: Look for error messages in terminal

### Frontend Not Connecting?
- **Check API URL**: Should be `http://localhost:3001`
- **Check CORS**: Backend should allow `http://localhost:5173`
- **Check browser console**: Look for WebSocket connection errors

### WebSocket Connection Failed?
- **Backend must be running**: Rust backend on port 3001
- **Check WebSocket URL**: Should be `ws://localhost:3001/api/v1/collaboration/ws/{session_id}`
- **Check browser console**: For connection errors

---

## 📋 API Endpoints Used

- `POST /api/v1/collaboration/sessions` - Create session
- `GET /api/v1/collaboration/sessions/:id` - Get session
- `GET /api/v1/collaboration/sessions/token/:token` - Get session by token
- `POST /api/v1/collaboration/sessions/:id/join` - Join session
- `GET /api/v1/collaboration/sessions/:id/participants` - List participants
- `WS /api/v1/collaboration/ws/:session_id` - WebSocket connection

---

## ✨ Features Demonstrated

✅ **Session Management**
- Create sessions
- Join sessions via token
- Share sessions with others

✅ **Real-Time Communication**
- WebSocket connection
- Presence tracking
- Participant list updates

✅ **Security**
- Token-based access
- Input validation
- Secure WebSocket connections

✅ **User Experience**
- Clean UI
- Real-time status updates
- Easy sharing

---

## 🎬 Next Steps

1. **Test with Multiple Users**: Open multiple browser tabs
2. **Test Agent Integration**: Add agents to sessions
3. **Test File Editing**: (Coming soon - real-time file sync)
4. **Test Conflict Resolution**: (Coming soon - simultaneous edits)

---

Enjoy the demo! 🚀
