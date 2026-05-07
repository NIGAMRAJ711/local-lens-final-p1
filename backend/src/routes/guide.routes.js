const express = require('express');
const router = express.Router();
const { guideProfiles, reviews, reels, hiddenGems, walletTransactions } = require('../db');

// Fallback city coordinates for major Indian cities
const CITY_COORDS = {
  'mumbai': [19.0760, 72.8777], 'delhi': [28.7041, 77.1025], 'bangalore': [12.9716, 77.5946],
  'bengaluru': [12.9716, 77.5946], 'hyderabad': [17.3850, 78.4867], 'chennai': [13.0827, 80.2707],
  'kolkata': [22.5726, 88.3639], 'pune': [18.5204, 73.8567], 'jaipur': [26.9124, 75.7873],
  'lucknow': [26.8467, 80.9462], 'kochi': [9.9312, 76.2673], 'goa': [15.2993, 74.1240],
  'varanasi': [25.3176, 82.9739], 'agra': [27.1767, 78.0081], 'amritsar': [31.6340, 74.8723],
  'mysore': [12.2958, 76.6394], 'mysuru': [12.2958, 76.6394], 'udaipur': [24.5854, 73.7125],
  'rishikesh': [30.0869, 78.2676], 'shimla': [31.1048, 77.1734], 'manali': [32.2432, 77.1892],
  'davangere': [14.4644, 75.9218], 'hubli': [15.3647, 75.1240], 'coimbatore': [11.0168, 76.9558],
};

function getCityCoords(city) {
  const key = city?.toLowerCase().trim();
  return CITY_COORDS[key] || null;
}
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
    // Auto-geocode city to get coordinates for map
    try {
      const https = require('https');
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city+','+( country||'India'))}&limit=1`;
      // Use node-fetch or https
      const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args)).catch(() => null);
      const geoRes = await fetch(geocodeUrl).catch(() => null);
      if (geoRes && geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData[0]) {
          const lat = parseFloat(geoData[0].lat) + (Math.random()-0.5)*0.02;
          const lng = parseFloat(geoData[0].lon) + (Math.random()-0.5)*0.02;
          await guideProfiles.update(guide.id, { latitude: lat, longitude: lng });
          guide.latitude = lat; guide.longitude = lng;
        }
      }
    } catch(geoErr) {
      // Use hardcoded coords as fallback
      const coords = getCityCoords(city);
      if (coords) {
        const lat = coords[0] + (Math.random()-0.5)*0.02;
        const lng = coords[1] + (Math.random()-0.5)*0.02;
        await guideProfiles.update(guide.id, { latitude: lat, longitude: lng }).catch(()=>{});
        guide.latitude = lat; guide.longitude = lng;
      }
    }
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
