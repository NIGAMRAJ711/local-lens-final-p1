const express = require('express');
const router = express.Router();
const { bookings, guideProfiles, notifications, users } = require('../db');
const { protect } = require('../middleware/error.middleware');

router.post('/', protect, (req, res) => {
  try {
    const { guideUserId, duration, bookingType, date, startTime, meetupLocation, specialRequests } = req.body;
    const guide = guideProfiles.findByUserId(guideUserId);
    if (!guide) return res.status(404).json({ error: 'Guide not found' });

    const priceMap = { ONE_HOUR: guide.hourlyRate, HALF_DAY: guide.halfDayRate, FULL_DAY: guide.fullDayRate };
    const basePrice = priceMap[duration] || guide.hourlyRate;
    const platformFee = basePrice * 0.1;
    const totalAmount = basePrice + platformFee;

    const booking = bookings.create({
      guideId: guideUserId, travelerId: req.user.id, bookingType, duration,
      date, startTime, meetupLocation, specialRequests, basePrice, platformFee, totalAmount
    });

    // Notify guide
    notifications.create({
      userId: guideUserId,
      title: '📅 New Booking Request',
      body: `${req.user.fullName} wants to book a ${duration.replace(/_/g, ' ').toLowerCase()} tour on ${date}`,
      type: 'BOOKING'
    });

    res.status(201).json({ booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/my', protect, (req, res) => {
  const { role } = req.query;
  let myBookings = [];
  if (role === 'guide') {
    myBookings = bookings.findMany({ guideId: req.user.id });
  } else if (role === 'traveler') {
    myBookings = bookings.findMany({ travelerId: req.user.id });
  } else {
    const asGuide = bookings.findMany({ guideId: req.user.id });
    const asTraveler = bookings.findMany({ travelerId: req.user.id });
    const seen = new Set();
    myBookings = [...asGuide, ...asTraveler].filter(b => { if (seen.has(b.id)) return false; seen.add(b.id); return true; });
  }
  res.json({ bookings: myBookings });
});

router.patch('/:id/status', protect, (req, res) => {
  const { status } = req.body;
  const booking = bookings.findById(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.guideId !== req.user.id && booking.travelerId !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  const updated = bookings.updateStatus(req.params.id, status);
  // Notify the other party
  const notifyUserId = booking.guideId === req.user.id ? booking.travelerId : booking.guideId;
  notifications.create({ userId: notifyUserId, title: `Booking ${status}`, body: `Your booking has been ${status.toLowerCase()}`, type: 'BOOKING' });
  res.json({ booking: updated });
});

router.patch('/:id/complete', protect, (req, res) => {
  const booking = bookings.findById(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.guideId !== req.user.id) return res.status(403).json({ error: 'Only the guide can complete a booking' });
  const completed = bookings.complete(req.params.id);
  notifications.create({ userId: booking.travelerId, title: '✅ Tour Completed!', body: 'Please leave a review for your guide.', type: 'BOOKING' });
  res.json({ booking: completed });
});

module.exports = router;
