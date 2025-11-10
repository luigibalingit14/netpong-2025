# 🧪 NetPong Testing Guide

**Quick test to verify everything works**

---

## ✅ Pre-Flight Checklist

Before testing:
- [x] Server dependencies installed (`pip install -r server/requirements.txt`)
- [x] Server is running on port 8000
- [ ] Two browser windows open (Chrome/Edge recommended)
- [ ] Windows positioned side-by-side

---

## 🎮 Test Scenario: Full Match

### Step 1: Start Server ✅
```powershell
cd server
python main.py
```

**Expected Console Output**:
```
✅ Database initialized
🚀 NetPong server ready on http://localhost:8000
📡 WebSocket endpoint: ws://localhost:8000/ws
INFO:     Application startup complete.
```

---

### Step 2: Open Web Clients

**Browser Window 1** (Player 1):
1. Open `web_client/index.html`
2. Check connection status: "● ONLINE" (green, top-right)

**Browser Window 2** (Player 2):
1. Open `web_client/index.html` in NEW window
2. Check connection status: "● ONLINE" (green, top-right)

---

### Step 3: Create Room (Player 1)

**Actions**:
1. Type name: `ALICE`
2. Click `CREATE ROOM`

**Expected Result**:
- Screen changes to "WAITING FOR OPPONENT..."
- 4-character room code appears (e.g., `A7K2`)
- Spinner animation visible

**If it fails**:
- Check server console for errors
- Verify WebSocket connection in DevTools (F12 → Network → WS)

---

### Step 4: Join Room (Player 2)

**Actions**:
1. Type name: `BOB`
2. Click `JOIN ROOM`
3. Enter room code from Player 1: `A7K2`
4. Click `JOIN`

**Expected Result**:
- **Both windows** transition to game screen simultaneously
- HUD shows:
  - Player 1: "ALICE" (left side, score 0)
  - Player 2: "BOB" (right side, score 0)
- Latency indicators visible (green bars, ~0-50ms)

**If it fails**:
- Double-check room code is uppercase
- Verify both players have "● ONLINE" status
- Check server logs: should show "Player joined" message

---

### Step 5: Play Game

**Controls**:
- **Player 1 (left paddle)**: Arrow Keys ↑↓ or W/S
- **Player 2 (right paddle)**: Arrow Keys ↑↓ or W/S

**Test Cases**:

#### TC1: Paddle Movement ✅
- **Action**: Press ↑ key
- **Expected**: Paddle moves up smoothly
- **Action**: Press ↓ key
- **Expected**: Paddle moves down smoothly

#### TC2: Ball Movement ✅
- **Expected**: Ball moves diagonally from center
- **Expected**: Ball bounces off top/bottom walls
- **Expected**: Ball speed increases slightly after paddle hit

#### TC3: Scoring ✅
- **Action**: Let ball pass left paddle
- **Expected**: 
  - Right player score increases (BOB: 1)
  - Ball resets to center
  - New ball launched

#### TC4: Latency Indicators ✅
- **Expected**: Ping values update every ~1 second
- **Expected**: Bars are green (<50ms) on local network
- **Action**: Simulate lag (optional: throttle network in DevTools)
- **Expected**: Bars turn yellow/orange/red

---

### Step 6: Complete Match

**Continue playing until**:
- One player reaches **5 points**

**Expected Result**:
- Screen changes to "GAME OVER"
- Winner name displayed: `ALICE WINS!` or `BOB WINS!`
- Final scores shown:
  ```
  ALICE: 5
  BOB: 3
  ```
- Buttons appear: `PLAY AGAIN` | `MAIN MENU`

---

### Step 7: Check Leaderboard

**Actions** (either player):
1. Click `MAIN MENU`
2. Click `LEADERBOARD`

**Expected Result**:
- Table displays with both players:
  ```
  #1  ALICE
      1W - 0L (100.0%)
      Total Score: 5 | Avg Latency: 45.23ms
  
  #2  BOB
      0W - 1L (0.0%)
      Total Score: 3 | Avg Latency: 47.89ms
  ```

**Verify**:
- [x] Player names match
- [x] Win/loss counts correct
- [x] Scores recorded
- [x] Latency averages reasonable (<200ms)

---

### Step 8: Verify Database

**Check SQLite database**:
```powershell
cd server
sqlite3 netpong.db
```

**SQL Query**:
```sql
SELECT * FROM leaderboard ORDER BY match_date DESC LIMIT 2;
```

