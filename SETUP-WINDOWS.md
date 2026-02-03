# Board Game Leaderboard - Windows Setup Guide

Complete step-by-step instructions for deploying your leaderboard using Windows PowerShell.

---

## Prerequisites

Before starting, you'll need accounts on:
- **GitHub** (free) - [github.com](https://github.com)
- **Supabase** (free tier) - [supabase.com](https://supabase.com)
- **Netlify** (free tier) - [netlify.com](https://netlify.com)

---

## Part 1: Install Required Software

### 1.1 Install Git for Windows

1. Download Git from [git-scm.com/download/win](https://git-scm.com/download/win)
2. Run the installer, accepting the defaults (or customise if you prefer)
3. **Important**: When asked about "Adjusting your PATH environment", select "Git from the command line and also from 3rd-party software"
4. Complete the installation

**Verify Git is installed** - Open PowerShell and run:
```powershell
git --version
```
You should see something like `git version 2.43.0.windows.1`

### 1.2 Install Node.js

1. Download Node.js LTS from [nodejs.org](https://nodejs.org)
2. Run the installer, accepting the defaults
3. Restart PowerShell after installation

**Verify Node.js is installed:**
```powershell
node --version
npm --version
```

---

## Part 2: Set Up Git & GitHub

### 2.1 Configure Git (First Time Only)

Open PowerShell and set your identity:
```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 2.2 Create a GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **+** icon in the top right → **New repository**
3. Fill in:
   - **Repository name**: `board-game-leaderboard` (or whatever you prefer)
   - **Description**: "Board game leaderboard for game night"
   - **Visibility**: Private (recommended) or Public
   - **DO NOT** tick "Add a README file" (we already have one)
4. Click **Create repository**
5. You'll see a page with setup instructions - keep this open, you'll need the URL

### 2.3 Extract and Initialise Your Project

1. **Extract the ZIP file** you downloaded to a folder, e.g., `C:\Projects\board-game-leaderboard`

2. **Open PowerShell and navigate to the folder:**
```powershell
cd C:\Projects\board-game-leaderboard
```

3. **Initialise Git and make your first commit:**
```powershell
# Initialise a new Git repository
git init

# Add all files to staging
git add .

# Create your first commit
git commit -m "Initial commit: Board game leaderboard"
```

### 2.4 Connect to GitHub and Push

Replace `YOUR-USERNAME` with your actual GitHub username:

```powershell
# Add GitHub as the remote origin
git remote add origin https://github.com/YOUR-USERNAME/board-game-leaderboard.git

# Rename the default branch to 'main' (GitHub's default)
git branch -M main

# Push your code to GitHub
git push -u origin main
```

**First time pushing?** Git will ask for your GitHub credentials. You have two options:

**Option A: Use GitHub CLI (Recommended)**
```powershell
# Install GitHub CLI
winget install GitHub.cli

# Authenticate (opens browser)
gh auth login
```

**Option B: Use a Personal Access Token**
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name, set expiration, tick "repo" scope
4. Click "Generate token" and **copy it immediately** (you won't see it again)
5. When Git asks for your password, paste the token instead

### 2.5 Verify Your Code is on GitHub

1. Go to `https://github.com/YOUR-USERNAME/board-game-leaderboard`
2. You should see all your project files

---

## Part 3: Set Up Supabase (Database)

### 3.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**
3. Fill in:
   - **Name**: `board-game-leaderboard`
   - **Database Password**: Generate a strong password and **save it somewhere safe**
   - **Region**: Choose the closest to you (e.g., Sydney for NZ)
4. Click **Create new project** and wait ~2 minutes for setup

### 3.2 Run the Database Schema

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click **New query**
3. Open the file `supabase/schema.sql` from your project folder
4. Copy the entire contents and paste into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see "Success. No rows returned" - this is correct!

### 3.3 Verify Tables Were Created

1. Go to **Table Editor** (left sidebar)
2. You should see tables: `players`, `games`, `matches`, `match_results`, `badges`
3. Click on `players` - you should see Aaron, Bren, Darryn, Laura, Tessa already added

### 3.4 Get Your API Credentials

1. Go to **Settings** (gear icon, left sidebar) → **API**
2. You'll need two values:
   - **Project URL**: Copy this (looks like `https://xxxxx.supabase.co`)
   - **anon/public key**: Under "Project API keys", copy the `anon` key

### 3.5 (Optional) Set Up Storage for Avatars

If you want players to upload profile pictures:

1. Go to **Storage** (left sidebar)
2. Click **New bucket**
3. Name: `avatars`, toggle **Public bucket** ON
4. Click **Create bucket**
5. Repeat for a bucket called `game-images`

---

## Part 4: Configure Environment Variables

### 4.1 Create Your .env File

In PowerShell, navigate to your project folder and create the .env file:

```powershell
cd C:\Projects\board-game-leaderboard

# Create .env file from the example
Copy-Item .env.example .env

# Open it in Notepad to edit
notepad .env
```

### 4.2 Add Your Supabase Credentials

Replace the placeholder values with your actual credentials from Part 3.4:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Save and close the file.

**Important**: The `.env` file is in `.gitignore` so it won't be pushed to GitHub (keeping your keys private).

---

## Part 5: Test Locally

### 5.1 Install Dependencies

```powershell
cd C:\Projects\board-game-leaderboard
npm install
```

### 5.2 Run the Development Server

```powershell
npm run dev
```

You should see output like:
```
  VITE v5.0.0  ready in 500 ms

  ➜  Local:   http://localhost:5173/
```

### 5.3 Open in Browser

Go to `http://localhost:5173` in your browser. You should see your leaderboard!

Press `Ctrl+C` in PowerShell to stop the server when done.

---

## Part 6: Deploy to Netlify

### 6.1 Connect Netlify to GitHub

1. Go to [app.netlify.com](https://app.netlify.com) and sign in
2. Click **Add new site** → **Import an existing project**
3. Click **Deploy with GitHub**
4. Authorise Netlify to access your GitHub (if prompted)
5. Select your `board-game-leaderboard` repository

### 6.2 Configure Build Settings

Netlify should auto-detect these, but verify:
- **Branch to deploy**: `main`
- **Build command**: `npm run build`
- **Publish directory**: `dist`

### 6.3 Add Environment Variables

**Before clicking Deploy**, click **Show advanced** → **New variable** and add:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |

### 6.4 Deploy

Click **Deploy site**. Netlify will:
1. Clone your repo
2. Run `npm install`
3. Run `npm run build`
4. Deploy to a random URL like `https://random-name-123.netlify.app`

This takes about 1-2 minutes.

### 6.5 (Optional) Set a Custom Domain

1. In Netlify, go to **Site settings** → **Domain management**
2. Click **Add custom domain**
3. Either use a domain you own, or click **Options** → **Edit site name** to get a nicer `.netlify.app` URL

---

## Part 7: Import Your Existing Data

### 7.1 Export from Google Sheets

1. Open your Google Sheet with the 108 game records
2. Go to **File** → **Download** → **Comma-separated values (.csv)**
3. Save as `game_history.csv` in your project's `scripts` folder

### 7.2 Edit the Import Script

Open `scripts/import-data.mjs` in a text editor and update:

1. **Line 15-16**: Add your Supabase credentials
```javascript
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_KEY = 'your-service-role-key'; // Note: use SERVICE ROLE key for imports
```

**To get your service role key:**
- Supabase → Settings → API → Under "Project API keys", copy the `service_role` key
- ⚠️ Keep this secret! Don't commit it to Git.

2. **Line 24+**: Add your games with their BGG data
```javascript
const GAME_METADATA = {
  'Wingspan': { duration_minutes: 60, complexity: 2.45, is_coop: false, is_team: false },
  'Catan': { duration_minutes: 90, complexity: 2.32, is_coop: false, is_team: false },
  'Pandemic': { duration_minutes: 45, complexity: 2.42, is_coop: true, is_team: false },
  // Add all your games here...
};
```

3. **Check column mappings** match your CSV structure (around line 60)

### 7.3 Run the Import

```powershell
cd C:\Projects\board-game-leaderboard\scripts

# Install the CSV parser (one time only)
npm install csv-parse

# Run the import
node import-data.mjs
```

You should see output showing players, games, and matches being imported.

### 7.4 Verify in Supabase

1. Go to Supabase → Table Editor
2. Check `games` table has all your games
3. Check `matches` table has your 108 records
4. Check `match_results` has all the player placements

---

## Part 8: Ongoing Usage

### Making Changes

After editing files locally:

```powershell
# See what's changed
git status

# Stage all changes
git add .

# Commit with a message
git commit -m "Description of what you changed"

# Push to GitHub (Netlify auto-deploys!)
git push
```

### Pulling Changes (if you edit on another computer)

```powershell
git pull
```

### Viewing Your Site

- **Production**: Your Netlify URL (e.g., `https://your-site.netlify.app`)
- **Local testing**: Run `npm run dev` and go to `http://localhost:5173`

---

## Troubleshooting

### "git is not recognized as a command"
- Restart PowerShell after installing Git
- Or reinstall Git, ensuring you select "Git from the command line" during setup

### "npm is not recognized as a command"
- Restart PowerShell after installing Node.js
- Verify Node.js is in your PATH: `$env:PATH -split ';' | Select-String node`

### Authentication errors pushing to GitHub
- Try: `git config --global credential.helper manager`
- Or use GitHub CLI: `gh auth login`

### Build fails on Netlify
- Check that environment variables are set correctly
- View the build log for specific errors
- Ensure `npm run build` works locally first

### Data not showing on deployed site
- Verify environment variables in Netlify match your Supabase credentials exactly
- Check Supabase → SQL Editor → Run: `SELECT * FROM players;`
- Check browser console (F12) for any API errors

---

## Quick Reference

| Task | Command |
|------|---------|
| Navigate to project | `cd C:\Projects\board-game-leaderboard` |
| Install dependencies | `npm install` |
| Run locally | `npm run dev` |
| Build for production | `npm run build` |
| Check Git status | `git status` |
| Stage all changes | `git add .` |
| Commit changes | `git commit -m "message"` |
| Push to GitHub | `git push` |
| Pull latest changes | `git pull` |

---

Happy gaming! 🎲
