const express = require('express');
const router = express.Router();
const { guideProfiles, reviews, reels, hiddenGems, walletTransactions } = require('../db');
const { protect } = require('../middleware/error.middleware');

router.get('/', async (req, res) => {
  try {
    const [guides, total] = await Promise.all([
      guideProfiles.findMany(req.query),
      guideProfiles.countMany(req.query),
    ]);
    const { page=1, limit=12 } = req.query;
    res.json({ guides, total, pagination: { page:parseInt(page), limit:parseInt(limit), total, pages:Math.ceil(total/parseInt(limit)) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/dashboard/stats', protect, async (req, res) => {
  try {
    const guide = await guideProfiles.findByUserId(req.user.id);
    if (!guide) return res.status(404).json({ error: 'Guide profile not found' });
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const weekStart = new Date(now); weekStart.setDate(now.getDate()-7);
    const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
    const txns = (await walletTransactions.findByUser(req.user.id)).filter(t=>t.type==='CREDIT'||t.amount>0);
    const today = txns.filter(t=>new Date(t.createdAt||t.created_at)>=todayStart).reduce((s,t)=>s+parseFloat(t.amount||0),0);
    const week = txns.filter(t=>new Date(t.createdAt||t.created_at)>=weekStart).reduce((s,t)=>s+parseFloat(t.amount||0),0);
    const month = txns.filter(t=>new Date(t.createdAt||t.created_at)>=monthStart).reduce((s,t)=>s+parseFloat(t.amount||0),0);
    const total = txns.reduce((s,t)=>s+parseFloat(t.amount||0),0);
    res.json({ stats:{ walletBalance:guide.walletBalance||0, totalBookings:guide.totalBookings||0, avgRating:guide.avgRating||0, totalReviews:guide.totalReviews||0, isAvailable:guide.isAvailable||false }, earnings:{today,week,month,total} });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const guide = await guideProfiles.findById(req.params.id);
    if (!guide) return res.status(404).json({ error: 'Guide not found' });
    const [guideReviews, guideReels, gems] = await Promise.all([
      reviews.findByReviewee(guide.userId),
      reels.findByUser(guide.userId),
      hiddenGems.findByGuide(guide.id),
    ]);
    res.json({ guide:{ ...guide, hiddenGems:gems }, reviews:guideReviews, reels:guideReels });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/register', protect, async (req, res) => {
  try {
    const { bio, city, country, languages, expertiseTags, isPhotographer, hourlyRate, halfDayRate, fullDayRate, photographyRate } = req.body;
    if (!bio || !city || !hourlyRate) return res.status(400).json({ error: 'bio, city and hourlyRate are required' });
    const guide = await guideProfiles.create({ userId:req.user.id, bio, city, country:country||'India', languages:languages||[], expertiseTags:expertiseTags||[], isPhotographer:!!isPhotographer, hourlyRate:parseFloat(hourlyRate), halfDayRate:parseFloat(halfDayRate)||parseFloat(hourlyRate)*3, fullDayRate:parseFloat(fullDayRate)||parseFloat(hourlyRate)*6, photographyRate:photographyRate?parseFloat(photographyRate):null });
    res.status(201).json({ guide });
  } catch (err) {
    if (err.message?.includes('already exists')) return res.status(409).json({ error: 'Guide profile already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.patch('/availability', protect, async (req, res) => {
  try {
    const guide = await guideProfiles.updateByUserId(req.user.id, { isAvailable:!!req.body.isAvailable });
    res.json({ guide, message:`You are now ${req.body.isAvailable?'online':'offline'}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/location', protect, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const guide = await guideProfiles.updateByUserId(req.user.id, { latitude:parseFloat(latitude), longitude:parseFloat(longitude) });
    res.json({ guide });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/hidden-gems', protect, async (req, res) => {
  try {
    const guide = await guideProfiles.findByUserId(req.user.id);
    if (!guide) return res.status(403).json({ error: 'Guide profile required' });
    const gem = await hiddenGems.create({ guideId:guide.id, ...req.body });
    res.status(201).json({ gem });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
