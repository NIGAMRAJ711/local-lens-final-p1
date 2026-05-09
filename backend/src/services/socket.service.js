const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'locallens-secret-2024';

// Track online users: userId → Set of socketIds
const onlineUsers = new Map();

function setupSocketIO(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Auth required'));
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.userId;
      socket.data.user = decoded;
      next();
    } catch { next(new Error('Invalid token')); }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;

    // Join personal room
    socket.join(`user:${userId}`);

    // Track online
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);
    io.emit('user_online', { userId });

    // ── Direct Messages ─────────────────────────────────────────
    socket.on('send_direct_message', async ({ receiverId, content }) => {
      try {
        if (!content?.trim() || !receiverId) return;
        const { directMessages, notifications } = require('../db');
        const msg = await directMessages.send(userId, receiverId, content.trim());
        const payload = {
          id: msg.id || msg.sender_id,
          senderId: userId,
          receiverId,
          content: msg.content || content.trim(),
          createdAt: msg.createdAt || msg.created_at || new Date().toISOString(),
          isRead: false,
          senderName: socket.data.user?.fullName || '',
          senderAvatar: socket.data.user?.avatarUrl || '',
        };
        // Deliver to receiver's room
        io.to(`user:${receiverId}`).emit('direct_message', payload);
        // Confirm to sender
        socket.emit('direct_message_sent', payload);
      } catch (err) {
        socket.emit('chat:error', { error: 'Failed to send' });
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
      io.to(`user:${receiverId}`).emit('user_typing', { userId });
    });

    socket.on('stop_typing', ({ receiverId }) => {
      io.to(`user:${receiverId}`).emit('user_stop_typing', { userId });
    });

    // ── Legacy booking chat ──────────────────────────────────────
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
    socket.on('guide:updateLocation', async ({ latitude, longitude }) => {
      try {
        const { guideProfiles } = require('../db');
        await guideProfiles.updateByUserId(userId, { latitude: parseFloat(latitude), longitude: parseFloat(longitude) });
      } catch {}
      socket.broadcast.emit('guide:locationUpdate', { guideId: userId, latitude, longitude, timestamp: new Date() });
    });

    socket.on('guide:location-update', async ({ latitude, longitude }) => {
      try {
        const { guideProfiles } = require('../db');
        await guideProfiles.updateByUserId(userId, { latitude: parseFloat(latitude), longitude: parseFloat(longitude) });
      } catch {}
      io.emit('guide:location-updated', { guideId: userId, latitude, longitude });
      socket.broadcast.emit('guide:locationUpdate', { guideId: userId, latitude, longitude, timestamp: new Date() });
    });

    socket.on('sos:triggered', (payload) => {
      socket.broadcast.emit('sos:triggered', { ...payload, userId, timestamp: new Date() });
    });

    // ── Disconnect ───────────────────────────────────────────────
    socket.on('disconnect', () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit('user_offline', { userId });
        }
      }
    });
  });
}

function isUserOnline(userId) {
  return onlineUsers.has(userId) && onlineUsers.get(userId).size > 0;
}

module.exports = { setupSocketIO, isUserOnline, onlineUsers };
