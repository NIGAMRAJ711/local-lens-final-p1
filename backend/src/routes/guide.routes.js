const express = require('express');
const router = express.Router();
const { guideProfiles, users, reviews, reels, hiddenGems, bookings, walletTransactions } = require('../db');
const { protect } = require('../middleware/error.middleware');

// GET /api/guides — list with filters
router.get('/', (req, res) => {
  try {
    const guides = guideProfiles.findMany(req.query);
    const total = guideProfiles.countMany(req.query);
    const { page = 1, limit = 12 } = req.query;
    const pages = Math.ceil(total / parseInt(limit));
    res.json({ guides, total, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/guides/dashboard/stats — guide's own dashboard
router.get('/dashboard/stats', protect, (req, res) => {
  try {
    const guide = guideProfiles.findByUserId(req.user.id);
    if (!guide) return res.status(404).json({ error: 'Guide profile not found' });

    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0,0,0,0);

    const txns = walletTransactions.findByUser(req.user.id).filter(t => t.type === 'CREDIT');
    const today = txns.filter(t => new Date(t.createdAt) >= todayStart).reduce((s, t) => s + t.amount, 0);
    const week = txns.filter(t => new Date(t.createdAt) >= weekStart).reduce((s, t) => s + t.amount, 0);
    const month = txns.filter(t => new Date(t.createdAt) >= monthStart).reduce((s, t) => s + t.amount, 0);
    const total = txns.reduce((s, t) => s + t.amount, 0);

    res.json({
      stats: {
        walletBalance: guide.walletBalance || 0,
        totalBookings: guide.totalBookings || 0,
        avgRating: guide.avgRating || 0,
        totalReviews: guide.totalReviews || 0,
        isAvailable: guide.isAvailable || false,
      },
      earnings: { today, week, month, total },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/guides/:id — full guide profile
router.get('/:id', (req, res) => {
  try {
    const guide = guideProfiles.findById(req.params.id);
    if (!guide) return res.status(404).json({ error: 'Guide not found' });
    const guideReviews = reviews.findByReviewee(guide.userId);
    const guideReels = reels.findByUser(guide.userId);
    const gems = hiddenGems.findByGuide(guide.id);
    res.json({ guide: { ...guide, hiddenGems: gems }, reviews: guideReviews, reels: guideReels });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/guides/register
router.post('/register', protect, (req, res) => {
  try {
    const { bio, city, country, languages, expertiseTags, isPhotographer, hourlyRate, halfDayRate, fullDayRate, photographyRate } = req.body;
    if (!bio || !city || !hourlyRate) {
      return res.status(400).json({ error: 'Bio, city and hourly rate are required' });
    }
    const guide = guideProfiles.create({
      userId: req.user.id, bio, city, country: country || 'India',
      languages: languages || [], expertiseTags: expertiseTags || [],
      isPhotographer: !!isPhotographer,
      hourlyRate: parseFloat(hourlyRate),
      halfDayRate: parseFloat(halfDayRate) || parseFloat(hourlyRate) * 3,
      fullDayRate: parseFloat(fullDayRate) || parseFloat(hourlyRate) * 6,
      photographyRate: photographyRate ? parseFloat(photographyRate) : null,
    });
    res.status(201).json({ guide });
  } catch (err) {
    if (err.message?.includes('already exists')) return res.status(409).json({ error: 'Guide profile already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/guides/availability
router.patch('/availability', protect, (req, res) => {
  try {
    const { isAvailable } = req.body;
    const guide = guideProfiles.updateByUserId(req.user.id, { isAvailable: !!isAvailable });
    if (!guide) return res.status(404).json({ error: 'Guide profile not found' });
    res.json({ guide, message: `You are now ${isAvailable ? 'online' : 'offline'}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/guides/location
router.patch('/location', protect, (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const guide = guideProfiles.updateByUserId(req.user.id, { latitude: parseFloat(latitude), longitude: parseFloat(longitude) });
    res.json({ guide });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/guides/hidden-gems
router.post('/hidden-gems', protect, (req, res) => {
  try {
    const guide = guideProfiles.findByUserId(req.user.id);
    if (!guide) return res.status(403).json({ error: 'Guide profile required' });
    const gem = hiddenGems.create({ guideId: guide.id, ...req.body });
    res.status(201).json({ gem });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
