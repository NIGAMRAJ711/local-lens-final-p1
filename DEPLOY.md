# 🚀 LocalLens — Complete Deployment Guide

## STEP 1: Get Free PostgreSQL Database (Supabase)

1. Go to **https://supabase.com** → Sign Up (free, no credit card)
2. Click **"New Project"**
3. Name it `locallens`, set a password (save it!), region: Asia Southeast
4. Wait ~2 minutes for setup
5. Go to **Settings → Database → Connection String → URI**
6. Copy the URI — looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
7. Replace `[YOUR-PASSWORD]` with your actual password
8. This is your `DATABASE_URL` ✅

---

## STEP 2: Deploy Backend on Render.com (Free)

1. Push your code to **GitHub**:
   ```bash
   git init
   git add .
   git commit -m "LocalLens v2"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/locallens.git
   git push -u origin main
   ```

2. Go to **https://render.com** → Sign Up (free)

3. Click **New → Web Service**

4. Connect GitHub → select `locallens` repo

5. Configure:
   - **Name:** locallens-api
   - **Root Directory:** `backend`
   - **Build Command:** `npm install --legacy-peer-deps`
   - **Start Command:** `node src/index.js`
   - **Instance Type:** Free

6. Add Environment Variables:
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | `postgresql://postgres:YOUR_PASS@db.xxx.supabase.co:5432/postgres` |
   | `JWT_SECRET` | `any-random-long-string-here` |
   | `JWT_REFRESH_SECRET` | `another-random-long-string` |
   | `NODE_ENV` | `production` |
   | `PORT` | `10000` |
   | `FRONTEND_URL` | `https://locallens-web.onrender.com` (your frontend URL) |
   | `PLATFORM_FEE_PERCENT` | `10` |

7. Click **Deploy** → Wait 3-5 minutes

8. Your API URL: `https://locallens-api.onrender.com`

---

## STEP 3: Deploy Frontend on Render.com

1. Click **New → Static Site**

2. Connect same GitHub repo

3. Configure:
   - **Name:** locallens-web
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`

4. Add Environment Variables:
   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://locallens-api.onrender.com` |

5. Click **Deploy**

6. Your app URL: `https://locallens-web.onrender.com` ✅

---

## STEP 4: Initialize Database + Seed Data

After backend deploys, the database will auto-create tables and seed demo data.

To verify, visit: `https://locallens-api.onrender.com/health`

Should show:
```json
{"status":"ok","database":"PostgreSQL","version":"2.0.0"}
```

---

## ✅ Demo Login Credentials (pre-seeded)

| Role | Email | Password |
|------|-------|----------|
| Guide - Mumbai | arjun@guide.com | Guide@1234 |
| Guide - Delhi | fatima@guide.com | Guide@1234 |
| Guide - Goa | suresh@guide.com | Guide@1234 |
| Guide - Varanasi | anjali@guide.com | Guide@1234 |
| Traveller | rohan@traveller.com | Travel@1234 |

---

## 🌐 What's Pre-Loaded

- **8 guide profiles** with real map coordinates across India
- **6 group tours** with cover images (Mumbai, Jaipur, Kochi, Delhi, Goa, Varanasi)
- **6 travel reels** with real engagement numbers
- **Reviews** with ⭐ ratings so profiles look lived-in

---

## 🔧 Optional: Add Cloudinary (for image/video uploads)

1. Go to **https://cloudinary.com** → Free signup
2. Dashboard shows: Cloud Name, API Key, API Secret
3. Add to Render backend env vars:
   - `CLOUDINARY_CLOUD_NAME` = your cloud name
   - `CLOUDINARY_API_KEY` = your key
   - `CLOUDINARY_API_SECRET` = your secret

Without Cloudinary: uploads saved locally (lost on Render restart — use Cloudinary for production)

---

## 🔧 Optional: Add Email (for password reset emails)

1. Enable Gmail **2FA** → https://myaccount.google.com/security
2. Go to **App Passwords** → create one for "LocalLens"
3. Add to Render backend env vars:
   - `SMTP_USER` = your.email@gmail.com
   - `SMTP_PASS` = the 16-char app password
   - `EMAIL_FROM` = your.email@gmail.com

Without email: Reset link is shown directly in API response (dev mode)

---

## 💡 Run Locally

```bash
# Terminal 1 — Backend
cd backend
npm install --legacy-peer-deps
node src/index.js

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev

# Open: http://localhost:5173
```

No database needed for local — uses JSON files automatically.
