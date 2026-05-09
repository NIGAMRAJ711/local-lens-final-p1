# 🌍 LocalLens — Local Guide Discovery Platform

Full-stack social platform connecting travellers with local guides.

## 🚀 Quick Start

```bash
# Install & run backend
cd backend
npm install --legacy-peer-deps
node src/index.js

# In another terminal — install & run frontend
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** ✅

No database setup needed — uses persistent JSON file storage automatically.

## ✨ All Features Working

- 🔐 Register/Login/Forgot Password/Reset Password
- 🗺️ Interactive map (OpenStreetMap — free, no API key)
- 👥 Guide profiles visible to all travellers
- 📅 Bookings with accept/decline/complete flow
- 💰 Guide earnings tracked → wallet updated on completion
- 💬 Real-time chat (Socket.IO)
- 🎬 Travel Reels — upload & visible to all users
- 👫 Group Tours with filters, cover photos, share button
- 🔔 Notifications for all actions
- 👤 Facebook-style public profiles
- 🔄 Guide ↔ Traveller mode switching (data preserved)
- 📱 Mobile responsive

## ⚙️ Optional Services (all free)

- **Cloudinary** — image/video uploads (add keys to .env)
- **Gmail SMTP** — password reset emails (add keys to .env)
- **Neon/Supabase** — PostgreSQL (add DATABASE_URL to .env)

Without any of these, the app works fully using local file storage.

## 🌐 Deploy to Production

### Railway (easiest):
1. Push to GitHub
2. Connect at railway.app → set env vars → deploy

### Render.com (free tier):
- Build: `cd backend && npm install --legacy-peer-deps && cd ../frontend && npm install && npm run build`
- Start: `cd backend && node src/index.js`

## 📁 Structure

```
locallens-final/
├── backend/          Express + Socket.IO API
│   ├── src/db.js     Persistent JSON database (no setup needed)
│   ├── data/         Auto-created JSON data files
│   └── uploads/      Uploaded media files
├── frontend/         React 18 + Tailwind CSS
└── start.sh          One-command launcher
```
