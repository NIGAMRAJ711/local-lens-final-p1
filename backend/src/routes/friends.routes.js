const express = require('express');
const router = express.Router();
const { users, bookings, guideProfiles, reels } = require('../db');
const { protect } = require('../middleware/error.middleware');
function safe(u) { if(!u)return null; const{passwordHash,...s}=u; return s; }

router.get('/', protect, async (req, res) => {
  try {
    const [asGuide, asTrav] = await Promise.all([bookings.findMany({guideId:req.user.id}), bookings.findMany({travelerId:req.user.id})]);
    const map = new Map();
    for (const b of [...asGuide,...asTrav]) {
      const otherId = b.guideId===req.user.id ? b.travelerId : b.guideId;
      if (otherId && otherId!==req.user.id && !map.has(otherId)) {
        const u = await users.findById(otherId);
        if (u) map.set(otherId, safe(u));
      }
    }
    const friends = Array.from(map.values());
    res.json({ friends, count:friends.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q||q.length<2) return res.json({ users:[] });
    const all = await users.findAll();
    const filtered = all.filter(u=>u.id!==req.user.id&&u.isActive&&(u.fullName?.toLowerCase().includes(q.toLowerCase())||u.email?.toLowerCase().includes(q.toLowerCase())));
    const result = await Promise.all(filtered.slice(0,20).map(async u=>({ ...safe(u), guideProfile:await guideProfiles.findByUserId(u.id) })));
    res.json({ users:result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/profile/:userId', protect, async (req, res) => {
  try {
    const u = await users.findById(req.params.userId);
    if (!u) return res.status(404).json({ error:'User not found' });
    const [guide, userReels, gBookings, tBookings] = await Promise.all([guideProfiles.findByUserId(u.id), reels.findByUser(u.id), bookings.findMany({guideId:u.id}), bookings.findMany({travelerId:u.id})]);
    res.json({ user:{ ...safe(u), guideProfile:guide, reels:userReels }, connectionCount:gBookings.length+tBookings.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
