# 🌍 LocalLens Backend API

A complete Node.js + Express + PostgreSQL backend for the LocalLens local guide marketplace app.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT (Access + Refresh tokens) |
| Real-time | Socket.IO (chat + live tracking) |
| Payments | Razorpay (India) |
| File Uploads | Cloudinary (images + videos) |
| SMS/OTP | Twilio |
| Push Notifications | Firebase Cloud Messaging |

---

## 📁 Project Structure

```
locallens-backend/
├── src/
│   ├── index.js              # Main server entry point
│   ├── routes/
│   │   ├── auth.routes.js    # Register, Login, OTP
│   │   ├── guide.routes.js   # Guide profiles, search, dashboard
│   │   ├── booking.routes.js # Create, confirm, complete bookings
│   │   ├── payment.routes.js # Razorpay integration + webhooks
│   │   ├── reel.routes.js    # Upload, feed, like, view
│   │   ├── groupTour.routes.js # Create, join group tours
│   │   ├── map.routes.js     # Live guide pins + hidden gems
│   │   ├── chat.routes.js    # Message history
│   │   ├── review.routes.js  # Post + fetch reviews
│   │   ├── sos.routes.js     # Emergency SOS alert
│   │   ├── user.routes.js    # Profile management
│   │   └── notification.routes.js
│   ├── middleware/
│   │   └── error.middleware.js # JWT auth + error handler
│   └── services/
│       └── socket.service.js  # Real-time Socket.IO setup
├── prisma/
│   └── schema.prisma         # Full database schema
├── .env.example              # Environment variables template
└── package.json
```

---

## 🚀 Setup Instructions

### 1. Install Dependencies
```bash
cd locallens-backend
npm install
```

### 2. Setup Environment Variables
```bash
cp .env.example .env
# Fill in all values in .env
```

### 3. Setup PostgreSQL Database
```bash
# Install PostgreSQL locally or use a cloud provider like Supabase (free)
# Update DATABASE_URL in .env

# Run migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate
```

### 4. Start Development Server
```bash
npm run dev
# API runs on http://localhost:5000
```

---

## 🔌 API Endpoints

### Auth
```
POST /api/auth/register      — Create account (traveler or guide)
POST /api/auth/login         — Login with email + password
POST /api/auth/refresh       — Refresh access token
POST /api/auth/send-otp      — Send OTP via SMS
```

### Guides
```
GET  /api/guides             — Search guides (filter by city, category, price)
GET  /api/guides/:id         — Guide profile + reviews + reels
POST /api/guides/register    — Create guide profile
PATCH /api/guides/availability — Toggle online/offline
PATCH /api/guides/location   — Update live location
POST /api/guides/hidden-gems — Add hidden gem
GET  /api/guides/dashboard/stats — Earnings + upcoming bookings
```

### Bookings
```
POST  /api/bookings          — Create booking
GET   /api/bookings/my       — My bookings (as guide or traveler)
PATCH /api/bookings/:id/status   — Confirm or cancel
PATCH /api/bookings/:id/complete — End tour + release escrow
```

### Payments
```
POST /api/payments/create-order — Create Razorpay order
POST /api/payments/verify       — Verify payment signature
POST /api/payments/webhook      — Razorpay webhook handler
```

### Reels
```
GET  /api/reels              — Reel feed (For You / Near Me)
POST /api/reels              — Upload reel
POST /api/reels/:id/like     — Like / Unlike
POST /api/reels/:id/view     — Increment view count
```

### Group Tours
```
GET  /api/group-tours        — Browse group tours
POST /api/group-tours        — Create group tour (guide only)
POST /api/group-tours/:id/join — Join a group tour
```

### Map
```
GET /api/map/guides          — Available guide pins
GET /api/map/hidden-gems     — Unlocked hidden gems
```

### Reviews
```
POST /api/reviews            — Submit review after completed tour
```

### Chat
```
GET /api/chat/:bookingId     — Message history for a booking
```

### Real-time (Socket.IO events)
```
chat:join           — Join booking chat room
chat:message        — Send message
chat:typing         — Typing indicator
chat:mark-read      — Mark messages as read
location:update     — Guide sends live location
tour:started        — Tour begins
group-tour:join     — Join group tour room
group-tour:message  — Group chat message
```

---

## 🔒 Security Features
- JWT with short-lived access tokens (7d) + refresh tokens (30d)
- Bcrypt password hashing (12 rounds)
- Helmet.js HTTP headers
- Rate limiting (100 req / 15min)
- Razorpay signature verification
- Escrow payments (released only after tour completion)

---

## 💳 Payment Flow
```
1. Traveler creates booking → status: PENDING
2. POST /payments/create-order → Razorpay order created
3. Frontend opens Razorpay checkout
4. Traveler pays → POST /payments/verify
5. Signature verified → booking status: CONFIRMED
6. Guide completes tour → PATCH /bookings/:id/complete
7. Escrow released → guide wallet credited
```

---

## 🌐 Recommended Hosting

| Service | Use |
|---|---|
| Railway / Render | Node.js backend (free tier available) |
| Supabase | PostgreSQL database (free tier) |
| Cloudinary | Video + image storage (free tier) |
| Razorpay | Payments (no monthly fee, % per transaction) |

---

## 📱 Connecting Frontend

In your React frontend (`travel_design`), update API calls to point to:
```
http://localhost:5000/api  (development)
https://your-api.railway.app/api  (production)
```

Add Socket.IO client:
```bash
npm install socket.io-client
```

```javascript
import { io } from "socket.io-client";
const socket = io("http://localhost:5000", {
  auth: { token: localStorage.getItem("accessToken") }
});
```
