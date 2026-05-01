const express = require('express');
const router = express.Router();
const { reviews, bookings, guideProfiles, notifications } = require('../db');
const { protect } = require('../middleware/error.middleware');

// POST /api/reviews — Submit a review after a completed booking
router.post('/', protect, async (req, res) => {
  try {
    const { bookingId, revieweeId, rating, comment } = req.body;
    if (!bookingId || !revieweeId || !rating) {
      return res.status(400).json({ error: 'bookingId, revieweeId and rating are required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Verify booking exists and is completed
    const booking = bookings.findById(bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'You can only review completed tours' });
    }
    // Only traveller can review
    if (booking.travelerId !== req.user.id) {
      return res.status(403).json({ error: 'Only the traveller can submit a review' });
    }

    const review = reviews.create({
      bookingId,
      reviewerId: req.user.id,
      revieweeId,
      rating: parseFloat(rating),
      comment: comment || '',
    });

    // Notify guide
    notifications.create({
      userId: revieweeId,
      title: '⭐ New Review!',
      body: `${req.user.fullName} left you a ${rating}-star review`,
      type: 'REVIEW',
    });

    res.status(201).json({ review });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reviews/guide/:guideUserId
router.get('/guide/:guideUserId', async (req, res) => {
  try {
    const allReviews = reviews.findByReviewee(req.params.guideUserId);
    res.json({ reviews: allReviews, total: allReviews.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/reviews/:id/response — Guide replies to review
router.patch('/:id/response', protect, async (req, res) => {
  try {
    const { response } = req.body;
    const store = require('../db');
    // Find and update review response
    const allRevs = reviews._store ? reviews._store() : [];
    const idx = allRevs.findIndex(r => r.id === req.params.id && r.revieweeId === req.user.id);
    if (idx === -1) return res.status(404).json({ error: 'Review not found or access denied' });
    allRevs[idx].guideResponse = response;
    reviews._save(allRevs);
    res.json({ review: allRevs[idx] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
