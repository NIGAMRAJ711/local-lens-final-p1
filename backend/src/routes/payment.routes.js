const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/error.middleware');

// Stub payment routes - integrate Razorpay when going to production
router.post('/create-order', protect, (req, res) => {
  const { amount } = req.body;
  // In production: create Razorpay order
  res.json({
    orderId: `order_${Date.now()}`,
    amount: parseFloat(amount) * 100,
    currency: 'INR',
    message: 'Payment integration requires Razorpay keys in .env',
  });
});

router.post('/verify', protect, (req, res) => {
  res.json({ success: true, message: 'Payment verified (stub)' });
});

router.get('/history', protect, (req, res) => {
  res.json({ payments: [] });
});

module.exports = router;
