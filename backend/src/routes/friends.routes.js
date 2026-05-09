/** Friend routes: follow requests, accept/decline flows, friendship status, and profiles. */
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

// status route moved to new endpoints below

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

// ─── New friend request endpoints ───────────────────────────────────────────

router.post('/request/:userId', protect, async (req, res) => {
  try {
    const db = getDb();
    const targetId = req.params.userId;
    if (targetId === req.user.id) return res.status(400).json({ error: 'Cannot send request to yourself' });
    const result = await db.follows.follow(req.user.id, targetId);
    await notifications.create({
      userId: targetId,
      title: '👤 Friend Request',
      body: `${req.user.fullName} sent you a friend request`,
      type: 'FRIEND_REQUEST',
      data: { fromUserId: req.user.id, fromName: req.user.fullName, followId: result.id },
    });
    res.json({ result, message: 'Friend request sent' });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.patch('/request/:requestId/accept', protect, async (req, res) => {
  try {
    const db = getDb();
    const result = await db.follows.accept(req.params.requestId, req.user.id);
    res.json({ result, message: 'Friend request accepted' });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.patch('/request/:requestId/decline', protect, async (req, res) => {
  try {
    const db = getDb();
    const { USE_PG, query: pgQuery } = db.USE_PG ? require('../db') : { USE_PG: false, query: null };
    if (db.USE_PG) {
      await pgQuery('UPDATE follows SET status=$1 WHERE id=$2 AND following_id=$3', ['REJECTED', req.params.requestId, req.user.id]);
    } else {
      // JSON mode — unfollow entirely (decline = remove the request)
      const allFollows = db.follows;
      // Find the follow record and remove it via unfollow on follower side
      // We do this by finding the follow and using the follower's id
      // Since we only have the id, we patch directly on the JSON store via follows.getPending then filter
      const pending = await db.follows.getPending(req.user.id);
      const record = pending.find(f => f.id === req.params.requestId);
      if (record && record.followerId) {
        await db.follows.unfollow(record.followerId, req.user.id).catch(() => {});
      }
    }
    res.json({ message: 'Friend request declined' });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.get('/requests/incoming', protect, async (req, res) => {
  try {
    const db = getDb();
    const pending = await db.follows.getPending(req.user.id);
    res.json({ requests: pending });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/requests/sent', protect, async (req, res) => {
  try {
    const db = getDb();
    if (db.USE_PG) {
      const { query } = require('../db');
      const rows = await query('SELECT f.*,u.full_name,u.avatar_url FROM follows f JOIN users u ON u.id=f.following_id WHERE f.follower_id=$1 AND f.status=$2', [req.user.id, 'PENDING']);
      return res.json({ requests: rows.map(r => ({ id: r.id, followerId: r.follower_id, followingId: r.following_id, status: r.status, user: { id: r.following_id, fullName: r.full_name, avatarUrl: r.avatar_url } })) });
    }
    // JSON mode — reuse getPending from the other direction
    const allFollowing = await db.follows.getFollowing ? db.follows.getFollowing(req.user.id) : [];
    const pending = allFollowing.filter(f => f.status === 'PENDING');
    res.json({ requests: pending });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/status/:userId', protect, async (req, res) => {
  try {
    const db = getDb();
    const targetId = req.params.userId;
    const myId = req.user.id;
    if (db.USE_PG) {
      const { query } = require('../db');
      const sent = await query('SELECT id,status FROM follows WHERE follower_id=$1 AND following_id=$2', [myId, targetId]);
      const recv = await query('SELECT id,status FROM follows WHERE follower_id=$1 AND following_id=$2', [targetId, myId]);
      if (sent[0]?.status === 'ACCEPTED' || recv[0]?.status === 'ACCEPTED') return res.json({ status: 'FRIENDS', requestId: sent[0]?.id || recv[0]?.id });
      if (sent[0]?.status === 'PENDING') return res.json({ status: 'PENDING_SENT', requestId: sent[0].id });
      if (recv[0]?.status === 'PENDING') return res.json({ status: 'PENDING_RECEIVED', requestId: recv[0].id });
      return res.json({ status: 'NONE' });
    }
    // JSON mode — use existing getStatus plus getPending
    const sentStatus = await db.follows.getStatus(myId, targetId);
    const recvStatus = await db.follows.getStatus(targetId, myId);
    if (sentStatus === 'ACCEPTED' || recvStatus === 'ACCEPTED') return res.json({ status: 'FRIENDS' });
    if (sentStatus === 'PENDING') {
      const sentReqs = await db.follows.getPending ? [] : [];
      return res.json({ status: 'PENDING_SENT' });
    }
    if (recvStatus === 'PENDING') return res.json({ status: 'PENDING_RECEIVED' });
    res.json({ status: 'NONE' });
  } catch (err) { res.json({ status: 'NONE' }); }
});

router.get('/count/:userId', protect, async (req, res) => {
  try {
    const db = getDb();
    if (db.USE_PG) {
      const { query } = require('../db');
      const rows = await query('SELECT COUNT(*) as cnt FROM follows WHERE (follower_id=$1 OR following_id=$1) AND status=$2', [req.params.userId, 'ACCEPTED']);
      return res.json({ count: parseInt(rows[0]?.cnt || 0) });
    }
    // JSON mode — combine followers + following and deduplicate
    const [followers, following] = await Promise.all([
      db.follows.getFollowers(req.params.userId),
      db.follows.getFollowing(req.params.userId),
    ]);
    const ids = new Set([...followers.map(f => f.followerId), ...following.map(f => f.followingId)]);
    res.json({ count: ids.size });
  } catch (err) { res.json({ count: 0 }); }
});
