const express = require('express');
const router = express.Router();
const { messages, bookings, users, directMessages, follows } = require('../db');
const { protect } = require('../middleware/error.middleware');

// ─── DIRECT MESSAGE ROUTES ────────────────────────────────────────────────────

// GET /chat/inbox — latest message per conversation partner
router.get('/inbox', protect, async (req, res) => {
  try {
    const inbox = await directMessages.getInbox(req.user.id);
    res.json({ inbox });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /chat/contacts — friends + guides user has booked, with last message + unread
router.get('/contacts', protect, async (req, res) => {
  try {
    const { USE_PG, query: pgQuery } = require('../db');
    let contactMap = new Map();

    // 1. Accepted friends — combine both followers and following
    const [followers, following] = await Promise.all([
      follows.getFollowers(req.user.id).catch(() => []),
      follows.getFollowing(req.user.id).catch(() => []),
    ]);
    [...followers, ...following].forEach(f => {
      const uid = f.followerId === req.user.id ? f.followingId : f.followerId;
      const name = f.full_name || f.fullName || '';
      const avatar = f.avatar_url || f.avatarUrl || '';
      if (uid && uid !== req.user.id) contactMap.set(uid, { userId: uid, fullName: name, avatarUrl: avatar, role: 'TRAVELER', city: '' });
    });

    // 2. Guides from bookings
    const [guideBookings, travBookings] = await Promise.all([
      bookings.findMany({ guideId: req.user.id }).catch(() => []),
      bookings.findMany({ travelerId: req.user.id }).catch(() => []),
    ]);
    const allBookings = [...guideBookings, ...travBookings].filter(b => b.status !== 'CANCELLED');
    for (const b of allBookings) {
      const otherId = b.guideId === req.user.id ? b.travelerId : b.guideId;
      if (!otherId || contactMap.has(otherId)) continue;
      const u = await users.findById(otherId).catch(() => null);
      if (u) contactMap.set(u.id, { userId: u.id, fullName: u.fullName, avatarUrl: u.avatarUrl, role: u.role || 'TRAVELER', city: '' });
    }

    // 3. Anyone who has DM'd this user
    const inbox = await directMessages.getInbox(req.user.id).catch(() => []);
    inbox.forEach(item => {
      if (!contactMap.has(item.contactId)) {
        contactMap.set(item.contactId, { userId: item.contactId, fullName: item.contactName, avatarUrl: item.contactAvatar, role: item.contactRole || 'TRAVELER', city: '' });
      }
    });

    // Merge last message + unread from inbox
    const inboxMap = new Map(inbox.map(i => [i.contactId, i]));
    const contacts = [...contactMap.values()].map(c => ({
      ...c,
      lastMessage: inboxMap.get(c.userId)?.lastMessage || null,
      lastMessageTime: inboxMap.get(c.userId)?.lastMessageTime || null,
      unreadCount: inboxMap.get(c.userId)?.unreadCount || 0,
      isOnline: false,
    })).sort((a, b) => {
      if (a.unreadCount > 0 && !b.unreadCount) return -1;
      if (b.unreadCount > 0 && !a.unreadCount) return 1;
      return new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0);
    });

    res.json({ contacts });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /chat/dm/:userId — conversation with one user
router.get('/dm/:userId', protect, async (req, res) => {
  try {
    await directMessages.markRead(req.params.userId, req.user.id);
    const msgs = await directMessages.getConversation(req.user.id, req.params.userId);
    const other = await users.findById(req.params.userId);
    res.json({ messages: msgs, contact: other ? { id: other.id, fullName: other.fullName, avatarUrl: other.avatarUrl, role: other.role } : null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /chat/dm/:userId — send direct message
router.post('/dm/:userId', protect, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Message required' });
    const msg = await directMessages.send(req.user.id, req.params.userId, content.trim());
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${req.params.userId}`).emit('direct_message', {
        ...msg, id: msg.id || msg.sender_id,
        senderId: msg.senderId || msg.sender_id,
        receiverId: msg.receiverId || msg.receiver_id,
        content: msg.content, createdAt: msg.createdAt || msg.created_at,
        senderName: req.user.fullName, senderAvatar: req.user.avatarUrl,
      });
    }
    // Offline notification
    const { notifications } = require('../db');
    await notifications.create({ userId: req.params.userId, title: req.user.fullName, body: content.trim().slice(0, 80), type: 'NEW_MESSAGE', data: { fromUserId: req.user.id } }).catch(() => {});
    res.status(201).json({ message: msg });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── LEGACY BOOKING CHAT ──────────────────────────────────────────────────────

router.get('/conversations/all', protect, async (req, res) => {
  try {
    const [guideBookings, travBookings] = await Promise.all([
      bookings.findMany({ guideId: req.user.id }),
      bookings.findMany({ travelerId: req.user.id }),
    ]);
    const allBookings = [...guideBookings, ...travBookings].filter(b => b.status !== 'CANCELLED');
    const unique = Array.from(new Map(allBookings.map(b => [b.id, b])).values());
    const convs = await Promise.all(unique.map(async b => {
      const msgs = await messages.findByBooking(b.id);
      const lastMsg = msgs[msgs.length - 1] || null;
      const unread = msgs.filter(m => m.receiverId === req.user.id && !m.isRead).length;
      const otherId = b.guideId === req.user.id ? b.travelerId : b.guideId;
      const other = await users.findById(otherId);
      return { booking: b, lastMessage: lastMsg, unreadCount: unread, otherUser: other ? { id: other.id, fullName: other.fullName, avatarUrl: other.avatarUrl } : null };
    }));
    res.json({ conversations: convs.filter(c => c.otherUser).sort((a, b) => new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0)) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:bookingId', protect, async (req, res) => {
  try {
    const booking = await bookings.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.guideId !== req.user.id && booking.travelerId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    await messages.markRead(req.params.bookingId, req.user.id);
    const msgs = await messages.findByBooking(req.params.bookingId);
    res.json({ messages: msgs });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:bookingId', protect, async (req, res) => {
  try {
    const { content, receiverId } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Message content required' });
    const booking = await bookings.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.guideId !== req.user.id && booking.travelerId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
    const actualReceiverId = receiverId || (booking.guideId === req.user.id ? booking.travelerId : booking.guideId);
    const msg = await messages.create({ bookingId: req.params.bookingId, senderId: req.user.id, receiverId: actualReceiverId, content: content.trim() });
    const io = req.app.get('io');
    if (io) { io.to(`booking:${req.params.bookingId}`).emit('chat:new-message', msg); io.to(`user:${actualReceiverId}`).emit('chat:new-message', msg); }
    res.status(201).json({ message: msg });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
