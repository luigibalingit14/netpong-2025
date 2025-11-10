# 🚀 GitHub Setup - Final Step

**Your code is ready to push!** ✅

---

## Option 1: Using GitHub CLI (Easiest) ⭐

If you have GitHub CLI installed:

```powershell
# Login to GitHub (opens browser)
gh auth login

# Create repo and push automatically
gh repo create netpong-2025 --public --source=. --remote=origin --push
```

**Done!** Your repo will be at: `https://github.com/luigibalingit14/netpong-2025`

---

## Option 2: Manual Setup (5 minutes)

### Step 1: Create Repository on GitHub

1. Go to: **https://github.com/new**
2. Repository name: **`netpong-2025`**
3. Description: **"Real-time multiplayer Pong with WebSocket, latency metrics, and persistent leaderboards"**
4. Visibility: **Public** ✅
5. **DO NOT** initialize with README, .gitignore, or license (we already have them)
6. Click **"Create repository"**

### Step 2: Copy Your Username

After creating the repo, you'll see a page with commands.
Look for: `https://github.com/YOUR_USERNAME/netpong-2025.git`

**Copy your username** (e.g., `luigi-balingit`)

### Step 3: Run These Commands

**Replace `YOUR_USERNAME` with your actual GitHub username:**

```powershell
# Set your GitHub username
git remote add origin https://github.com/YOUR_USERNAME/netpong-2025.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

### Step 4: Enter Credentials

When prompted:
- **Username**: Your GitHub username
- **Password**: Use a **Personal Access Token** (not your password)

#### How to create a token:
1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Name: **"NetPong Deploy"**
4. Scopes: Check **`repo`** ✅
5. Click **"Generate token"**
6. **Copy the token** (you won't see it again!)
7. Paste it as your password

---

## ✅ Verify It Worked

After pushing, go to: `https://github.com/YOUR_USERNAME/netpong-2025`

You should see:
- ✅ 23 files
- ✅ README with game description
- ✅ All folders: server, web_client, pygame_client, docs, assets

---

## 🎯 Next: Deploy!

Once pushed to GitHub, follow **`docs/DEPLOYMENT.md`** to deploy:
1. **Backend** → Render (connect GitHub repo)
2. **Frontend** → Netlify (connect GitHub repo)

---

**Questions?** Let me know! 🚀

**Created by Luigi Balingit**
