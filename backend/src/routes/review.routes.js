const express = require('express');
const router = express.Router();
const { reviews, bookings, guideProfiles, notifications, users, USE_PG, query } = require('../db');
const { protect } = require('../middleware/error.middleware');

// PATCH /reviews/:id/respond
router.patch('/:id/respond', protect, async (req, res) => {
  try {
    const { response } = req.body;
    if (!response?.trim()) return res.status(400).json({ error: 'Response text required' });
    if (USE_PG) {
      const rows = await query('UPDATE reviews SET guide_response=$1,responded_at=NOW() WHERE id=$2 AND reviewee_id=$3 RETURNING *', [response.trim(), req.params.id, req.user.id]);
      if (!rows.length) return res.status(404).json({ error: 'Review not found or not yours to respond to' });
      // Notify reviewer
      const review = rows[0];
      notifications.create({ userId: review.reviewer_id, title: 'Guide replied to your review', body: `${req.user.fullName} responded to your review`, type: 'GENERAL' }).catch(() => {});
      return res.json({ review: rows[0] });
    }
    // JSON mode
    const { loadStore, saveStore } = require('../db');
    const store = loadStore('reviews');
    const idx = store.findIndex(r => r.id === req.params.id && r.revieweeId === req.user.id);
    if (idx === -1) return res.status(404).json({ error: 'Review not found' });
    store[idx].guideResponse = response.trim();
    store[idx].respondedAt = new Date().toISOString();
    saveStore('reviews', store);
    res.json({ review: store[idx] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/reviews
router.post('/', protect, async (req, res) => {
  try {
    const { bookingId, revieweeId, rating, comment, photos } = req.body;
    if (!bookingId || !revieweeId || !rating) return res.status(400).json({ error: 'bookingId, revieweeId and rating required' });
    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1-5' });
    const booking = await bookings.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'COMPLETED') return res.status(400).json({ error: 'Can only review completed tours' });
    if (booking.travelerId !== req.user.id) return res.status(403).json({ error: 'Only traveller can submit review' });

    const review = await reviews.create({ bookingId, reviewerId: req.user.id, revieweeId, rating: parseFloat(rating), comment: comment || '', photos: photos || [] });

    // Recalculate guide avg_rating and total_reviews
    const { USE_PG, query } = require('../db');
    if (USE_PG) {
      await query(`UPDATE guide_profiles SET
        avg_rating = (SELECT COALESCE(AVG(rating),0) FROM reviews WHERE reviewee_id=$1),
        total_reviews = (SELECT COUNT(*) FROM reviews WHERE reviewee_id=$1)
        WHERE user_id=$1`, [revieweeId]).catch(() => {});
    } else {
      // JSON mode: recalculate from all reviews
      const allGuideReviews = await reviews.findByReviewee(revieweeId);
      const avg = allGuideReviews.length ? allGuideReviews.reduce((s,r) => s + parseFloat(r.rating), 0) / allGuideReviews.length : 0;
      const guide = await guideProfiles.findByUserId(revieweeId).catch(() => null);
      if (guide) await guideProfiles.update(guide.id, { avgRating: Math.round(avg * 10) / 10, totalReviews: allGuideReviews.length });
    }

    // Notify guide
    await notifications.create({
      userId: revieweeId,
      title: '⭐ New review received!',
      body: `${req.user.fullName} gave you ${rating} star${rating > 1 ? 's' : ''}`,
      type: 'NEW_REVIEW',
      data: { reviewId: review.id, rating, reviewerName: req.user.fullName },
    }).catch(() => {});

    res.status(201).json({ review });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/reviews/guide/:guideUserId
router.get('/guide/:guideUserId', async (req, res) => {
  try {
    const allReviews = await reviews.findByReviewee(req.params.guideUserId);
    res.json({ reviews: allReviews, total: allReviews.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/reviews/:id/response — guide replies
router.patch('/:id/response', protect, async (req, res) => {
  try {
    const { response } = req.body;
    const { USE_PG } = require('../db');
    if (USE_PG) {
      const { Pool } = require('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
      const r = await pool.query('UPDATE reviews SET guide_response=$1 WHERE id=$2 AND reviewee_id=$3 RETURNING *', [response, req.params.id, req.user.id]);
      await pool.end();
      if (!r.rows[0]) return res.status(404).json({ error: 'Review not found or access denied' });
      return res.json({ review: r.rows[0] });
    }
    const path = require('path'), fs = require('fs');
    const file = path.join(__dirname, '../../data/reviews.json');
    const store = JSON.parse(fs.readFileSync(file, 'utf8'));
    const idx = store.findIndex(r => r.id === req.params.id && r.revieweeId === req.user.id);
    if (idx === -1) return res.status(404).json({ error: 'Review not found' });
    store[idx].guideResponse = response;
    fs.writeFileSync(file, JSON.stringify(store, null, 2));
    res.json({ review: store[idx] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/reviews/blacklist/:guideUserId — traveller blacklists a scammer guide
router.post('/blacklist/:guideUserId', protect, async (req, res) => {
  try {
    const { reason } = req.body;
    const targetGuide = await guideProfiles.findByUserId(req.params.guideUserId);
    if (!targetGuide) return res.status(404).json({ error: 'Guide not found' });

    // Mark guide as blacklisted
    await guideProfiles.update(targetGuide.id, { isBlacklisted: true, isAvailable: false });
    await users.update(req.params.guideUserId, { isActive: false });

    // Notify admins (log for now)
    console.log(`⚠️ BLACKLIST: Guide ${req.params.guideUserId} blacklisted by ${req.user.id}. Reason: ${reason}`);

    // Notify the guide
    await notifications.create({
      userId: req.params.guideUserId,
      title: '⛔ Account Suspended',
      body: `Your account has been reported and suspended. Contact support to appeal.`,
      type: 'GENERAL',
    });

    res.json({ message: 'Guide has been blacklisted and their account suspended.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
