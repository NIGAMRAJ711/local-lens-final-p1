const express = require('express');
const router = express.Router();
const { notifications } = require('../db');
const { protect } = require('../middleware/error.middleware');

router.get('/', protect, (req, res) => {
  const notifs = notifications.findByUser(req.user.id);
  res.json({ notifications: notifs });
});

router.patch('/:id/read', protect, (req, res) => {
  notifications.markRead(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