**Expected Output**:
```
1|ALICE|BOB|5|3|45.23|2025-11-10 12:34:56
2|BOB|ALICE|3|5|47.89|2025-11-10 12:34:56
```

---

## 🧪 Advanced Tests

### Test Multi-Room Support

**Setup**: Open 4 browser windows

**Actions**:
1. Windows 1-2: Create Room A, play game
2. Windows 3-4: Create Room B, play game
3. Both games run simultaneously

**Expected**: 
- No interference between rooms
- Both games run at 60 FPS
- Server logs show 2 independent game loops

---

### Test Disconnection

**Actions**:
1. Start a game (2 players)
2. Close one browser window mid-game

**Expected**:
- Other player sees: "Opponent disconnected"
- Other player returns to menu
- Server cleans up room (check `/rooms` endpoint)

---

### Test Invalid Room Code

**Actions**:
1. Click `JOIN ROOM`
2. Enter fake code: `ZZZZ`
3. Click `JOIN`

**Expected**:
- Error message: "Failed to join room"
- Stay on menu screen

---

## 📊 REST API Tests

### Test 1: Health Check
```bash
curl http://localhost:8000/
```

**Expected**:
```json
{
  "name": "NetPong 2025 API",
  "status": "online",
  "version": "1.0.0"
}
```

---

### Test 2: Leaderboard Endpoint
```bash
curl http://localhost:8000/leaderboard?limit=5
```

**Expected**:
```json
{
  "success": true,
  "data": [
    {
      "player_name": "ALICE",
      "total_wins": 1,
      "total_matches": 1,
      "total_score": 5,
      "avg_latency_ms": 45.23,
      "win_rate": 100.0
    }
  ],
  "count": 1
}
```

---

### Test 3: Active Rooms (Debug)
```bash
curl http://localhost:8000/rooms
```

**Expected** (no games running):
```json
{
  "success": true,
  "rooms": [],
  "count": 0
}
```

**Expected** (1 game active):
```json
{
  "success": true,
  "rooms": [
    {
      "code": "A7K2",
      "state": "playing",
      "players": 2,
      "frame": 1234
    }
  ],
  "count": 1
}
```

---

## 🐛 Common Issues & Fixes

### Issue: "Connection Failed"
**Cause**: Server not running  
**Fix**: Start server with `python main.py`

---

### Issue: "Failed to join room"
**Cause**: Room code doesn't exist or is full  
**Fix**: 
- Verify room code is correct (case-sensitive)
- Check that room still exists (rooms close when empty)

---

### Issue: Laggy gameplay
**Cause**: High latency or low FPS  
**Fix**:
- Check latency indicators (should be <100ms)
- Close other browser tabs
- Test on local network first

---

### Issue: Ball goes through paddle
**Cause**: Server overload or extreme latency  
**Fix**:
- Check server CPU usage
- Reduce FPS to 30 in `game.py` (line 19)
- Add collision logging to debug

---

## ✅ Test Results Checklist

After testing, confirm:

**Functionality**:
- [x] Server starts without errors
- [x] WebSocket connection established
- [x] Room creation works
- [x] Room joining works
- [x] Paddle movement responsive
- [x] Ball physics correct
- [x] Scoring works
- [x] Game over triggers at 5 points
- [x] Leaderboard saves match
- [x] Leaderboard displays correctly

**Performance**:
- [x] Gameplay feels smooth (60 FPS)
- [x] Latency <100ms on local network
- [x] No stuttering or freezing
- [x] Multiple games can run simultaneously

**UI/UX**:
- [x] Buttons respond on click
- [x] Text inputs work
- [x] Animations play smoothly
- [x] Latency bars update
- [x] Colors change based on ping

---

## 🎥 Video Test (For Demo Recording)

**Setup**:
1. Position browser windows side-by-side
2. Start screen recording (OBS/Game Bar)
3. Run through Steps 1-7 above
4. Aim for 60-second clip

**Key Moments to Capture**:
- [x] Room creation (show code)
- [x] Second player joining (split screen)
- [x] 10-15 seconds of gameplay
- [x] Score event (ball exits)
- [x] Latency bars changing color
- [x] Game over screen
- [x] Leaderboard with stats

---

## 🚀 Ready for Production?

Before deploying:
- [ ] All tests pass
- [ ] Demo video recorded
- [ ] Screenshots taken
- [ ] README updated with demo
- [ ] GitHub repo created
- [ ] Dependencies documented
- [ ] Environment variables configured
- [ ] CORS settings updated for production domain

---

**Testing completed successfully? You're ready to showcase! 🎉**
