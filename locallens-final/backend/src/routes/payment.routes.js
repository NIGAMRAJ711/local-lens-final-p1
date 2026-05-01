const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/error.middleware');

// Stub - payments handled via Razorpay webhooks in production
router.post('/create-order', protect, (req, res) => {
  res.json({ message: 'Payment integration ready. Configure RAZORPAY_KEY_ID to enable.' });
});

router.post('/verify', protect, (req, res) => {
  res.json({ ok: true });
});

module.exports = router;
