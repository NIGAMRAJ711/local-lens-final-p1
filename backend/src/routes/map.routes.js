const express = require('express');
const router = express.Router();
const { guideProfiles, hiddenGems, USE_PG, query } = require('../db');

// GET /map/guides — full data for map pins
router.get('/guides', async (req, res) => {
  try {
    if (USE_PG) {
      const { city } = req.query;
      let sql = `
        SELECT
          gp.id, gp.user_id, gp.latitude, gp.longitude, gp.city, gp.country,
          gp.hourly_rate, gp.half_day_rate, gp.full_day_rate,
          gp.avg_rating, gp.total_reviews, gp.total_bookings,
          gp.is_available, gp.expertise_tags, gp.languages,
          gp.verification_status,
          u.full_name, u.avatar_url
        FROM guide_profiles gp
        JOIN users u ON u.id = gp.user_id
        WHERE gp.latitude IS NOT NULL
          AND gp.longitude IS NOT NULL
          AND gp.is_available = true
      `;
      const params = [];
      if (city) { sql += ` AND LOWER(gp.city) LIKE LOWER($1)`; params.push(`%${city}%`); }
      sql += ' ORDER BY gp.avg_rating DESC LIMIT 500';
      const rows = await query(sql, params);
      const guides = rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        latitude: parseFloat(r.latitude),
        longitude: parseFloat(r.longitude),
        city: r.city,
        country: r.country,
        hourlyRate: parseFloat(r.hourly_rate) || 0,
        halfDayRate: parseFloat(r.half_day_rate) || 0,
        fullDayRate: parseFloat(r.full_day_rate) || 0,
        avgRating: parseFloat(r.avg_rating) || 0,
        totalReviews: r.total_reviews || 0,
        totalBookings: r.total_bookings || 0,
        isAvailable: r.is_available,
        expertiseTags: r.expertise_tags || [],
        languages: r.languages || [],
        verificationStatus: r.verification_status,
        user: { id: r.user_id, fullName: r.full_name, avatarUrl: r.avatar_url },
      }));
      return res.json({ guides });
    }
    // JSON mode — use existing findMany which already enriches
    const guides = await guideProfiles.findMany({ ...req.query, limit: 500 });
    const filtered = guides.filter(g => g.latitude && g.longitude && g.isAvailable);
    res.json({ guides: filtered });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /map/hidden-gems — with guide name
router.get('/hidden-gems', async (req, res) => {
  try {
    if (USE_PG) {
      const { city } = req.query;
      let sql = `
        SELECT hg.*, u.full_name as guide_name
        FROM hidden_gems hg
        JOIN guide_profiles gp ON gp.id = hg.guide_id
        JOIN users u ON u.id = gp.user_id
        WHERE 1=1
      `;
      const params = [];
      if (city) { sql += ` AND LOWER(hg.city) LIKE LOWER($1)`; params.push(`%${city}%`); }
      const rows = await query(sql, params);
      const gems = rows.map(r => ({
        id: r.id,
        guideId: r.guide_id,
        name: r.name,
        description: r.description,
        category: r.category,
        city: r.city,
        latitude: parseFloat(r.latitude),
        longitude: parseFloat(r.longitude),
        isLocked: r.is_locked,
        photos: r.photos || [],
        guideName: r.guide_name,
        createdAt: r.created_at,
      }));
      return res.json({ gems });
    }
    const gems = await hiddenGems.findMany(req.query);
    res.json({ gems });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
