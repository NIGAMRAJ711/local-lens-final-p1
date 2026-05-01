const express = require('express');
const router = express.Router();
const { reviews, bookings } = require('../db');
const { protect } = require('../middleware/error.middleware');

router.post('/', protect, (req, res) => {
  const { bookingId, rating, comment } = req.body;
  const booking = bookings.findById(bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.travelerId !== req.user.id) return res.status(403).json({ error: 'Only the traveler can review' });
  const id = reviews.create({ bookingId, reviewerId: req.user.id, revieweeId: booking.guideId, rating, comment });
  res.status(201).json({ id });
});

module.exports = router;
