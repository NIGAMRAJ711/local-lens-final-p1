const express = require('express');
const router = express.Router();
const { users, bookings, guideProfiles, reels } = require('../db');
const { protect } = require('../middleware/error.middleware');

// GET /api/friends — Connections (users who have shared bookings)
router.get('/', protect, (req, res) => {
  try {
    const allBookings = [
      ...bookings.findMany({ guideId: req.user.id }),
      ...bookings.findMany({ travelerId: req.user.id }),
    ];
    const friendMap = new Map();
    allBookings.forEach(b => {
      const otherId = b.guideId === req.user.id ? b.travelerId : b.guideId;
      if (otherId && otherId !== req.user.id && !friendMap.has(otherId)) {
        const u = users.findById(otherId);
        if (u) {
          const { passwordHash, ...safe } = u;
          friendMap.set(otherId, safe);
        }
      }
    });
    const friends = Array.from(friendMap.values());
    res.json({ friends, count: friends.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/friends/search?q=name
router.get('/search', protect, (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ users: [] });
    const all = users.findAll().filter(u =>
      u.id !== req.user.id &&
      u.isActive &&
      (u.fullName?.toLowerCase().includes(q.toLowerCase()) ||
       u.email?.toLowerCase().includes(q.toLowerCase()))
    );
    const safe = all.map(({ passwordHash, ...u }) => ({
      ...u,
      guideProfile: guideProfiles.findByUserId(u.id),
    }));
    res.json({ users: safe.slice(0, 20) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/friends/profile/:userId — Public profile
router.get('/profile/:userId', protect, (req, res) => {
  try {
    const u = users.findById(req.params.userId);
    if (!u) return res.status(404).json({ error: 'User not found' });
    const { passwordHash, ...safe } = u;

    const guide = guideProfiles.findByUserId(u.id);
    const userReels = reels.findByUser(u.id);
    const connectionCount = bookings.findMany({ guideId: u.id }).length +
                            bookings.findMany({ travelerId: u.id }).length;

    res.json({
      user: { ...safe, guideProfile: guide, reels: userReels },
      connectionCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
