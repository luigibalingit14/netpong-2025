# NetPong 2025 - Quick Start Guide

## 🚀 Quick Start (3 Steps)

### 1. Install Backend Dependencies
```powershell
cd server
pip install -r requirements.txt
```

### 2. Start the Server
```powershell
python main.py
```

Server will start on `http://localhost:8000`

### 3. Open the Web Client

**Option A: Direct file access**
- Open `web_client/index.html` in your browser

**Option B: Using a local server (recommended)**
```powershell
cd web_client
python -m http.server 8080
```
Then visit `http://localhost:8080`

---

## 🎮 Playing the Game

### Web Client
1. Enter your name
2. Click **CREATE ROOM** or **JOIN ROOM**
3. Share the 4-character room code with your friend
4. Use **Arrow Keys** (↑↓) or **W/S** to control your paddle

### PyGame Client (Optional Desktop Client)

**Install:**
```powershell
cd pygame_client
pip install -r requirements.txt
```

**Run:**
```powershell
python client.py
```

**Controls:**
- Press **C** to create a room
- Press **J** to join a room
- Use **Arrow Keys** or **W/S** during gameplay

---

## 📊 API Endpoints

### REST API
- `GET /` - Health check
- `GET /leaderboard?limit=10` - Get top players
- `GET /rooms` - List active rooms (debug)

### WebSocket
- `ws://localhost:8000/ws` - Game communication

**Message Types:**
- `create_room` - Create new game room
- `join_room` - Join existing room
- `paddle_input` - Send paddle movement
- `ping` / `pong` - Latency measurement

---

## 🧪 Testing

### Manual Test Flow
1. Start server: `python server/main.py`
2. Open two browser windows
3. Player 1: Create room → Get code
4. Player 2: Join room → Enter code
5. Both players: Play Pong!
6. Check leaderboard after match

### Check Server Logs
The server logs all connections, room creation, and game events in the terminal.

---

## 🎨 Features Implemented

✅ Real-time 60 FPS game synchronization  
✅ Server-authoritative game logic  
✅ Room-based matchmaking with 4-char codes  
✅ Latency visualization (ping, jitter indicators)  
✅ Persistent SQLite leaderboard  
✅ Retro-futuristic UI with neon effects  
✅ Dual clients (web + PyGame)  
✅ Cross-platform support

---

## 🐛 Troubleshooting

**Server won't start:**
- Check if port 8000 is already in use
- Try: `uvicorn server.main:app --port 8001`

**WebSocket connection fails:**
- Ensure server is running
- Check browser console for errors
- Update `serverUrl` in `game.js` if using different port

**Can't join room:**
- Room codes are case-sensitive (auto-uppercase in UI)
- Rooms are deleted when empty
- Maximum 2 players per room

---

## 📦 Project Structure

```
netpong/
├── server/
│   ├── main.py          # FastAPI app & WebSocket handlers
│   ├── game.py          # Game logic (physics, scoring)
│   ├── room_manager.py  # Room & connection management
│   ├── database.py      # SQLModel + leaderboard
│   └── requirements.txt
├── web_client/
│   ├── index.html       # UI structure
│   ├── style.css        # Retro-futuristic styling
│   └── game.js          # WebSocket client & Canvas rendering
├── pygame_client/
│   ├── client.py        # PyGame desktop client
│   └── requirements.txt
└── README.md
```

---

## 🚀 Next Steps

1. **Test locally** - Run server + 2 clients
2. **Check leaderboard** - Play a full match and verify data
3. **Measure latency** - Try on different networks
4. **Polish UI** - Add sound effects, animations
5. **Deploy** - Host backend on Render, frontend on Vercel

---

## 💡 Development Tips

**Hot reload server:**
```powershell
uvicorn server.main:app --reload
```

**View database:**
```powershell
sqlite3 server/netpong.db
SELECT * FROM leaderboard;
```

**Debug WebSocket:**
- Open browser DevTools → Network → WS tab
- Monitor message flow in real-time

---

**Built with ❤️ by Luigi Balingit (2025)**
