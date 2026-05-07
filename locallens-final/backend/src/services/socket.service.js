const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'locallens-secret-2024';

function setupSocketIO(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Auth required'));
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch { next(new Error('Invalid token')); }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    socket.join(`user:${userId}`);

    socket.on('chat:join', ({ bookingId }) => {
      if (bookingId) socket.join(`booking:${bookingId}`);
    });

    socket.on('chat:message', async ({ bookingId, receiverId, content }) => {
      try {
        if (!content?.trim() || !bookingId || !receiverId) return;
        const { messages, notifications } = require('../db');
        const msg = await messages.create({ bookingId, senderId: userId, receiverId, content: content.trim() });
        io.to(`booking:${bookingId}`).emit('chat:new-message', msg);
        io.to(`user:${receiverId}`).emit('chat:new-message', msg);
        notifications.create({ userId: receiverId, title: '💬 New Message', body: content.trim().slice(0, 80), type: 'MESSAGE', data: { bookingId, senderId: userId } }).catch(() => {});
      } catch (err) {
        console.error('Socket msg error:', err.message);
        socket.emit('chat:error', { error: 'Failed to send' });
      }
    });

    socket.on('chat:mark-read', async ({ bookingId }) => {
      try {
        const { messages } = require('../db');
        await messages.markRead(bookingId, userId);
        socket.to(`booking:${bookingId}`).emit('chat:messages-read', { bookingId, userId });
      } catch {}
    });

    socket.on('guide:location-update', ({ latitude, longitude }) => {
      io.emit('guide:location-updated', { guideId: userId, latitude, longitude });
    });

    socket.on('disconnect', () => {
      io.emit('user:offline', { userId });
    });
  });
}

module.exports = { setupSocketIO };
