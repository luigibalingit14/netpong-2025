# 🎥 NetPong 2025 - Demo Script

**Created by**: Luigi Balingit  
**Duration**: 30-60 seconds  
**Purpose**: Portfolio video showcasing real-time multiplayer game

---

## 📹 Recording Setup

### Tools
- **Screen recorder**: OBS Studio (free) or Windows Game Bar (Win + G)
- **Browser**: Chrome/Edge (2 windows side-by-side)
- **Optional**: Smartphone camera for "two player" shot

### Layout
```
┌─────────────────────────┬─────────────────────────┐
│                         │                         │
│   Browser Window 1      │   Browser Window 2      │
│   (Player 1)            │   (Player 2)            │
│                         │                         │
│   - Shows "CREATE"      │   - Shows "JOIN"        │
│   - Gets room code      │   - Enters code         │
│   - Left paddle         │   - Right paddle        │
│                         │                         │
└─────────────────────────┴─────────────────────────┘
```

---

## 🎬 Shot-by-Shot Breakdown

### Shot 1: Title Card (3 sec)
**Visual**: NETPONG 2025 logo with glitch effect  
**Audio**: Retro synth sound (optional)  
**Text overlay**: "Real-Time Multiplayer Pong"

---

### Shot 2: Menu Screen (5 sec)
**Action**:
1. Show main menu
2. Type player name: "PLAYER1"
3. Click "CREATE ROOM"

**Text overlay**: "Server-Authoritative Matchmaking"

---

### Shot 3: Room Code (4 sec)
**Action**:
1. Show waiting screen with room code (e.g., "A7K2")
2. Highlight the code with cursor

**Text overlay**: "4-Character Room Codes"

---

### Shot 4: Second Player Joins (4 sec)
**Action**:
1. Split screen: Show second browser window
2. Player 2 clicks "JOIN ROOM"
3. Enters code "A7K2"
4. Both screens transition to game

**Text overlay**: "WebSocket Connection (60 FPS)"

---

### Shot 5: Gameplay (15-20 sec)
**Action**:
1. Show 10-15 seconds of active gameplay
2. Ball bouncing, paddles moving
3. Score increases (show at least 1 point)
4. **Focus on**: Latency indicators changing colors

**Text overlay**: "Real-Time Latency Visualization"

**Camera notes**:
- Zoom in on latency bars (green → yellow → orange)
- Show smooth 60 FPS ball movement
- Capture a score event

---

### Shot 6: Latency Metrics (5 sec)
**Action**:
1. Pause or slow-mo on HUD
2. Highlight ping values (e.g., "45ms", "52ms")
3. Show color-coded latency bars

**Text overlay**: "Ping, Jitter & Quality Indicators"

---

### Shot 7: Game Over (4 sec)
**Action**:
1. One player reaches 5 points
2. Show "PLAYER WINS!" screen
3. Display final scores

**Text overlay**: "Persistent Leaderboard"

---

### Shot 8: Leaderboard (5 sec)
**Action**:
1. Click "MAIN MENU"
2. Click "LEADERBOARD"
3. Show top 3-5 players with stats

**Text overlay**: "SQLite + REST API"

---

### Shot 9: Tech Stack (5 sec)
**Visual**: Quick montage of:
- VS Code with Python code
- Browser DevTools (WebSocket tab)
- Terminal with server logs

**Text overlay**: 
```
FastAPI • WebSocket • SQLModel
PyGame • Canvas • 60 FPS Sync
```

---

### Shot 10: Closing Card (3 sec)
**Visual**: GitHub repo link + "Built by Luigi Balingit"  
**Text overlay**: "github.com/yourname/netpong"

---

## 🎤 Voiceover Script (Optional)

