# LocalLens — Deployment Guide

## Deploy to Render (Recommended — Free)

### Step 1: Push to GitHub
1. Create a new GitHub repo (e.g. `locallens`)
2. Push this folder:
```bash
git init
git add .
git commit -m "LocalLens v4 — full featured"
git remote add origin https://github.com/YOUR_USERNAME/locallens.git
git push -u origin main
```

### Step 2: Deploy on Render
1. Go to [render.com](https://render.com) → Sign up/login
2. Click **New** → **Blueprint**
3. Connect your GitHub repo
4. Render reads `render.yaml` and auto-creates:
   - **locallens-api** (Node.js backend)
   - **locallens-web** (Static frontend)
   - **locallens-db** (PostgreSQL free)
5. Click **Apply** — done!

### Step 3: Set Environment Variables
In Render dashboard → locallens-api → Environment, add:
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```
Get free Cloudinary account at cloudinary.com (required for photo/video uploads)

Optional:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
```

### Step 4: Set Frontend API URL
In Render dashboard → locallens-web → Environment:
```
VITE_API_URL=https://locallens-api.onrender.com/api
```
(Replace with your actual backend URL from Render)

---

## Demo Login Credentials (seeded automatically)
```
TRAVELER  → traveler@demo.com     | Travel@1234
GUIDE 1   → arjun@guide.com      | Guide@1234  (Mumbai)
GUIDE 2   → priya@guide.com      | Guide@1234  (Delhi)
GUIDE 3   → rahul@guide.com      | Guide@1234  (Kochi)
GUIDE 4   → sneha.guide@guide.com| Guide@1234  (Jaipur)
GUIDE 5   → vikram@guide.com     | Guide@1234  (Bangalore)
GUIDE 6   → meera@guide.com      | Guide@1234  (Varanasi)
GUIDE 7   → aditya@guide.com     | Guide@1234  (Udaipur)
GUIDE 8   → kavya@guide.com      | Guide@1234  (Goa)
```

---

## Tech Stack
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express + Socket.io
- **Database**: PostgreSQL (Render free) or JSON files (dev)
- **Media**: Cloudinary (required for uploads)
- **Maps**: OpenStreetMap + Leaflet (free, no API key)
- **Auth**: JWT + refresh tokens

## Features
- 8 seed guides across India with real coordinates
- Real-time chat (Socket.io)
- Photo pins on map with Book Now
- Group tours with photo carousels
- Travel reels with IntersectionObserver autoplay
- Guide hidden gems on map
- Booking cancel/reject with refunds
- Fuzzy search + GPS near me
- Guide availability calendar
- Bucket list
- PWA installable
- Dark mode
- Review replies
