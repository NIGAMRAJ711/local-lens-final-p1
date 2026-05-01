# 🌍 LocalLens – Full Stack Travel Guide Platform

## Quick Start (Run Locally in 3 steps)

### Step 1: Start the Backend
```bash
cd backend
npm install
node src/index.js
# Server starts at http://localhost:5001
```

### Step 2: Start the Frontend
```bash
cd frontend
npm install
npm run dev
# App opens at http://localhost:5173
```

### Step 3: Open Browser
Navigate to **http://localhost:5173** — Register and start using LocalLens!

---

## Features Implemented

### ✅ Authentication
- Register as Traveller or Guide
- Login with email/password
- **Forgot Password** → generates reset link (shown in dev mode)
- **Reset Password** → fully working
- JWT tokens with refresh

### ✅ Traveller Dashboard
- Welcome banner with stats (bookings, completed tours, loyalty points)
- Quick action cards (Explore, Group Tours, Reels, Map)
- Upcoming bookings with status
- Real-time notifications
- Featured guides

### ✅ Guide Dashboard
- Toggle availability (Online/Offline)
- Earnings breakdown (today/week/month/total)
- Booking requests with Accept/Decline
- Upcoming tours with Mark Complete (releases payment to wallet)
- Profile stats (rating, reviews, total tours)
- Notifications

### ✅ Explore Guides
- Browse all guides with photos
- Filter by: city, category, price range, min rating, availability
- Pagination (load more)

### ✅ Guide Profile Page
- Full profile with cover, avatar, stats
- Tabs: About | Reviews | Reels
- Pricing cards
- Hidden gems (unlocked after booking)
- Book Now button

### ✅ Booking System
- 3-step booking wizard (type → date/time → review & confirm)
- Price calculation with platform fee (10%)
- Booking request → Guide accepts/declines → Tour completes → Wallet credited

### ✅ Group Tours
- Browse & filter by city, category, price
- **Share button** (native share API / clipboard fallback)
- **Join Tour** button with real member count
- **Create Tour** (guides only) with cover photo upload
- Members avatars shown on each tour
- "My Tours" tab shows joined tours

### ✅ Travel Reels
- **Upload Reel** button (video upload, caption, type, location)
- Video playback inline
- Like / View count
- Share button (native share / clipboard)
- Visible to ALL users on platform
- Shows all reels from all users

### ✅ Live Map (OpenStreetMap – FREE)
- Works exactly like Google Maps (zoom, pan, click markers)
- Guide markers (green=online, gray=offline)
- Hidden gem markers (orange 💎)
- Click guide marker → side panel with book/view buttons
- "My Location" button (GPS)
- City search with Nominatim geocoding (free)
- Layer toggle (Guides / Hidden Gems / All)

### ✅ Real-time Messages
- Chat with guides/travellers for each booking
- WebSocket (Socket.IO) powered
- Message history persisted
- Unread indicators

### ✅ Notifications
- Mark as read / mark all read
- Badge count in nav bar
- All booking events, tour joins, messages

### ✅ Friends / Connections
- Shows connections via shared bookings
- **Search any user** by name/email
- View public profile (Facebook-style)
- Connection count, reels grid, guide info

### ✅ User Profiles (Facebook-style)
- Cover photo + avatar
- Stats bar (tours, reviews, rating, bookings)
- Tabs: About | Guide Info | Reels
- Book guide from profile

### ✅ Switch Between Guide ↔ Traveller Mode
- Data preserved in both modes
- Settings page → one click to switch
- Top nav "Guide Mode" button
- Seamless redirect to correct dashboard
- Register as guide flow (3-step wizard)

### ✅ Guide Registration
- 3-step wizard: Bio → Expertise → Pricing
- Language selection
- Expertise tags
- Photography option
- All prices configurable

### ✅ Wallet & Earnings
- Guide earnings tracked per booking
- 90% of booking value credited on completion
- Loyalty points for travellers
- Transaction history

---

## Database
- **Local dev**: JSON files in `backend/data/` — fully persistent, no setup needed
- **Production**: Change `DATABASE_URL` to PostgreSQL/Neon and run `npx prisma db push`

## Media Uploads
- **Without Cloudinary**: Images/videos stored as base64 (works immediately)
- **With Cloudinary** (recommended for production):
  ```
  CLOUDINARY_CLOUD_NAME=your_name
  CLOUDINARY_API_KEY=your_key
  CLOUDINARY_API_SECRET=your_secret
  ```

## Deploy to Production

### Backend (Railway / Render / Fly.io – all free tier)
```bash
# Set environment variables:
DATABASE_URL=postgresql://...  # Neon free tier
JWT_SECRET=your-strong-secret-here
FRONTEND_URL=https://your-frontend.vercel.app
NODE_ENV=production
```

### Frontend (Vercel – free)
```bash
# Set environment variables:
VITE_API_URL=https://your-backend.railway.app/api
VITE_SOCKET_URL=https://your-backend.railway.app
```

---

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS, React Router |
| Map | Leaflet + OpenStreetMap (100% free) |
| Real-time | Socket.IO |
| Backend | Node.js, Express |
| Database (dev) | JSON files (no setup) |
| Database (prod) | PostgreSQL / Neon |
| Auth | JWT (access + refresh tokens) |
| File uploads | Cloudinary (optional) or base64 |
