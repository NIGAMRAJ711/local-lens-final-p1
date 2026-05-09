const express = require('express');
const router = express.Router();
const { guideProfiles, reviews, reels, hiddenGems, walletTransactions, USE_PG, query } = require('../db');

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
    const { search, lat, lng, radius = 50, minPrice, maxPrice, ...rest } = req.query;
    // If GPS coords provided and PG mode, use haversine
    if (lat && lng && USE_PG) {
      const radiusKm = parseFloat(radius);
      const rows = await query(`
        SELECT gp.*, u.full_name, u.avatar_url,
          (6371 * acos(GREATEST(-1, LEAST(1,
            cos(radians($1)) * cos(radians(latitude)) *
            cos(radians(longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(latitude))
          )))) AS distance_km
        FROM guide_profiles gp
        JOIN users u ON u.id = gp.user_id
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
          AND is_available = true
          ${minPrice ? 'AND hourly_rate >= $4' : ''}
          ${maxPrice ? `AND hourly_rate <= $${minPrice ? 5 : 4}` : ''}
        HAVING (6371 * acos(GREATEST(-1, LEAST(1,
            cos(radians($1)) * cos(radians(latitude)) *
            cos(radians(longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(latitude))
          )))) < $3
        ORDER BY distance_km ASC LIMIT 50`,
        [parseFloat(lat), parseFloat(lng), radiusKm, ...(minPrice ? [parseFloat(minPrice)] : []), ...(maxPrice ? [parseFloat(maxPrice)] : [])]
      );
      const guides = rows.map(r => ({
        id: r.id, userId: r.user_id, bio: r.bio, city: r.city, country: r.country,
        languages: r.languages || [], expertiseTags: r.expertise_tags || [],
        isAvailable: r.is_available, hourlyRate: parseFloat(r.hourly_rate) || 0,
        halfDayRate: parseFloat(r.half_day_rate) || 0, fullDayRate: parseFloat(r.full_day_rate) || 0,
        avgRating: parseFloat(r.avg_rating) || 0, totalReviews: r.total_reviews || 0,
        totalBookings: r.total_bookings || 0, isPhotographer: r.is_photographer,
        latitude: r.latitude, longitude: r.longitude,
        distanceKm: r.distance_km ? Math.round(r.distance_km * 10) / 10 : null,
        user: { id: r.user_id, fullName: r.full_name, avatarUrl: r.avatar_url },
      }));
      return res.json({ guides, total: guides.length, pagination: { page: 1, limit: 50, total: guides.length, pages: 1 } });
    }
    // Fuzzy search in PG mode
    if (search && USE_PG) {
      const term = `%${search}%`;
      const params = [term, ...(minPrice ? [parseFloat(minPrice)] : []), ...(maxPrice ? [parseFloat(maxPrice)] : [])];
      const rows = await query(`
        SELECT gp.*, u.full_name, u.avatar_url FROM guide_profiles gp
        JOIN users u ON u.id = gp.user_id
        WHERE (gp.city ILIKE $1 OR u.full_name ILIKE $1 OR gp.bio ILIKE $1 OR gp.expertise_tags::text ILIKE $1)
          ${minPrice ? `AND gp.hourly_rate >= $2` : ''}
          ${maxPrice ? `AND gp.hourly_rate <= $${minPrice ? 3 : 2}` : ''}
        ORDER BY gp.avg_rating DESC LIMIT 50`, params);
      const guides = rows.map(r => ({
        id: r.id, userId: r.user_id, bio: r.bio, city: r.city,
        languages: r.languages || [], expertiseTags: r.expertise_tags || [],
        isAvailable: r.is_available, hourlyRate: parseFloat(r.hourly_rate) || 0,
        halfDayRate: parseFloat(r.half_day_rate) || 0, fullDayRate: parseFloat(r.full_day_rate) || 0,
        avgRating: parseFloat(r.avg_rating) || 0, totalReviews: r.total_reviews || 0,
        totalBookings: r.total_bookings || 0, isPhotographer: r.is_photographer,
        latitude: r.latitude, longitude: r.longitude,
        user: { id: r.user_id, fullName: r.full_name, avatarUrl: r.avatar_url },
      }));
      return res.json({ guides, total: guides.length, pagination: { page: 1, limit: 50, total: guides.length, pages: 1 } });
    }
    // Default: pass through to db helper with price filters added
    const queryParams = { ...rest };
    if (search) queryParams.city = search; // fallback for JSON mode
    if (minPrice) queryParams.minPrice = minPrice;
    if (maxPrice) queryParams.maxPrice = maxPrice;
    const [guides, total] = await Promise.all([
      guideProfiles.findMany(queryParams),
      guideProfiles.countMany(queryParams),
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

    // Reliable geocoding: CITY_COORDS first, then Nominatim
    let mapPin = null;
    try {
      const coords = getCityCoords(city);
      if (coords) {
        const lat = coords[0] + (Math.random()-0.5)*0.05;
        const lng = coords[1] + (Math.random()-0.5)*0.05;
        await guideProfiles.update(guide.id, { latitude: lat, longitude: lng });
        guide.latitude = lat; guide.longitude = lng;
        mapPin = { lat, lng, city };
      } else {
        // Try Nominatim
        const fetchFn = (...a) => import('node-fetch').then(({default:f})=>f(...a)).catch(()=>null);
        const geoRes = await fetchFn(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city+','+(country||'India'))}&limit=1`, { headers:{'User-Agent':'LocalLens/1.0'} }).catch(()=>null);
        if (geoRes?.ok) {
          const geoData = await geoRes.json().catch(()=>[]);
          if (geoData[0]) {
            const lat = parseFloat(geoData[0].lat) + (Math.random()-0.5)*0.05;
            const lng = parseFloat(geoData[0].lon) + (Math.random()-0.5)*0.05;
            await guideProfiles.update(guide.id, { latitude: lat, longitude: lng }).catch(()=>{});
            guide.latitude = lat; guide.longitude = lng;
            mapPin = { lat, lng, city };
          }
        }
      }
    } catch(geoErr) { /* geocoding is best-effort */ }

    res.status(201).json({ guide, mapPin });
  } catch (err) {
    if (err.message?.includes('already exists')) return res.status(409).json({ error: 'Guide profile already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.patch('/cover-image', protect, async (req, res) => {
  try {
    const { coverImage } = req.body;
    if (!coverImage) return res.status(400).json({ error: 'coverImage URL required' });
    const guide = await guideProfiles.findByUserId(req.user.id);
    if (!guide) return res.status(404).json({ error: 'Guide profile not found' });
    const updated = await guideProfiles.update(guide.id, { coverImage });
    res.json({ guide: updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /guides/:id/availability
router.get('/:id/availability', async (req, res) => {
  try {
    if (USE_PG) {
      const rows = await query(`SELECT * FROM guide_availability WHERE guide_id=$1 AND date >= CURRENT_DATE ORDER BY date ASC, start_time ASC`, [req.params.id]).catch(() => []);
      return res.json({ slots: rows.map(r => ({ id:r.id, guideId:r.guide_id, date:r.date, startTime:r.start_time, endTime:r.end_time, isBooked:r.is_booked, createdAt:r.created_at })) });
    }
    const path = require('path'), fs = require('fs');
    const file = path.join(__dirname, '../../data/guide_availability.json');
    let store = []; try { store = JSON.parse(fs.readFileSync(file,'utf8')); } catch {}
    const today = new Date().toISOString().split('T')[0];
    res.json({ slots: store.filter(s => s.guideId === req.params.id && s.date >= today).sort((a,b) => a.date.localeCompare(b.date)) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /guides/availability
router.post('/availability', protect, async (req, res) => {
  try {
    const guide = await guideProfiles.findByUserId(req.user.id);
    if (!guide) return res.status(403).json({ error: 'Guide profile required' });
    const { date, startTime, endTime } = req.body;
    if (!date || !startTime || !endTime) return res.status(400).json({ error: 'date, startTime and endTime required' });
    const { v4: uuid } = require('uuid');
    const id = uuid();
    if (USE_PG) {
      await query('INSERT INTO guide_availability(id,guide_id,date,start_time,end_time) VALUES($1,$2,$3,$4,$5)', [id, guide.id, date, startTime, endTime]).catch(async () => {
        // table might not exist yet — create it
        await query(`CREATE TABLE IF NOT EXISTS guide_availability(id TEXT PRIMARY KEY,guide_id TEXT REFERENCES guide_profiles(id) ON DELETE CASCADE,date TEXT NOT NULL,start_time TEXT,end_time TEXT,is_booked BOOLEAN DEFAULT false,created_at TIMESTAMPTZ DEFAULT NOW())`);
        await query('INSERT INTO guide_availability(id,guide_id,date,start_time,end_time) VALUES($1,$2,$3,$4,$5)', [id, guide.id, date, startTime, endTime]);
      });
      return res.status(201).json({ slot: { id, guideId: guide.id, date, startTime, endTime, isBooked: false } });
    }
    const path = require('path'), fs = require('fs');
    const file = path.join(__dirname, '../../data/guide_availability.json');
    let store = []; try { store = JSON.parse(fs.readFileSync(file,'utf8')); } catch {}
    const slot = { id, guideId: guide.id, date, startTime, endTime, isBooked: false, createdAt: new Date().toISOString() };
    store.push(slot); fs.mkdirSync(path.dirname(file), {recursive:true}); fs.writeFileSync(file, JSON.stringify(store,null,2));
    res.status(201).json({ slot });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /guides/availability/:slotId
router.delete('/availability/:slotId', protect, async (req, res) => {
  try {
    const guide = await guideProfiles.findByUserId(req.user.id);
    if (!guide) return res.status(403).json({ error: 'Guide profile required' });
    if (USE_PG) {
      await query('DELETE FROM guide_availability WHERE id=$1 AND guide_id=$2', [req.params.slotId, guide.id]).catch(() => {});
      return res.json({ success: true });
    }
    const path = require('path'), fs = require('fs');
    const file = path.join(__dirname, '../../data/guide_availability.json');
    let store = []; try { store = JSON.parse(fs.readFileSync(file,'utf8')); } catch {}
    fs.writeFileSync(file, JSON.stringify(store.filter(s => !(s.id === req.params.slotId && s.guideId === guide.id)), null, 2));
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/availability/:slotId/book', protect, async (req, res) => {
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
