const express = require('express');
const router = express.Router();
const { users, bookings, guideProfiles, reels, notifications } = require('../db');
const { protect } = require('../middleware/error.middleware');

function safe(u) { if(!u)return null; const{passwordHash,...s}=u; return s; }
function getDb() { return require('../db'); }

router.get('/', protect, async (req, res) => {
  try {
    const db = getDb();
    const [followers, following] = await Promise.all([db.follows.getFollowers(req.user.id), db.follows.getFollowing(req.user.id)]);
    const map = new Map();
    followers.forEach(f => f.user && map.set(f.user.id, f.user));
    following.forEach(f => f.user && map.set(f.user.id, f.user));
    res.json({ friends: Array.from(map.values()), count: map.size });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/pending', protect, async (req, res) => {
  try {
    const pending = await getDb().follows.getPending(req.user.id);
    res.json({ requests: pending });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/follow/:userId', protect, async (req, res) => {
  try {
    const result = await getDb().follows.follow(req.user.id, req.params.userId);
    await notifications.create({ userId: req.params.userId, title: '👋 New Follow Request', body: `${req.user.fullName} wants to follow you`, type: 'FOLLOW_REQUEST', data: { fromUserId: req.user.id, followId: result.id } });
    res.json({ result, message: 'Follow request sent' });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.post('/accept/:followId', protect, async (req, res) => {
  try {
    const result = await getDb().follows.accept(req.params.followId, req.user.id);
    res.json({ result, message: 'Accepted' });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/unfollow/:userId', protect, async (req, res) => {
  try {
    await getDb().follows.unfollow(req.user.id, req.params.userId);
    res.json({ message: 'Unfollowed' });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.get('/status/:userId', protect, async (req, res) => {
  try {
    const status = await getDb().follows.getStatus(req.user.id, req.params.userId);
    res.json({ status });
  } catch (err) { res.json({ status: null }); }
});

router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ users: [] });
    const all = await users.findAll();
    const filtered = all.filter(u => u.id !== req.user.id && u.isActive && (u.fullName?.toLowerCase().includes(q.toLowerCase()) || u.email?.toLowerCase().includes(q.toLowerCase())));
    const db = getDb();
    const result = await Promise.all(filtered.slice(0, 20).map(async u => ({ ...safe(u), guideProfile: await guideProfiles.findByUserId(u.id), followStatus: await db.follows.getStatus(req.user.id, u.id) })));
    res.json({ users: result });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/profile/:userId', protect, async (req, res) => {
  try {
    const u = await users.findById(req.params.userId);
    if (!u) return res.status(404).json({ error: 'User not found' });
    const db = getDb();
    const [guide, userReels, gBook, tBook, followers, following, followStatus] = await Promise.all([guideProfiles.findByUserId(u.id), reels.findByUser(u.id), bookings.findMany({ guideId: u.id }), bookings.findMany({ travelerId: u.id }), db.follows.getFollowers(u.id), db.follows.getFollowing(u.id), db.follows.getStatus(req.user.id, u.id)]);
    res.json({ user: { ...safe(u), guideProfile: guide, reels: userReels }, connectionCount: gBook.length + tBook.length, followersCount: followers.length, followingCount: following.length, followStatus });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
