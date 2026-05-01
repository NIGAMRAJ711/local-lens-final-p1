const express = require('express');
const router = express.Router();
const { messages, bookings } = require('../db');
const { protect } = require('../middleware/error.middleware');

router.get('/:bookingId', protect, (req, res) => {
  const booking = bookings.findById(req.params.bookingId);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.guideId !== req.user.id && booking.travelerId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  const msgs = messages.findByBooking(req.params.bookingId);
  res.json({ messages: msgs });
});

module.exports = router;
