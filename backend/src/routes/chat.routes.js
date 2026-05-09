const express = require('express');
const router = express.Router();
const { messages, bookings, users, directMessages, follows, guideProfiles, notifications } = require('../db');
const { protect } = require('../middleware/error.middleware');

// ── Direct Message endpoints ──────────────────────────────────────

// GET /chat/inbox — latest DM per contact
router.get('/inbox', protect, async (req, res) => {
  try {
    const inbox = await directMessages.getInbox(req.user.id);
    res.json({ inbox: inbox.filter(i => i.user) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /chat/contacts — friends + booked guides, merged
router.get('/contacts', protect, async (req, res) => {
  try {
    // Get DM inbox for unread/lastMessage data
    const inbox = await directMessages.getInbox(req.user.id).catch(() => []);
    const inboxMap = new Map(inbox.map(i => [i.contactId, i]));

    // Get accepted friends
    const friendFollows = await follows.getFollowers(req.user.id).catch(() => []);
    const friendFollowing = await follows.getFollowing(req.user.id).catch(() => []);
    const friendIds = new Set([
      ...friendFollows.filter(f => f.status === 'ACCEPTED').map(f => f.followerId),
      ...friendFollowing.filter(f => f.status === 'ACCEPTED').map(f => f.followingId),
    ]);
    friendIds.delete(req.user.id);

    // Get guides from bookings
    const [gBookings, tBookings] = await Promise.all([
      bookings.findMany({ guideId: req.user.id }).catch(() => []),
      bookings.findMany({ travelerId: req.user.id }).catch(() => []),
    ]);
    const bookingGuideIds = new Set([
      ...gBookings.map(b => b.travelerId),
      ...tBookings.map(b => b.guideId),
    ].filter(id => id && id !== req.user.id));

    const allIds = new Set([...friendIds, ...bookingGuideIds]);

    const contacts = await Promise.all([...allIds].map(async id => {
      const u = await users.findById(id).catch(() => null);
      if (!u) return null;
      const dm = inboxMap.get(id);
      const guide = await guideProfiles.findByUserId(id).catch(() => null);
      return {
        userId: u.id,
        fullName: u.fullName,
        avatarUrl: u.avatarUrl,
        role: u.role,
        city: guide?.city || '',
        lastMessage: dm?.lastMessage || null,
        lastMessageTime: dm?.lastMessageTime || null,
        lastSenderId: dm?.lastSenderId || null,
        unreadCount: dm?.unreadCount || 0,
        isOnline: false, // updated by socket
        isFriend: friendIds.has(id),
      };
    }));

    const result = contacts.filter(Boolean).sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
      if (a.lastMessageTime && b.lastMessageTime) return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
      if (a.lastMessageTime) return -1;
      if (b.lastMessageTime) return 1;
      return a.fullName.localeCompare(b.fullName);
    });

    res.json({ contacts: result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /chat/dm/:userId — get conversation + mark read
router.get('/dm/:userId', protect, async (req, res) => {
  try {
    const conv = await directMessages.getConversation(req.user.id, req.params.userId);
    await directMessages.markRead(req.params.userId, req.user.id).catch(() => {});
    res.json({ messages: conv });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /chat/dm/:userId — send DM
router.post('/dm/:userId', protect, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Content required' });
    const msg = await directMessages.send(req.user.id, req.params.userId, content.trim());

    // Emit via socket to receiver's room
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${req.params.userId}`).emit('direct_message', {
        ...msg,
        senderName: req.user.fullName,
        senderAvatar: req.user.avatarUrl,
      });
    }

    // Notification for offline users
    notifications.create({
      userId: req.params.userId,
      title: req.user.fullName,
      body: content.trim().slice(0, 80),
      type: 'NEW_MESSAGE',
      data: { senderId: req.user.id, senderName: req.user.fullName },
    }).catch(() => {});

    res.status(201).json({ message: msg });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Booking chat endpoints (preserved) ───────────────────────────

// GET /chat/conversations/all
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
    res.json({ conversations: convs.filter(c => c.otherUser).sort((a,b) => new Date(b.lastMessage?.createdAt||b.booking?.createdAt||0) - new Date(a.lastMessage?.createdAt||a.booking?.createdAt||0)) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /chat/:bookingId
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

// POST /chat/:bookingId
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
