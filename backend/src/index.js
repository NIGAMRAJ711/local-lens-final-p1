require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const authRoutes      = require('./routes/auth.routes');
const userRoutes      = require('./routes/user.routes');
const guideRoutes     = require('./routes/guide.routes');
const bookingRoutes   = require('./routes/booking.routes');
const reelRoutes      = require('./routes/reel.routes');
const mapRoutes       = require('./routes/map.routes');
const groupTourRoutes = require('./routes/groupTour.routes');
const paymentRoutes   = require('./routes/payment.routes');
const chatRoutes      = require('./routes/chat.routes');
const reviewRoutes    = require('./routes/review.routes');
const notifRoutes     = require('./routes/notification.routes');
const sosRoutes       = require('./routes/sos.routes');
const friendsRoutes   = require('./routes/friends.routes');
const uploadRoutes    = require('./routes/upload.routes');

const { setupSocketIO } = require('./services/socket.service');
const { errorHandler }  = require('./middleware/error.middleware');

const app = express();
const httpServer = createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = [
  FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
  'http://localhost:5001',
];

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
});
setupSocketIO(io);
app.set('io', io);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically
const uploadsDir = path.join(__dirname, '../uploads');
const fs = require('fs');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use('/api', limiter);

// ── Routes ──────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/users',       userRoutes);
app.use('/api/guides',      guideRoutes);
app.use('/api/bookings',    bookingRoutes);
app.use('/api/reels',       reelRoutes);
app.use('/api/map',         mapRoutes);
app.use('/api/group-tours', groupTourRoutes);
app.use('/api/payments',    paymentRoutes);
app.use('/api/chat',        chatRoutes);
app.use('/api/reviews',     reviewRoutes);
app.use('/api/notifications', notifRoutes);
app.use('/api/sos',         sosRoutes);
app.use('/api/friends',     friendsRoutes);
app.use('/api/upload',      uploadRoutes);

app.get('/health', (req, res) => res.json({
  status: 'ok', app: 'LocalLens API',
  db: 'File-based JSON (persistent)', version: '2.0.0',
}));

// Serve React frontend in production
const distPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

app.use('*', (req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, () => {
  console.log(`\n🚀 LocalLens API on port ${PORT}`);
  console.log(`📦 Database: JSON files in ./data/ (fully persistent)`);
  console.log(`🌍 Frontend: ${FRONTEND_URL}`);
  if (fs.existsSync(distPath)) console.log(`🖥️  Serving built frontend from: ${distPath}`);
  console.log(`✅ All systems ready!\n`);
});
