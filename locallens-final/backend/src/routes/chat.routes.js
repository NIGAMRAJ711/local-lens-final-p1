const express = require('express');
const router = express.Router();
const { messages, bookings, users } = require('../db');
const { protect } = require('../middleware/error.middleware');

// GET /api/chat/:bookingId — get all messages (persisted in DB)
router.get('/:bookingId', protect, async (req, res) => {
  try {
    const booking = await bookings.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.guideId !== req.user.id && booking.travelerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    await messages.markRead(req.params.bookingId, req.user.id);
    const msgs = await messages.findByBooking(req.params.bookingId);
    res.json({ messages: msgs });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/chat/:bookingId — send message (also saved via socket, this is fallback)
router.post('/:bookingId', protect, async (req, res) => {
  try {
    const { content, receiverId } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Message content required' });
    const booking = await bookings.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.guideId !== req.user.id && booking.travelerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const actualReceiverId = receiverId || (booking.guideId === req.user.id ? booking.travelerId : booking.guideId);
    const msg = await messages.create({
      bookingId: req.params.bookingId,
      senderId: req.user.id,
      receiverId: actualReceiverId,
      content: content.trim(),
    });

    // Emit via socket if available
    const io = req.app.get('io');
    if (io) {
      io.to(`booking:${req.params.bookingId}`).emit('chat:new-message', msg);
      io.to(`user:${actualReceiverId}`).emit('chat:new-message', msg);
    }

    res.status(201).json({ message: msg });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/chat/conversations/all — all conversations for a user
router.get('/conversations/all', protect, async (req, res) => {
  try {
    const [guideBookings, travBookings] = await Promise.all([
      bookings.findMany({ guideId: req.user.id }),
      bookings.findMany({ travelerId: req.user.id }),
    ]);
    const allBookings = [...guideBookings, ...travBookings].filter(b => b.status !== 'CANCELLED');
    const unique = Array.from(new Map(allBookings.map(b => [b.id, b])).values());
    
    // Get last message for each booking
    const convs = await Promise.all(unique.map(async b => {
      const msgs = await messages.findByBooking(b.id);
      const lastMsg = msgs[msgs.length - 1] || null;
      const unread = msgs.filter(m => m.receiverId === req.user.id && !m.isRead).length;
      const otherId = b.guideId === req.user.id ? b.travelerId : b.guideId;
      const other = await users.findById(otherId);
      return { booking: b, lastMessage: lastMsg, unreadCount: unread, otherUser: other ? { id: other.id, fullName: other.fullName, avatarUrl: other.avatarUrl } : null };
    }));
    
    res.json({ conversations: convs.filter(c => c.otherUser).sort((a,b) => {
      const aTime = a.lastMessage?.createdAt || a.booking?.createdAt || 0;
      const bTime = b.lastMessage?.createdAt || b.booking?.createdAt || 0;
      return new Date(bTime) - new Date(aTime);
    })});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
