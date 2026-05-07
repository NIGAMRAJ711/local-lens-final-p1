const express = require('express');
const router = express.Router();
const { notifications } = require('../db');
const { protect } = require('../middleware/error.middleware');

router.get('/', protect, async (req, res) => {
  try {
    const notifs = await notifications.findByUser(req.user.id);
    res.json({ notifications: notifs, unread: notifs.filter(n => !n.isRead).length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/mark-all-read', protect, async (req, res) => {
  try {
    const notifs = await notifications.findByUser(req.user.id);
    await Promise.all(notifs.filter(n => !n.isRead).map(n => notifications.markRead(n.id)));
    res.json({ message: 'All marked as read' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id/read', protect, async (req, res) => {
  try {
    const notif = await notifications.markRead(req.params.id);
    res.json({ notification: notif });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
