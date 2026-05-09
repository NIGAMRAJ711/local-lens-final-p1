const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/error.middleware');

router.post('/create-order', protect, (req, res) => {
  res.json({ orderId: `order_${Date.now()}`, amount: parseFloat(req.body.amount || 0) * 100, currency: 'INR' });
});

router.post('/verify', protect, (req, res) => {
  res.json({ success: true });
});

router.get('/history', protect, (req, res) => {
  res.json({ payments: [] });
});

module.exports = router;
