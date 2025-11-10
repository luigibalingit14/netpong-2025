# NetPong 2025 - Architecture & Design

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                              │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  Web Client      │         │  PyGame Client   │         │
│  │  (HTML5/JS)      │         │  (Python)        │         │
│  │  - Canvas Render │         │  - PyGame Render │         │
│  │  - WebSocket     │         │  - WebSocket     │         │
│  │  - Input Handle  │         │  - Input Handle  │         │
│  └─────────┬────────┘         └────────┬─────────┘         │
│            │                           │                    │
└────────────┼───────────────────────────┼────────────────────┘
             │                           │
             │  WebSocket (60 FPS sync)  │
             │                           │
┌────────────┴───────────────────────────┴────────────────────┐
│                    SERVER LAYER                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  FastAPI Application (main.py)                       │  │
│  │  - WebSocket endpoint (/ws)                          │  │
│  │  - REST endpoints (/leaderboard, /rooms)             │  │
│  │  - CORS middleware                                   │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
│  ┌──────────────────┴───────────────────────────────────┐  │
│  │  Room Manager (room_manager.py)                      │  │
│  │  - Connection management                             │  │
│  │  - Room lifecycle (create/join/leave)                │  │
│  │  - Game loop orchestration (60 FPS)                  │  │
│  │  - Message broadcasting                              │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
│  ┌──────────────────┴───────────────────────────────────┐  │
│  │  Game Logic (game.py)                                │  │
│  │  - Server-authoritative physics                      │  │
│  │  - Paddle movement                                   │  │
│  │  - Ball collision detection                          │  │
│  │  - Scoring system                                    │  │
│  │  - State serialization                               │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
└─────────────────────┼───────────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────────┐
│                   PERSISTENCE LAYER                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Database (database.py)                              │  │
│  │  - SQLite with SQLModel ORM                          │  │
│  │  - Leaderboard table                                 │  │
│  │  - Match history                                     │  │
│  │  - Aggregated player stats                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### 1. Connection & Matchmaking
```
Client                Server                  Database
  │                     │                        │
  ├──WebSocket──────────>│                        │
  │   connect()         │                        │
  │                     │                        │
  │<──connected─────────┤                        │
  │   {player_id}       │                        │
  │                     │                        │
  ├──create_room────────>│                        │
  │   {player_name}     │                        │
  │                     ├─ Generate room code    │
  │                     ├─ Create Game instance  │
  │<──room_created──────┤                        │
  │   {room_code}       │                        │
```

### 2. Game Loop (60 FPS)
```
Server Game Loop (every 16.67ms):
  │
  ├─ Read player inputs (from WebSocket messages)
  │
  ├─ Update paddle positions (physics)
  │
  ├─ Update ball position (physics)
  │
  ├─ Check collisions (paddles, walls)
  │
  ├─ Update scores (if ball exits)
  │
  ├─ Serialize game state
  │
  └─ Broadcast to all clients (WebSocket)
```

### 3. Latency Measurement
```
Client                Server
  │                     │
  ├──ping──────────────>│
  │   {timestamp}       │
  │                     │
  │<──pong──────────────┤
  │   {timestamp,       │
  │    server_time}     │
  │                     │
  ├─ Calculate RTT      │
  │                     │
  ├──latency_update────>│
  │   {latency_ms}      │
  │                     │
  │                     ├─ Store in player state
  │                     └─ Include in game_state broadcast
```

---

## 🎯 Design Decisions

### Why FastAPI over Flask?
- **Native async/await**: Better WebSocket performance
- **Type hints**: Built-in Pydantic validation
- **Auto docs**: Swagger UI at `/docs`
- **Modern**: Active development, Python 3.11+ features

### Why Server-Authoritative?
- **Prevents cheating**: Clients can't manipulate game state
- **Simplifies sync**: Single source of truth
- **Easier debugging**: All logic in one place
- **Trade-off**: 50-100ms latency vs. client-side prediction

### Why SQLite for MVP?
- **Zero config**: File-based, no server needed
- **Perfect for dev**: Easy to reset (`rm netpong.db`)
- **Easy upgrade**: Switch to PostgreSQL by changing connection string
- **Sufficient scale**: Handles 1000s of matches easily

