const express = require('express');
const router = express.Router();
const { notifications } = require('../db');
const { protect } = require('../middleware/error.middleware');

router.get('/', protect, (req, res) => {
  try {
    const notifs = notifications.findByUser(req.user.id);
    res.json({ notifications: notifs, unread: notifs.filter(n => !n.isRead).length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/read', protect, (req, res) => {
  try {
    const notif = notifications.markRead(req.params.id);
    res.json({ notification: notif });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/mark-all-read', protect, (req, res) => {
  try {
    const notifs = notifications.findByUser(req.user.id);
    notifs.filter(n => !n.isRead).forEach(n => notifications.markRead(n.id));
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
