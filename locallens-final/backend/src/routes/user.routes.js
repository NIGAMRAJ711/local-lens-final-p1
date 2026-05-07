const express = require('express');
const router = express.Router();
const { users, guideProfiles, travelerProfiles, walletTransactions } = require('../db');
const { protect } = require('../middleware/error.middleware');
function safe(u) { if(!u)return null; const{passwordHash,...s}=u; return s; }

router.get('/me', protect, async (req, res) => {
  try {
    const [user, guide, traveler, txns] = await Promise.all([
      users.findById(req.user.id),
      guideProfiles.findByUserId(req.user.id),
      travelerProfiles.findByUserId(req.user.id),
      walletTransactions.findByUser(req.user.id),
    ]);
    res.json({ user:{ ...safe(user), guideProfile:guide, travelerProfile:traveler, walletTransactions:txns.slice(0,10) } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/me', protect, async (req, res) => {
  try {
    const { fullName, avatarUrl, phone } = req.body;
    const upd = {};
    if (fullName) upd.fullName = fullName;
    if (avatarUrl !== undefined) upd.avatarUrl = avatarUrl;
    if (phone !== undefined) upd.phone = phone;
    const updated = await users.update(req.user.id, upd);
    res.json({ user: safe(updated) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/me/role', protect, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['TRAVELER','GUIDE','BOTH'].includes(role)) return res.status(400).json({ error:'Invalid role' });
    if (role==='GUIDE'||role==='BOTH') {
      const g = await guideProfiles.findByUserId(req.user.id);
      if (!g) return res.status(400).json({ error:'Guide profile required. Please complete guide registration.', needsGuideProfile:true });
    }
    if (role==='TRAVELER'||role==='BOTH') await travelerProfiles.create(req.user.id);
    const updated = await users.update(req.user.id, { role });
    res.json({ user:safe(updated), message:`Switched to ${role} mode` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/me/guide-profile', protect, async (req, res) => {
  try {
    const allowed = ['bio','city','country','languages','expertiseTags','isPhotographer','isAvailable','hourlyRate','halfDayRate','fullDayRate','photographyRate'];
    const upd = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) upd[k] = req.body[k]; });
    const guide = await guideProfiles.updateByUserId(req.user.id, upd);
    if (!guide) return res.status(404).json({ error:'Guide profile not found' });
    res.json({ guide });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/wallet', protect, async (req, res) => {
  try {
    const [txns, guide, traveler] = await Promise.all([
      walletTransactions.findByUser(req.user.id),
      guideProfiles.findByUserId(req.user.id),
      travelerProfiles.findByUserId(req.user.id),
    ]);
    res.json({ transactions:txns, guide, traveler });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
