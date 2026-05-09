const express = require('express');
const router = express.Router();
const { bookings, guideProfiles, travelerProfiles, notifications, users, walletTransactions } = require('../db');
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
    const { guideUserId, duration, bookingType, date, startTime, meetupLocation, specialRequests, numberOfPeople, hotelPreference, restaurantPreference } = req.body;
    if (!guideUserId || !date || !startTime) return res.status(400).json({ error: 'guideUserId, date and startTime required' });
    const guide = await guideProfiles.findByUserId(guideUserId);
    if (!guide) return res.status(404).json({ error: 'Guide not found' });
    const priceField = PRICE_MAP[duration] || 'hourlyRate';
    const base = guide[priceField] || guide.hourlyRate || 0;
    const fee = Math.round(base * FEE);
    const booking = await bookings.create({
      guideId: guideUserId, travelerId: req.user.id, bookingType: bookingType||'PRIVATE',
      duration: duration||'ONE_HOUR', date, startTime, meetupLocation: meetupLocation||'',
      specialRequests: specialRequests||'', numberOfPeople: parseInt(numberOfPeople)||1,
      hotelPreference: hotelPreference||'', restaurantPreference: restaurantPreference||'',
      basePrice: base, platformFee: fee, totalAmount: base + fee,
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
    // Get guide info for the review prompt
    const guide = await guideProfiles.findByUserId(booking.guideId).catch(() => null);
    const guideUser = guide?.user || await users.findById(booking.guideId).catch(() => null);
    await notifications.create({
      userId: booking.travelerId,
      title: 'How was your tour? ⭐',
      body: `Rate your experience with ${req.user.fullName}. Your review helps other travelers.`,
      type: 'REVIEW_PROMPT',
      data: {
        bookingId: booking.id,
        guideId: booking.guideId,
        guideName: req.user.fullName,
        guideAvatar: req.user.avatarUrl || null,
        revieweeId: booking.guideId,
      },
    });
    await notifications.create({ userId: req.user.id, title: '💰 Earnings Added!', body: `Rs${Math.floor(booking.basePrice*0.9)} added to your wallet for completing the tour.`, type: 'PAYMENT' });
    res.json({ booking: completed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /bookings/:id/cancel
router.patch('/:id/cancel', protect, async (req, res) => {
  try {
    const booking = await bookings.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    const isTraveler = booking.travelerId === req.user.id;
    const isGuide = booking.guideId === req.user.id;
    if (!isTraveler && !isGuide) return res.status(403).json({ error: 'Access denied' });
    if (!['PENDING','CONFIRMED'].includes(booking.status)) return res.status(400).json({ error: 'Booking cannot be cancelled' });
    // Travelers can only cancel >24hrs before tour
    if (isTraveler && !isGuide) {
      const tourDate = new Date(`${booking.date}T${booking.startTime || '00:00'}`);
      const hoursUntil = (tourDate - Date.now()) / 3600000;
      if (hoursUntil < 24) return res.status(400).json({ error: 'Cannot cancel within 24 hours of tour. Contact guide directly.' });
    }
    await bookings.update(req.params.id, { status: 'CANCELLED' });
    const updatedBooking = await bookings.findById(req.params.id);
    // Refund wallet if payment captured
    if (booking.paymentStatus === 'CAPTURED') {
      await bookings.update(req.params.id, { paymentStatus: 'REFUNDED' });
      await walletTransactions.create({ userId: booking.travelerId, amount: booking.totalAmount, type: 'CREDIT', description: `Refund for cancelled booking #${booking.id.slice(0,8).toUpperCase()}` }).catch(() => {});
    }
    // Notify other party
    if (isTraveler) {
      await notifications.create({ userId: booking.guideId, title: 'Booking Cancelled', body: `${req.user.fullName} cancelled the booking for ${booking.date}`, type: 'BOOKING' }).catch(() => {});
    } else {
      await notifications.create({ userId: booking.travelerId, title: 'Booking Cancelled by Guide', body: `${req.user.fullName} cancelled your booking for ${booking.date}. You will be refunded.`, type: 'BOOKING' }).catch(() => {});
    }
    res.json({ booking: updatedBooking });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /bookings/:id/reject
router.patch('/:id/reject', protect, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Reason is required' });
    const booking = await bookings.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.guideId !== req.user.id) return res.status(403).json({ error: 'Only guide can reject' });
    if (booking.status !== 'PENDING') return res.status(400).json({ error: 'Can only reject pending bookings' });
    await bookings.update(req.params.id, { status: 'CANCELLED' });
    if (booking.paymentStatus === 'CAPTURED') {
      await bookings.update(req.params.id, { paymentStatus: 'REFUNDED' });
      await walletTransactions.create({ userId: booking.travelerId, amount: booking.totalAmount, type: 'CREDIT', description: `Refund for rejected booking #${booking.id.slice(0,8).toUpperCase()}` }).catch(() => {});
    }
    await notifications.create({ userId: booking.travelerId, title: 'Booking Rejected', body: `${req.user.fullName} declined your booking. Reason: ${reason}`, type: 'BOOKING' }).catch(() => {});
    res.json({ booking: await bookings.findById(req.params.id) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
