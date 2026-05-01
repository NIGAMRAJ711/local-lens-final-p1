require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173',
  'http://127.0.0.1:5173',
];

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
});
app.set('io', io);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Setup socket
const { setupSocketIO } = require('./services/socket.service');
setupSocketIO(io);

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/guides', require('./routes/guide.routes'));
app.use('/api/bookings', require('./routes/booking.routes'));
app.use('/api/reels', require('./routes/reel.routes'));
app.use('/api/map', require('./routes/map.routes'));
app.use('/api/group-tours', require('./routes/groupTour.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/chat', require('./routes/chat.routes'));
app.use('/api/reviews', require('./routes/review.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/sos', require('./routes/sos.routes'));
app.use('/api/friends', require('./routes/friends.routes'));
app.use('/api/upload', require('./routes/upload.routes'));

app.get('/health', (req, res) => res.json({
  status: 'ok', app: 'LocalLens API', db: 'File-based JSON (persistent)', version: '2.0.0'
}));
app.use('*', (req, res) => res.status(404).json({ error: 'Route not found' }));

const { errorHandler } = require('./middleware/error.middleware');
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, () => {
  console.log(`🚀 LocalLens API on port ${PORT}`);
  console.log(`📦 Database: JSON files in ./data/ (fully persistent)`);
  console.log(`🌍 Frontend: ${allowedOrigins[0]}`);
  console.log(`✅ All systems ready!`);
});
