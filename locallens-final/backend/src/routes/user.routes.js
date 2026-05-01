const express = require('express');
const router = express.Router();
const { users, guideProfiles, travelerProfiles, walletTransactions } = require('../db');
const { protect } = require('../middleware/error.middleware');

// GET /api/users/me
router.get('/me', protect, (req, res) => {
  const user = users.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { passwordHash, ...safe } = user;
  const guide = guideProfiles.findByUserId(user.id);
  const traveler = travelerProfiles.findByUserId(user.id);
  const txns = walletTransactions.findByUser(user.id).slice(0, 10);
  res.json({ user: { ...safe, guideProfile: guide, travelerProfile: traveler, walletTransactions: txns } });
});

// PATCH /api/users/me
router.patch('/me', protect, (req, res) => {
  const { fullName, avatarUrl, phone } = req.body;
  const updates = {};
  if (fullName) updates.fullName = fullName;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
  if (phone !== undefined) updates.phone = phone;
  const updated = users.update(req.user.id, updates);
  if (!updated) return res.status(404).json({ error: 'User not found' });
  const { passwordHash, ...safe } = updated;
  res.json({ user: safe });
});

// PATCH /api/users/me/role
router.patch('/me/role', protect, (req, res) => {
  const { role } = req.body;
  if (!['TRAVELER', 'GUIDE', 'BOTH'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  if (role === 'GUIDE' || role === 'BOTH') {
    const guide = guideProfiles.findByUserId(req.user.id);
    if (!guide) return res.status(400).json({ error: 'Guide profile required', needsGuideProfile: true });
  }
  const updated = users.update(req.user.id, { role });
  const { passwordHash, ...safe } = updated;
  res.json({ user: safe, message: `Switched to ${role} mode` });
});

// PATCH /api/users/me/guide-profile
router.patch('/me/guide-profile', protect, (req, res) => {
  const guide = guideProfiles.findByUserId(req.user.id);
  if (!guide) {
    const created = guideProfiles.create({ userId: req.user.id, ...req.body });
    return res.json({ guide: created });
  }
  const updated = guideProfiles.update(guide.id, req.body);
  res.json({ guide: updated });
});

// GET /api/users/wallet
router.get('/wallet', protect, (req, res) => {
  const txns = walletTransactions.findByUser(req.user.id).slice(0, 50);
  const guide = guideProfiles.findByUserId(req.user.id);
  const traveler = travelerProfiles.findByUserId(req.user.id);
  res.json({ transactions: txns, guide, traveler });
});

module.exports = router;
