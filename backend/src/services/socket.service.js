const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'locallens-secret-2024';

// Track online users: userId → socketId
const onlineUsers = new Map();

function setupSocketIO(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Auth required'));
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.userId;
      socket.data.userId = decoded.userId;
      next();
    } catch { next(new Error('Invalid token')); }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;

    // Join personal room
    socket.join(`user:${userId}`);
    onlineUsers.set(userId, socket.id);

    // Broadcast online to all
    socket.broadcast.emit('user_online', { userId });

    // ── Direct message ────────────────────────────────────────────
    socket.on('send_direct_message', async ({ receiverId, content }) => {
      try {
        if (!content?.trim() || !receiverId) return;
        const { directMessages, users, notifications } = require('../db');
        const msg = await directMessages.send(userId, receiverId, content.trim());

        // Get sender info to attach to socket event
        const sender = await users.findById(userId).catch(() => null);

        // Deliver to receiver
        io.to(`user:${receiverId}`).emit('direct_message', {
          ...msg,
          senderName: sender?.fullName,
          senderAvatar: sender?.avatarUrl,
        });

        // Confirm to sender
        socket.emit('direct_message_sent', msg);

        // Notification if receiver offline
        if (!onlineUsers.has(receiverId)) {
          notifications.create({
            userId: receiverId,
            title: sender?.fullName || 'Message',
            body: content.trim().slice(0, 80),
            type: 'NEW_MESSAGE',
            data: { senderId: userId, senderName: sender?.fullName },
          }).catch(() => {});
        }
      } catch (err) {
        socket.emit('dm_error', { error: 'Failed to send' });
      }
    });

    socket.on('mark_read', async ({ contactId }) => {
      try {
        const { directMessages } = require('../db');
        await directMessages.markRead(contactId, userId);
        io.to(`user:${contactId}`).emit('messages_read', { by: userId });
      } catch {}
    });

    socket.on('typing', ({ receiverId }) => {
      io.to(`user:${receiverId}`).emit('contact_typing', { userId });
    });

    socket.on('stop_typing', ({ receiverId }) => {
      io.to(`user:${receiverId}`).emit('contact_stop_typing', { userId });
    });

    // ── Booking chat (preserved) ──────────────────────────────────
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

    // ── Guide location ───────────────────────────────────────────
    socket.on('guide:location-update', ({ latitude, longitude }) => {
      io.emit('guide:location-updated', { guideId: userId, latitude, longitude });
    });

    // ── Disconnect ───────────────────────────────────────────────
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      socket.broadcast.emit('user_offline', { userId });
    });
  });
}

module.exports = { setupSocketIO, onlineUsers };
