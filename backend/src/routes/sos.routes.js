/** SOS routes: emergency alerts from active bookings. */
const express = require('express');
const router = express.Router();
const { sosAlerts, notifications, users } = require('../db');
const { protect } = require('../middleware/error.middleware');

router.post('/', protect, async (req, res) => {
  try {
    const { latitude, longitude, bookingId, message } = req.body;
    const alert = await sosAlerts.create({ userId: req.user.id, latitude, longitude, bookingId, message });
    const allUsers = await users.findAll();
    const guides = allUsers.filter(u => u.role === 'GUIDE' || u.role === 'BOTH').slice(0, 5);
    await Promise.all(guides.map(u => notifications.create({
      userId: u.id,
      title: '🚨 SOS Alert!',
      body: `${req.user.fullName} needs help`,
      type: 'SOS',
    })));
    res.status(201).json({ alert, message: 'SOS sent. Help is on the way.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
