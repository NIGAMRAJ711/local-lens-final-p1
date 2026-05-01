const express = require('express');
const router = express.Router();
const { sosAlerts, notifications, users } = require('../db');
const { protect } = require('../middleware/error.middleware');

router.post('/', protect, (req, res) => {
  try {
    const { latitude, longitude, bookingId, message } = req.body;
    const alert = sosAlerts.create({ userId: req.user.id, latitude, longitude, bookingId, message });
    // Broadcast to all guides nearby (simplified: notify all admins/guides)
    const allUsers = users.findAll().filter(u => u.role === 'GUIDE' || u.role === 'ADMIN');
    allUsers.slice(0, 5).forEach(u => {
      notifications.create({ userId: u.id, title: '🚨 SOS Alert!', body: `${req.user.fullName} needs help at (${latitude?.toFixed(4)}, ${longitude?.toFixed(4)})`, type: 'SOS' });
    });
    res.status(201).json({ alert, message: 'SOS alert sent. Help is on the way.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