> "NetPong 2025: a full-stack multiplayer Pong game built in Python.
> 
> Players create rooms with 4-character codes and connect over WebSocket for real-time 60 FPS gameplay.
> 
> The server-authoritative architecture prevents cheating while latency indicators provide transparency—showing ping, jitter, and connection quality in real time.
> 
> All match results save to a persistent leaderboard using SQLite and SQLModel.
> 
> The game supports dual clients: a browser-based HTML5 Canvas version and an optional PyGame desktop client.
> 
> Built with FastAPI, WebSocket, and modern async Python—demonstrating real-time networking, game logic, and full-stack development."

---

## 📝 Recording Checklist

### Before Recording
- [ ] Close unnecessary browser tabs/windows
- [ ] Hide personal info (bookmarks, history)
- [ ] Set browser zoom to 100%
- [ ] Clear desktop (hide icons if needed)
- [ ] Test audio levels
- [ ] Run server: `python server/main.py`
- [ ] Open `web_client/index.html` in 2 browser windows

### During Recording
- [ ] Use smooth mouse movements
- [ ] Pause briefly after each action (easier editing)
- [ ] Play at least one full game (0-5 score)
- [ ] Show both "win" and "lose" perspectives
- [ ] Capture at least 2-3 latency color changes

### After Recording
- [ ] Trim dead space (loading, pauses)
- [ ] Add text overlays with editing software
- [ ] Add background music (copyright-free)
- [ ] Export at 1080p 60fps
- [ ] Keep file under 50MB for easy sharing

---

## 🎨 Editing Tips

### Software Recommendations
- **Free**: DaVinci Resolve, OpenShot
- **Quick**: Windows Video Editor, iMovie

### Effects to Add
1. **Zoom in** on latency bars during gameplay
2. **Slow motion** (50%) on score events
3. **Text overlays** with neon glow effect
4. **Transitions**: Fast cuts, no fades (keeps energy high)
5. **Sound**: Retro beeps on button clicks (optional)

### Music Suggestions (Copyright-Free)
- "Neon Lights" vibes (synthwave, retrowave)
- Try: YouTube Audio Library, Epidemic Sound, Uppbeat
- Keep volume low (dialogue should be clear)

---

## 📤 Where to Share

### Portfolio
- **Personal website**: Embed video at top of project page
- **GitHub README**: Add to repo as animated GIF or video link
- **LinkedIn**: Post with #python #gamedev #webdev tags

### Video Platforms
- **YouTube**: Unlisted link for resume
- **Vimeo**: Professional portfolio hosting
- **Twitter/X**: 60-sec clip with thread explaining tech choices

---

## 💡 Pro Tips

1. **Record multiple takes**: Easier to pick best shots
2. **Show personality**: Add your face in corner (optional)
3. **Tell a story**: "Problem → Solution → Impact"
4. **Keep it punchy**: 30-45 sec is better than 60 sec
5. **Test on mobile**: Portfolio visitors often browse on phones

---

## 🚀 Advanced: Two-Device Shot

If you have 2 laptops or a laptop + phone:

1. Run server on main laptop
2. Open client on both devices
3. Film over-the-shoulder shot of both players
4. Captures the "real multiplayer" feeling
5. Great for LinkedIn/social posts

---

## 📊 Success Metrics

Your demo is effective if it shows:
- ✅ Clear gameplay (ball, paddles, scoring)
- ✅ Latency indicators (changing colors)
- ✅ Smooth 60 FPS (no stuttering)
- ✅ Both client perspectives
- ✅ Leaderboard/backend integration

---

**Version**: 1.0  
**Last updated**: November 2025  
**Author**: Luigi Balingit

---

## 🎓 Bonus: Interview Talking Points

When showing this video to recruiters/mentors:

1. **Real-time systems**: "I implemented 60 FPS WebSocket sync"
2. **Networking**: "Server-authoritative prevents cheating"
3. **Observability**: "Latency metrics show I care about UX"
4. **Full-stack**: "Backend (FastAPI), Frontend (Canvas), Database (SQLite)"
5. **Problem-solving**: "Handled input lag with buffering"

Practice explaining the architecture in 30 seconds!
