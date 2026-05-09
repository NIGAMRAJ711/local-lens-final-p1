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


// ─── Bucket List ──────────────────────────────────────────────────────────────
router.get('/bucket-list', protect, async (req, res) => {
  try {
    if (require('../db').USE_PG) {
      const { query } = require('../db');
      const rows = await query('SELECT * FROM bucket_list WHERE user_id=$1 ORDER BY is_completed ASC, created_at DESC', [req.user.id]);
      return res.json({ items: rows.map(r => ({ id:r.id, city:r.city, description:r.description, isCompleted:r.is_completed, completedAt:r.completed_at, createdAt:r.created_at })) });
    }
    res.json({ items: [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/bucket-list', protect, async (req, res) => {
  try {
    const { city, description } = req.body;
    if (!city) return res.status(400).json({ error: 'City required' });
    if (require('../db').USE_PG) {
      const { query } = require('../db');
      const { v4: uuidv4 } = require('uuid');
      const id = uuidv4();
      await query('INSERT INTO bucket_list(id,user_id,city,description) VALUES($1,$2,$3,$4)', [id, req.user.id, city, description||'']);
      const row = (await query('SELECT * FROM bucket_list WHERE id=$1', [id]))[0];
      return res.status(201).json({ item: { id:row.id, city:row.city, description:row.description, isCompleted:row.is_completed, createdAt:row.created_at } });
    }
    res.status(201).json({ item: { id: Date.now().toString(), city, description: description||'', isCompleted: false, createdAt: new Date().toISOString() } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/bucket-list/:id/complete', protect, async (req, res) => {
  try {
    if (require('../db').USE_PG) {
      const { query } = require('../db');
      await query('UPDATE bucket_list SET is_completed=true,completed_at=NOW() WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    }
    res.json({ message: 'Marked complete' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/bucket-list/:id', protect, async (req, res) => {
  try {
    if (require('../db').USE_PG) {
      const { query } = require('../db');
      await query('DELETE FROM bucket_list WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    }
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
