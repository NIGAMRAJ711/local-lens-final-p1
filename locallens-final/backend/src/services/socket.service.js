const jwt = require('jsonwebtoken');
const { users, messages, notifications } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'locallens-secret-2024';

function setupSocketIO(io) {
  // Auth middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = users.findById(decoded.userId);
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`✅ Socket connected: ${user.fullName} (${user.id})`);

    // Join personal room
    socket.join(`user:${user.id}`);

    // Join booking chat room
    socket.on('chat:join', ({ bookingId }) => {
      socket.join(`booking:${bookingId}`);
    });

    // Send message
    socket.on('chat:message', ({ bookingId, receiverId, content }) => {
      if (!bookingId || !content?.trim()) return;
      const msg = messages.create({
        bookingId,
        senderId: user.id,
        receiverId,
        content: content.trim(),
      });

      // Emit to booking room (both sender and receiver see it)
      io.to(`booking:${bookingId}`).emit('chat:new-message', msg);

      // Send push notification to receiver
      notifications.create({
        userId: receiverId,
        title: `💬 ${user.fullName}`,
        body: content.trim().slice(0, 80),
        type: 'MESSAGE',
        data: { bookingId },
      });
      io.to(`user:${receiverId}`).emit('notification:new', { title: `💬 ${user.fullName}`, body: content.trim().slice(0, 80) });
    });

    // Mark messages as read
    socket.on('chat:mark-read', ({ bookingId }) => {
      messages.markRead(bookingId, user.id);
    });

    // Guide location update
    socket.on('guide:update-location', ({ latitude, longitude }) => {
      io.emit('guide:location-update', { guideId: user.id, latitude, longitude });
    });

    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${user.fullName}`);
    });
  });
}

module.exports = { setupSocketIO };
