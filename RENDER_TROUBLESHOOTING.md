# ⚠️ Render Configuration Checklist

**If deployment still fails, verify these EXACT settings:**

---

## 🔧 Render Settings (Double Check!)

### 1. Go to Render Dashboard
👉 https://dashboard.render.com
- Click on your **"netpong-api"** service
- Click **"Settings"** (left sidebar)

### 2. Verify These Settings:

| Setting | Value |
|---------|-------|
| **Name** | `netpong-api` |
| **Region** | Oregon (US West) or any |
| **Branch** | `main` |
| **Root Directory** | `server` ← IMPORTANT! |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | `Free` |

### 3. Environment Variables (Optional)
Usually not needed, but you can add:
- `PYTHON_VERSION` = `3.11`

---

## 🚨 Common Issues & Fixes

### Issue 1: Wrong Root Directory
**Symptom**: "requirements.txt not found"
**Fix**: Set **Root Directory** to `server`

### Issue 2: Wrong Start Command
**Symptom**: "ModuleNotFoundError: No module named 'main'"
**Fix**: Use `uvicorn main:app --host 0.0.0.0 --port $PORT` (NOT `python main.py`)

### Issue 3: Missing Dependencies
**Symptom**: "ModuleNotFoundError: No module named 'fastapi'"
**Fix**: Verify **Build Command** is `pip install -r requirements.txt`

### Issue 4: Port Binding Error
**Symptom**: "Failed to bind to port"
**Fix**: Make sure Start Command has `--port $PORT` (with the dollar sign!)

---

## ✅ Manual Deploy Steps

1. Click **"Manual Deploy"** (top right)
2. Select **"Clear build cache & deploy"**
3. Wait 3-5 minutes
4. Watch the logs for errors

---

## 📋 Check Deploy Logs

Click on **"Logs"** tab to see what's failing.

### Common Error Messages:

**"No such file or directory: requirements.txt"**
→ Fix: Set Root Directory to `server`

**"ModuleNotFoundError: No module named 'uvicorn'"**
→ Fix: Check Build Command

**"Address already in use"**
→ Fix: Make sure using `$PORT` variable

---

## 🎯 After Successful Deploy

You'll see in logs:
```
✅ Database initialized
🚀 NetPong server ready
```

Then:
1. **Copy your URL** from Render dashboard
2. **Test it**: Open `https://YOUR-URL.onrender.com` in browser
3. Should see JSON: `{"name":"NetPong 2025 API","status":"online"...}`

**Paste the URL here once it works!** 🚀

---

**Created by Luigi Balingit**
