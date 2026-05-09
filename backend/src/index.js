require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const { initSchema, guideProfiles, USE_PG } = require('./db');
const { setupSocketIO } = require('./services/socket.service');
const { errorHandler } = require('./middleware/error.middleware');

const app = express();
const httpServer = createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = [
  FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
  /\.render\.com$/,
  /\.onrender\.com$/,
  /\.railway\.app$/,
  /\.vercel\.app$/,
];

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET','POST'], credentials: true },
});
setupSocketIO(io);
app.set('io', io);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      mediaSrc: ["'self'", "https:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "wss:", "ws:", "https:"],
    },
  },
}));
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use((req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    delete req.body.__proto__;
    delete req.body.constructor;
    delete req.body.prototype;
  }
  next();
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, try again later' },
});

// Serve uploaded files
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth',          authLimiter, require('./routes/auth.routes'));
app.use('/api/users',         require('./routes/user.routes'));
app.use('/api/guides',        require('./routes/guide.routes'));
app.use('/api/bookings',      require('./routes/booking.routes'));
app.use('/api/reels',         require('./routes/reel.routes'));
app.use('/api/map',           require('./routes/map.routes'));
app.use('/api/group-tours',   require('./routes/groupTour.routes'));
app.use('/api/payments',      require('./routes/payment.routes'));
app.use('/api/chat',          require('./routes/chat.routes'));
app.use('/api/reviews',       require('./routes/review.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/sos',           require('./routes/sos.routes'));
app.use('/api/friends',       require('./routes/friends.routes'));
app.use('/api/upload',        require('./routes/upload.routes'));

app.get('/health', (req, res) => res.json({
  status: 'ok', app: 'LocalLens API', version: '2.0.0',
  database: USE_PG ? 'PostgreSQL' : 'JSON files',
  frontend: FRONTEND_URL,
}));

// Serve built frontend in production
const distPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

app.use('*', (req, res) => res.status(404).json({ success: false, error: 'Not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

async function start() {
  // 1. Init PostgreSQL schema
  if (USE_PG) {
    console.log('🐘 Initializing PostgreSQL schema...');
    await initSchema();
  }

  // 2. Start the server FIRST so it's always available
  httpServer.listen(PORT, () => {
    console.log(`\n🚀 LocalLens API on port ${PORT}`);
    console.log(`📦 Database: ${USE_PG ? 'PostgreSQL ✅' : 'JSON files'}`);
    console.log(`🌍 CORS: ${FRONTEND_URL}`);
    if (fs.existsSync(distPath)) console.log(`🖥️  Serving frontend`);
    console.log(`\n✅ Ready at http://localhost:${PORT}\n`);
  });

  // 3. Seed in background AFTER server is up (won't block or crash server)
  setTimeout(async () => {
    try {
      const existingGuides = await guideProfiles.findMany({ page: 1, limit: 3 });
      if (existingGuides.length === 0) {
        console.log('🌱 Database empty — seeding demo data...');
        const { seed } = require('./seed');
        await seed();
      } else {
        console.log(`✅ Database has ${existingGuides.length} guides — skipping seed`);
      }
    } catch (e) {
      console.log('⚠️  Seed check skipped:', e.message);
    }
  }, 2000); // Wait 2s after server starts
}

start().catch(err => { console.error('Fatal startup error:', err); process.exit(1); });

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
