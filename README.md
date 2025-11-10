# 🎮 NetPong 2025

**A real-time multiplayer Pong game with latency visualization and persistent leaderboards**

## 🚀 Features

- **Real-time 1v1 gameplay** via WebSocket (30-60 FPS sync)
- **Latency transparency**: Live ping, jitter, and packet loss indicators
- **Dual clients**: Browser (HTML5 Canvas) + optional PyGame desktop client
- **Persistent leaderboard** with match history and average latency
- **Retro-futuristic UI** with accessibility features

## 📁 Project Structure

```
netpong/
├── server/          # FastAPI backend with WebSocket game server
├── web_client/      # HTML5 Canvas browser client
├── pygame_client/   # Optional PyGame desktop client
├── docs/            # Architecture diagrams and design notes
└── assets/          # Fonts, images, and UI resources
```

## ⚙️ Setup

### Backend (Python 3.11+)

```bash
cd server
pip install -r requirements.txt
python main.py
```

Server runs on `http://localhost:8000`

### Web Client

Open `web_client/index.html` in a browser, or serve via:

```bash
cd web_client
python -m http.server 8080
```

### PyGame Client (Optional)

```bash
cd pygame_client
pip install -r requirements.txt
python client.py
```

## 🎯 How to Play

1. **Create Room**: Get a 4-character room code
2. **Share Code**: Friend joins with the same code
3. **Play**: Use arrow keys (Player 1) or W/S (Player 2)
4. **Watch Metrics**: Real-time latency indicators during gameplay

## 🏗️ Architecture

- **Server-authoritative**: All game logic runs on FastAPI backend
- **WebSocket sync**: 60 FPS state broadcasts to both clients
- **Input buffering**: Minimizes perceived lag
- **SQLite storage**: Leaderboard persistence with SQLModel ORM

## 📊 Tech Stack

- **Backend**: FastAPI, WebSocket, SQLModel, SQLite
- **Web Client**: Vanilla JS, HTML5 Canvas
- **Desktop Client**: PyGame, websocket-client
- **Deployment**: Render (backend), Vercel (frontend)

## 🎨 Design Choices

- **Why FastAPI over Flask?** Native async/await support for WebSocket performance
- **Why SQLite?** Zero-config persistence for MVP, easy PostgreSQL upgrade path
- **Why server-authoritative?** Prevents cheating, simplifies client logic

## 🐛 Challenges Solved

- Handling 200ms+ latency with client-side prediction
- Synchronizing 60 FPS game state over variable connections
- Visual latency feedback that doesn't distract from gameplay

## 📝 License

MIT © Luigi Balingit (2025)

---

**Built with ❤️ as a portfolio project showcasing real-time networking, game logic, and full-stack Python development.**
