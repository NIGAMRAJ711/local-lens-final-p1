const express = require('express');
const router = express.Router();
const { users, bookings, guideProfiles, reels } = require('../db');
const { protect } = require('../middleware/error.middleware');

// GET /api/friends — connections via shared bookings
router.get('/', protect, (req, res) => {
  const myBookings = bookings.findMany({ guideId: req.user.id }).concat(bookings.findMany({ travelerId: req.user.id }));
  const friendMap = new Map();
  myBookings.forEach(b => {
    const otherId = b.guideId === req.user.id ? b.travelerId : b.guideId;
    if (otherId !== req.user.id && !friendMap.has(otherId)) {
      const u = users.findById(otherId);
      if (u) {
        const { passwordHash, ...safe } = u;
        friendMap.set(otherId, safe);
      }
    }
  });
  const friends = Array.from(friendMap.values());
  res.json({ friends, count: friends.length });
});

// GET /api/friends/search
router.get('/search', protect, (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ users: [] });
  const results = users.findAll()
    .filter(u => u.id !== req.user.id && u.isActive !== false &&
      (u.fullName?.toLowerCase().includes(q.toLowerCase()) || u.email?.toLowerCase().includes(q.toLowerCase())))
    .slice(0, 20)
    .map(u => { const { passwordHash, ...safe } = u; return safe; });
  res.json({ users: results });
});

// GET /api/friends/profile/:userId
router.get('/profile/:userId', protect, (req, res) => {
  const user = users.findById(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { passwordHash, ...safe } = user;
  const guide = guideProfiles.findByUserId(user.id);
  const userReels = reels.findByUser(user.id).slice(0, 9);
  const connectionCount = bookings.findMany({ guideId: user.id }).length + bookings.findMany({ travelerId: user.id }).length;
  res.json({ user: { ...safe, guideProfile: guide, reels: userReels }, connectionCount });
});

module.exports = router;