### Why 60 FPS Sync?
- **Smooth visuals**: Modern game standard
- **Responsive input**: 16ms update frequency
- **Network efficient**: JSON state ~500 bytes
- **Trade-off**: More server CPU vs. 30 FPS

---

## 🧩 Key Components

### Game State Synchronization
```python
# Server broadcasts every frame (60 FPS):
{
    "type": "game_state",
    "frame": 1234,
    "ball": {"x": 400, "y": 300, "vx": 250, "vy": 150},
    "players": [
        {"id": "...", "paddle_y": 300, "score": 2, "latency_ms": 45},
        {"id": "...", "paddle_y": 280, "score": 1, "latency_ms": 52}
    ]
}
```

### Input Handling
```javascript
// Client sends only input changes (bandwidth optimization):
{
    "type": "paddle_input",
    "direction": -1  // -1 (up), 0 (stop), 1 (down)
}
```

### Latency Tracking
- **Ping interval**: Every 1 second
- **Sample window**: Last 20 measurements
- **Display**: Average RTT in milliseconds
- **Color coding**: Green (<50ms), Yellow (<100ms), Orange (<200ms), Red (≥200ms)

---

## 🎨 UI/UX Design

### Color Palette (Retro-Futuristic)
- **Neon Blue** (#00f3ff): Primary accent, Player 1
- **Neon Pink** (#ff00ff): Secondary accent, Player 2
- **Neon Green** (#39ff14): Success, low latency
- **Dark BG** (#0a0a0f): Background gradient
- **Card BG** (#1a1a2e): UI elements

### Typography
- **Font**: Courier New (monospace for retro feel)
- **Glitch effect**: Animated title with RGB split
- **Letter spacing**: Wide for futuristic look

### Animations
- **Button hover**: Sliding gradient overlay
- **Countdown pulse**: Scale + opacity
- **Score events**: Flash effect (to be added)
- **Spinner**: Loading indicator during wait

---

## 🚧 Challenges Solved

### 1. State Synchronization
**Problem**: Keeping two clients in sync over variable latency  
**Solution**: Server-authoritative model + 60 FPS broadcast  
**Trade-off**: Higher server load, but simpler client logic

### 2. Input Lag
**Problem**: 100ms+ RTT makes game feel sluggish  
**Solution**: 
- Client renders server state immediately
- Input buffering on server (processes all inputs in frame)
- Visual feedback (paddle responds to local input instantly in PyGame)

### 3. Latency Transparency
**Problem**: Players blame game for network issues  
**Solution**:
- Real-time ping display
- Color-coded latency bars
- Visible metrics prove network quality

### 4. Room Management
**Problem**: Multiple concurrent games on one server  
**Solution**:
- Unique room codes (4-char, 1.6M combinations)
- Independent game loops per room (asyncio tasks)
- Auto-cleanup when rooms empty

---

## 📊 Performance Metrics

### Expected Performance
- **Server**: Handles 10+ concurrent games on modest hardware
- **Network**: ~500 bytes/frame × 60 FPS = 30 KB/s per client
- **Latency**: <50ms on local network, 50-150ms over internet
- **FPS**: Stable 60 FPS with up to 4 players (2 games)

### Optimization Opportunities
1. **Compression**: gzip WebSocket messages
2. **Prediction**: Client-side interpolation
3. **Delta encoding**: Send only state changes
4. **Tick rate**: Adaptive FPS based on latency

---

## 🔐 Security Considerations

### Current (MVP)
- CORS: Allow all origins (development only)
- No authentication: Anyone can create rooms
- No rate limiting
- No input validation beyond basic checks

### Production Recommendations
1. **Auth**: JWT tokens or OAuth
2. **Rate limiting**: Prevent spam/DDoS
3. **Input validation**: Pydantic models
4. **CORS**: Whitelist specific domains
5. **HTTPS/WSS**: Encrypted connections

---

## 📈 Scalability Path

### Current (SQLite + Single Server)
- Supports: ~50 concurrent players
- Bottleneck: Single-threaded asyncio loop

### Next Steps
1. **PostgreSQL**: Multi-client database
2. **Redis**: Pub/sub for game state
3. **Load balancer**: Distribute rooms across servers
4. **Kubernetes**: Auto-scaling based on load

---

**Document version**: 1.0 (November 2025)  
**Author**: Luigi Balingit
