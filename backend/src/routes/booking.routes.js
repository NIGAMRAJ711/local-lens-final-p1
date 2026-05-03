const express = require('express');
const router = express.Router();
const { bookings, guideProfiles, travelerProfiles, notifications } = require('../db');
const { protect } = require('../middleware/error.middleware');

const PRICE_MAP = { ONE_HOUR: 'hourlyRate', HALF_DAY: 'halfDayRate', FULL_DAY: 'fullDayRate' };
const FEE = parseFloat(process.env.PLATFORM_FEE_PERCENT||10) / 100;

router.get('/my', protect, async (req, res) => {
  try {
    const { role } = req.query;
    const isGuide = role === 'guide' || req.user.role === 'GUIDE';
    let myBookings = [];
    if (isGuide || role === 'guide') {
      myBookings = await bookings.findMany({ guideId: req.user.id });
    }
    if (!isGuide || role === 'traveler') {
      const travBookings = await bookings.findMany({ travelerId: req.user.id });
      const ids = new Set(myBookings.map(b => b.id));
      travBookings.forEach(b => { if (!ids.has(b.id)) myBookings.push(b); });
    }
    res.json({ bookings: myBookings });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', protect, async (req, res) => {
  try {
    const { guideUserId, duration, bookingType, date, startTime, meetupLocation, specialRequests } = req.body;
    if (!guideUserId || !date || !startTime) return res.status(400).json({ error: 'guideUserId, date and startTime required' });
    const guide = await guideProfiles.findByUserId(guideUserId);
    if (!guide) return res.status(404).json({ error: 'Guide not found' });
    const priceField = PRICE_MAP[duration] || 'hourlyRate';
    const base = guide[priceField] || guide.hourlyRate || 0;
    const fee = Math.round(base * FEE);
    const booking = await bookings.create({
      guideId: guideUserId, travelerId: req.user.id, bookingType: bookingType||'PRIVATE',
      duration: duration||'ONE_HOUR', date, startTime, meetupLocation: meetupLocation||'',
      specialRequests: specialRequests||'', basePrice: base, platformFee: fee, totalAmount: base + fee,
    });
    await notifications.create({ userId: guideUserId, title: '📅 New Booking Request', body: `${req.user.fullName} wants to book a ${(duration||'ONE_HOUR').replace(/_/g,' ')} tour on ${date}`, type: 'BOOKING', data: { bookingId: booking.id } });
    // Notify traveller too
    await notifications.create({ userId: req.user.id, title: '✅ Booking Sent!', body: `Your request to ${guide.user?.fullName} for ${date} has been sent. Awaiting confirmation.`, type: 'BOOKING' });
    res.status(201).json({ booking });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await bookings.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.guideId !== req.user.id) return res.status(403).json({ error: 'Only the guide can update booking status' });
    const updated = await bookings.updateStatus(req.params.id, status);
    // Notify traveller
    const msgs = { CONFIRMED: `✅ ${req.user.fullName} confirmed your booking for ${booking.date}!`, CANCELLED: `❌ ${req.user.fullName} declined your booking for ${booking.date}.` };
    if (msgs[status]) await notifications.create({ userId: booking.travelerId, title: msgs[status].slice(0,50), body: msgs[status], type: 'BOOKING' });
    res.json({ booking: updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/complete', protect, async (req, res) => {
  try {
    const booking = await bookings.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.guideId !== req.user.id) return res.status(403).json({ error: 'Only guide can complete' });
    const completed = await bookings.complete(req.params.id);
    await notifications.create({ userId: booking.travelerId, title: '🎉 Tour Completed!', body: `Your tour with ${req.user.fullName} is marked complete. Please leave a review!`, type: 'BOOKING' });
    await notifications.create({ userId: req.user.id, title: '💰 Earnings Added!', body: `Rs${Math.floor(booking.basePrice*0.9)} added to your wallet for completing the tour.`, type: 'PAYMENT' });
    res.json({ booking: completed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
