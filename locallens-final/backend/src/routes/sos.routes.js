const express = require('express');
const router = express.Router();
const { sosAlerts, notifications, users } = require('../db');
const { protect } = require('../middleware/error.middleware');

router.post('/', protect, (req, res) => {
  try {
    const { latitude, longitude, bookingId, message } = req.body;
    const alert = sosAlerts.create({ userId: req.user.id, latitude, longitude, bookingId, message });
    // Notify admins / broadcast (in production: notify emergency contacts)
    const io = req.app.get('io');
    if (io) io.emit('sos:alert', { userId: req.user.id, userName: req.user.fullName, latitude, longitude, message });
    res.json({ ok: true, alertId: alert.id, message: 'SOS alert sent. Help is on the way.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
