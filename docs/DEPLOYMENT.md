# 🚀 NetPong Deployment Guide

**Complete guide to deploy NetPong on Render + Netlify (both FREE)**

---

## 📋 Prerequisites

1. ✅ GitHub account
2. ✅ Render account (sign up at [render.com](https://render.com))
3. ✅ Netlify account (sign up at [netlify.com](https://netlify.com))

---

## Part 1: Push to GitHub (5 minutes)

### Step 1: Create GitHub Repository

```powershell
# Initialize git (if not done)
cd "c:\Users\Luigi Balingit\OneDrive\Desktop\Netpong"
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - NetPong 2025 by Luigi Balingit"

# Create repo on GitHub (browser)
# Go to github.com → New Repository → "netpong-2025"

# Add remote and push
git remote add origin https://github.com/YOUR_USERNAME/netpong-2025.git
git branch -M main
git push -u origin main
```

---

## Part 2: Deploy Backend to Render (10 minutes)

### Step 1: Create Web Service

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account
4. Select **"netpong-2025"** repository

### Step 2: Configure Service

**Settings:**
```
Name: netpong-api
Region: Oregon (US West) or closest to you
Branch: main
Root Directory: server
Runtime: Python 3
Build Command: pip install -r requirements.txt
Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
Instance Type: Free
```

### Step 3: Environment Variables (Optional)

Add if needed:
```
PYTHON_VERSION=3.11
```

### Step 4: Deploy!

- Click **"Create Web Service"**
- Wait 5-10 minutes for first deployment
- You'll get a URL like: `https://netpong-api.onrender.com`

### Step 5: Test Backend

Open in browser: `https://netpong-api.onrender.com`

Should see:
```json
{
  "name": "NetPong 2025 API",
  "status": "online",
  "version": "1.0.0"
}
```

✅ Backend deployed!

---

## Part 3: Update Frontend Config (2 minutes)

### Update Production URL

Edit `web_client/config.js`:

```javascript
// Line 11-12: Replace with your actual Render URL
return 'https://netpong-api.onrender.com';  // ← Your URL here

// Line 20-21: Replace with WebSocket URL
return 'wss://netpong-api.onrender.com/ws';  // ← Your URL here
```

**Commit changes:**
```powershell
git add web_client/config.js
git commit -m "Update production API URL"
git push
```

---

## Part 4: Deploy Frontend to Netlify (5 minutes)

### Option A: Netlify Drop (Easiest)

1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag & drop the **`web_client`** folder
3. Done! You'll get a URL like: `https://random-name.netlify.app`

### Option B: GitHub Deploy (Recommended)

1. Go to [app.netlify.com](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub** → Select **"netpong-2025"** repo
4. Configure:
   ```
   Base directory: (leave empty)
   Build command: (leave empty)
   Publish directory: web_client
   ```
5. Click **"Deploy"**

### Step 2: Custom Domain (Optional)

1. Go to **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Or use free subdomain: `netpong-luigi.netlify.app`

---

## 🎉 Done! Test Your Live Game

### Your URLs:
- **Backend API**: `https://netpong-api.onrender.com`
- **Game Client**: `https://YOUR-SITE.netlify.app`

### Test Flow:
1. Open game URL in 2 browser tabs
2. Player 1: Create room
3. Player 2: Join with code
4. Play!

---

## ⚠️ Important Notes

### Render Free Tier Limitations:
- **Spins down after 15 min of inactivity**
- First request after sleep = **30-60 sec startup time**
- Solution: Use [UptimeRobot](https://uptimerobot.com) to ping every 14 minutes

### Database:
- SQLite file will **reset** on Render restarts
- For persistent data, upgrade to PostgreSQL (also free on Render)

### WebSocket on Render:
- ✅ Supported on free tier
- ✅ Auto-scales to HTTPS (wss://)

---

## 🔧 Troubleshooting

### "WebSocket connection failed"
- Check CORS settings in `server/main.py`
- Verify WebSocket URL is `wss://` (not `ws://`)
- Check Render logs for errors

### "Server offline"
- Render free tier sleeps after inactivity
- Wait 30-60 sec for cold start
- Check Render dashboard for errors

### "Can't join room"
- Check if both players using same backend URL
- Clear browser cache
- Check server logs on Render

---

## 📊 Monitor Your App

### Render Dashboard:
- View logs in real-time
- Check deployment status
- Monitor CPU/Memory usage

### Netlify Dashboard:
- View deploy logs
- Check site analytics
- Custom domain setup

---

## 🚀 Optional: Upgrade to Paid

### Render ($7/month):
- No sleep/downtime
- Persistent disk (SQLite stays)
- More CPU/RAM
- PostgreSQL included

### Netlify (Free is enough):
- 100GB bandwidth/month
- 300 build minutes/month
- Perfect for this project

---

## 📝 After Deployment Checklist

- [ ] Backend API responding
- [ ] WebSocket connection working
- [ ] Game playable with 2 players
- [ ] Leaderboard saving data
- [ ] Update README with live demo link
- [ ] Share on LinkedIn/Portfolio

---

## 🎓 Add to Resume/Portfolio

**Project Links:**
```markdown
🎮 [Play Live](https://YOUR-SITE.netlify.app)
📊 [API Docs](https://netpong-api.onrender.com/docs)
💻 [GitHub](https://github.com/YOUR_USERNAME/netpong-2025)
```

**Portfolio Description:**
> Real-time multiplayer Pong game with 60 FPS WebSocket synchronization,
> server-authoritative architecture, and latency visualization.
> Deployed on Render (FastAPI backend) and Netlify (HTML5 Canvas frontend).

---

**Deployment guide by Luigi Balingit**  
**Date**: November 2025
