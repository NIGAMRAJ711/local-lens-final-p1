const express = require('express');
const router = express.Router();
const { users, guideProfiles, travelerProfiles, walletTransactions, bookings } = require('../db');
const { protect } = require('../middleware/error.middleware');

function safeUser(u) {
  if (!u) return null;
  const { passwordHash, ...safe } = u;
  return safe;
}

// GET /api/users/me
router.get('/me', protect, (req, res) => {
  try {
    const user = users.findById(req.user.id);
    const guideProfile = guideProfiles.findByUserId(req.user.id);
    const travelerProfile = travelerProfiles.findByUserId(req.user.id);
    const txns = walletTransactions.findByUser(req.user.id).slice(0, 10);
    res.json({ user: { ...safeUser(user), guideProfile, travelerProfile, walletTransactions: txns } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/users/me
router.patch('/me', protect, (req, res) => {
  try {
    const { fullName, avatarUrl, phone } = req.body;
    const updates = {};
    if (fullName) updates.fullName = fullName;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
    if (phone !== undefined) updates.phone = phone;
    const updated = users.update(req.user.id, updates);
    res.json({ user: safeUser(updated) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/users/me/role — Switch between guide and traveler
router.patch('/me/role', protect, (req, res) => {
  try {
    const { role } = req.body;
    if (!['TRAVELER', 'GUIDE', 'BOTH'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    if (role === 'GUIDE' || role === 'BOTH') {
      const guideProfile = guideProfiles.findByUserId(req.user.id);
      if (!guideProfile) {
        return res.status(400).json({ error: 'Guide profile required. Please complete guide registration.', needsGuideProfile: true });
      }
    }
    if (role === 'TRAVELER' || role === 'BOTH') {
      if (!travelerProfiles.findByUserId(req.user.id)) {
        travelerProfiles.create(req.user.id);
      }
    }
    const updated = users.update(req.user.id, { role });
    res.json({ user: safeUser(updated), message: `Switched to ${role} mode` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/users/me/guide-profile
router.patch('/me/guide-profile', protect, (req, res) => {
  try {
    const { bio, city, country, languages, expertiseTags, isPhotographer, isAvailable, hourlyRate, halfDayRate, fullDayRate, photographyRate } = req.body;
    const updates = {};
    if (bio !== undefined) updates.bio = bio;
    if (city !== undefined) updates.city = city;
    if (country !== undefined) updates.country = country;
    if (languages !== undefined) updates.languages = languages;
    if (expertiseTags !== undefined) updates.expertiseTags = expertiseTags;
    if (isPhotographer !== undefined) updates.isPhotographer = isPhotographer;
    if (isAvailable !== undefined) updates.isAvailable = isAvailable;
    if (hourlyRate !== undefined) updates.hourlyRate = parseFloat(hourlyRate);
    if (halfDayRate !== undefined) updates.halfDayRate = parseFloat(halfDayRate);
    if (fullDayRate !== undefined) updates.fullDayRate = parseFloat(fullDayRate);
    if (photographyRate !== undefined) updates.photographyRate = photographyRate ? parseFloat(photographyRate) : null;

    const guide = guideProfiles.updateByUserId(req.user.id, updates);
    if (!guide) return res.status(404).json({ error: 'Guide profile not found' });
    res.json({ guide });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/wallet
router.get('/wallet', protect, (req, res) => {
  try {
    const txns = walletTransactions.findByUser(req.user.id);
    const guide = guideProfiles.findByUserId(req.user.id);
    const traveler = travelerProfiles.findByUserId(req.user.id);
    res.json({ transactions: txns, guide, traveler });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
