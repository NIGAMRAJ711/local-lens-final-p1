const express = require('express');
const router = express.Router();
const { messages, bookings } = require('../db');
const { protect } = require('../middleware/error.middleware');

router.get('/:bookingId', protect, (req, res) => {
  try {
    const booking = bookings.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.guideId !== req.user.id && booking.travelerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    messages.markRead(req.params.bookingId, req.user.id);
    const msgs = messages.findByBooking(req.params.bookingId);
    res.json({ messages: msgs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:bookingId', protect, (req, res) => {
  try {
    const { content, receiverId } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Message content required' });
    const msg = messages.create({ bookingId: req.params.bookingId, senderId: req.user.id, receiverId, content: content.trim() });
    res.status(201).json({ message: msg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
