# 🚀 Quick Deployment Steps - Follow Along!

**Created by Luigi Balingit**

---

## ✅ Step 1: Deploy Backend to Render (10 minutes)

### 1. Go to Render Dashboard
👉 **Open this link**: https://dashboard.render.com/

### 2. Sign Up / Log In
- Click **"Sign Up"** or **"Log In"**
- Use **"Sign in with GitHub"** (easiest!)
- Authorize Render to access your repositories

### 3. Create New Web Service
- Click **"New +"** button (top right)
- Select **"Web Service"**

### 4. Connect Your Repository
- Find and select: **`luigibalingit14/netpong-2025`**
- Click **"Connect"**

### 5. Configure the Service

**Fill in these settings EXACTLY:**

```
Name: netpong-api
Region: Oregon (US West) ← or closest to you
Branch: main
Root Directory: server
Runtime: Python 3
Build Command: pip install -r requirements.txt
Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
Instance Type: Free
```

### 6. Click "Create Web Service"

Wait 5-10 minutes for deployment...

### 7. Copy Your API URL

Once deployed, you'll see a URL like:
```
https://netpong-api.onrender.com
```

**COPY THIS URL!** You'll need it in Step 2.

### 8. Test It!

Open your URL in browser: `https://netpong-api.onrender.com`

Should see:
```json
{
  "name": "NetPong 2025 API",
  "status": "online",
  "version": "1.0.0"
}
```

✅ **Backend is LIVE!**

---

## ✅ Step 2: Update Frontend Config (2 minutes)

### Tell me your Render URL and I'll update the config!

Just paste your URL here (e.g., `https://netpong-api-xxxx.onrender.com`)

---

## ✅ Step 3: Deploy Frontend to Netlify (5 minutes)

### Coming next after Step 2! 🎉

---

**What's your Render URL?** Paste it here once deployment is done! 👇
