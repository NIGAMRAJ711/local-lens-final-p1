const express = require('express');
const router = express.Router();
const { users, guideProfiles, hiddenGems, reviews, reels, notifications, bookings, walletTransactions } = require('../db');
const { protect } = require('../middleware/error.middleware');

// GET /api/guides
router.get('/', (req, res) => {
  const guides = guideProfiles.findMany(req.query);
  const total = guideProfiles.countMany(req.query);
  const limit = parseInt(req.query.limit) || 12;
  res.json({ guides, total, pagination: { total, pages: Math.ceil(total / limit), page: parseInt(req.query.page) || 1 } });
});

// GET /api/guides/dashboard/stats  — must come BEFORE /:id
router.get('/dashboard/stats', protect, (req, res) => {
  const guide = guideProfiles.findByUserId(req.user.id);
  if (!guide) return res.status(404).json({ error: 'Guide profile not found' });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const txns = walletTransactions.findByUser(req.user.id).filter(t => t.type === 'CREDIT');
  const todayEarnings = txns.filter(t => t.createdAt >= todayStart).reduce((s, t) => s + t.amount, 0);
  const weekEarnings = txns.filter(t => t.createdAt >= weekStart).reduce((s, t) => s + t.amount, 0);
  const monthEarnings = txns.filter(t => t.createdAt >= monthStart).reduce((s, t) => s + t.amount, 0);

  res.json({
    stats: guide,
    earnings: { today: todayEarnings, week: weekEarnings, month: monthEarnings, total: guide.totalEarnings || 0 },
  });
});

// POST /api/guides/register
router.post('/register', protect, (req, res) => {
  try {
    const existing = guideProfiles.findByUserId(req.user.id);
    if (existing) {
      const updated = guideProfiles.updateByUserId(req.user.id, req.body);
      users.update(req.user.id, { role: 'GUIDE' });
      return res.json({ guide: updated });
    }
    const guide = guideProfiles.create({ userId: req.user.id, ...req.body });
    users.update(req.user.id, { role: 'GUIDE' });
    notifications.create({ userId: req.user.id, title: '🗺️ Guide Profile Live!', body: 'Your guide profile is now visible to travellers. Start accepting bookings!', type: 'GUIDE_APPROVED' });
    res.status(201).json({ guide });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/guides/availability
router.patch('/availability', protect, (req, res) => {
  const { isAvailable } = req.body;
  const guide = guideProfiles.findByUserId(req.user.id);
  if (!guide) return res.status(404).json({ error: 'Guide profile not found' });
  guideProfiles.update(guide.id, { isAvailable });
  res.json({ isAvailable });
});

// PATCH /api/guides/location
router.patch('/location', protect, (req, res) => {
  const { latitude, longitude } = req.body;
  const guide = guideProfiles.findByUserId(req.user.id);
  if (!guide) return res.status(404).json({ error: 'Guide profile not found' });
  guideProfiles.update(guide.id, { latitude: parseFloat(latitude), longitude: parseFloat(longitude), lastLocationUpdate: new Date().toISOString() });
  const io = req.app.get('io');
  if (io) io.emit('guide:location-update', { guideId: req.user.id, latitude, longitude });
  res.json({ latitude, longitude });
});

// POST /api/guides/hidden-gems
router.post('/hidden-gems', protect, (req, res) => {
  const guide = guideProfiles.findByUserId(req.user.id);
  if (!guide) return res.status(403).json({ error: 'Guide profile required' });
  const gem = hiddenGems.create({ guideId: guide.id, ...req.body });
  res.status(201).json({ gem });
});

// GET /api/guides/:id  — must come AFTER named routes
router.get('/:id', (req, res) => {
  const guide = guideProfiles.findById(req.params.id);
  if (!guide) return res.status(404).json({ error: 'Guide not found' });
  const guideReviews = reviews.findByReviewee(guide.userId);
  const guideReels = reels.findByUser(guide.userId).slice(0, 9);
  const guideGems = hiddenGems.findByGuide(guide.id);
  res.json({ guide, reviews: guideReviews, reels: guideReels, hiddenGems: guideGems });
});

module.exports = router;
