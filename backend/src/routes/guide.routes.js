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
    const { bio, city, country, languages, expertiseTags, isPhotographer, hourlyRate, halfDayRate, fullDayRate, photographyRate, placesOneHour, placesHalfDay, placesFullDay, providesCab, cabPricePerKm, cabFullDayPrice, hotelRecommendations, restaurantRecommendations } = req.body;
    if (!bio || !city || !hourlyRate) return res.status(400).json({ error: 'bio, city and hourlyRate are required' });
    const guide = await guideProfiles.create({ userId:req.user.id, bio, city, country:country||'India', languages:languages||[], expertiseTags:expertiseTags||[], isPhotographer:!!isPhotographer, hourlyRate:parseFloat(hourlyRate), halfDayRate:parseFloat(halfDayRate)||parseFloat(hourlyRate)*3, fullDayRate:parseFloat(fullDayRate)||parseFloat(hourlyRate)*6, photographyRate:photographyRate?parseFloat(photographyRate):null, placesOneHour:placesOneHour||'', placesHalfDay:placesHalfDay||'', placesFullDay:placesFullDay||'', providesCab:!!providesCab, cabPricePerKm:parseFloat(cabPricePerKm)||0, cabFullDayPrice:parseFloat(cabFullDayPrice)||0, hotelRecommendations:hotelRecommendations||'', restaurantRecommendations:restaurantRecommendations||'' });
    // Geocode city — hardcoded lookup first (reliable), then Nominatim as fallback
    let mapPin = null;
    try {
      const hardcoded = getCityCoords(city);
      if (hardcoded) {
        const lat = hardcoded[0] + (Math.random()-0.5)*0.05;
        const lng = hardcoded[1] + (Math.random()-0.5)*0.05;
        await guideProfiles.update(guide.id, { latitude: lat, longitude: lng });
        guide.latitude = lat; guide.longitude = lng;
        mapPin = { lat, lng, city };
      } else {
        // Nominatim fallback for unknown cities
        const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args)).catch(() => null);
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city+','+(country||'India'))}&limit=1`,
          { headers: { 'User-Agent': 'LocalLens/1.0' } }
        ).catch(() => null);
        if (geoRes?.ok) {
          const geoData = await geoRes.json().catch(() => []);
          if (geoData[0]) {
            const lat = parseFloat(geoData[0].lat) + (Math.random()-0.5)*0.05;
            const lng = parseFloat(geoData[0].lon) + (Math.random()-0.5)*0.05;
            await guideProfiles.update(guide.id, { latitude: lat, longitude: lng });
            guide.latitude = lat; guide.longitude = lng;
            mapPin = { lat, lng, city };
          }
        }
      }
    } catch(geoErr) { console.error('Geocode error:', geoErr.message); }
    res.status(201).json({ guide, mapPin });
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


router.patch('/cover-image', protect, async (req, res) => {
  try {
    const { coverImage } = req.body;
    if (!coverImage) return res.status(400).json({ error: 'coverImage URL required' });
    const guide = await guideProfiles.updateByUserId(req.user.id, { coverImage });
    res.json({ guide });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ─── Availability ─────────────────────────────────────────────────────────────
router.get('/:id/availability', async (req, res) => {
  try {
    if (require('../db').USE_PG) {
      const { query } = require('../db');
      const rows = await query('SELECT * FROM guide_availability WHERE guide_id= AND date>=CURRENT_DATE ORDER BY date,start_time', [req.params.id]);
      return res.json({ slots: rows.map(r => ({ id:r.id, guideId:r.guide_id, date:r.date, startTime:r.start_time, endTime:r.end_time, isBooked:r.is_booked })) });
    }
    res.json({ slots: [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/availability', protect, async (req, res) => {
  try {
    const guide = await guideProfiles.findByUserId(req.user.id);
    if (!guide) return res.status(403).json({ error: 'Guide profile required' });
    const { date, startTime, endTime } = req.body;
    if (!date || !startTime) return res.status(400).json({ error: 'date and startTime required' });
    if (require('../db').USE_PG) {
      const { query } = require('../db');
      const { v4: uuidv4 } = require('uuid');
      const id = uuidv4();
      await query('INSERT INTO guide_availability(id,guide_id,date,start_time,end_time) VALUES(,,,,)', [id, guide.id, date, startTime, endTime||'']);
      const row = (await query('SELECT * FROM guide_availability WHERE id=', [id]))[0];
      return res.status(201).json({ slot: { id:row.id, guideId:row.guide_id, date:row.date, startTime:row.start_time, endTime:row.end_time, isBooked:row.is_booked } });
    }
    res.status(201).json({ slot: { id: Date.now().toString(), guideId: guide.id, date, startTime, endTime: endTime||'', isBooked: false } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/availability/:slotId', protect, async (req, res) => {
  try {
    const guide = await guideProfiles.findByUserId(req.user.id);
    if (!guide) return res.status(403).json({ error: 'Guide profile required' });
    if (require('../db').USE_PG) {
      const { query } = require('../db');
      await query('DELETE FROM guide_availability WHERE id= AND guide_id=', [req.params.slotId, guide.id]);
    }
    res.json({ message: 'Slot deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/availability/:slotId/block', protect, async (req, res) => {
  try {
    if (require('../db').USE_PG) {
      const { query } = require('../db');
      await query('UPDATE guide_availability SET is_booked=true WHERE id=', [req.params.slotId]);
    }
    res.json({ message: 'Slot blocked' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
