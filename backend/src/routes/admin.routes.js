const express = require('express');
const router = express.Router();
const { users, guideProfiles, bookings, notifications, USE_PG, query } = require('../db');
const { protect } = require('../middleware/error.middleware');
const { v4: uuid } = require('uuid');

const BLACKLIST_REASONS = [
  'SCAMMER','FRAUD_PAYMENT','RUDE_BEHAVIOR','DRUNK_DISORDERLY',
  'HARASSMENT','FAKE_PROFILE','NO_SHOW','SAFETY_THREAT',
  'INAPPROPRIATE_CONTENT','OTHER'
];

// Admin-only middleware
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
  next();
};

// POST /admin/blacklist/:userId
router.post('/blacklist/:userId', protect, adminOnly, async (req, res) => {
  try {
    const { reasonCategory, customReason } = req.body;
    if (!reasonCategory) return res.status(400).json({ error: 'reasonCategory required' });

    const target = await users.findById(req.params.userId);
    if (!target) return res.status(404).json({ error: 'User not found' });

    const reason = customReason || reasonCategory;
    const id = uuid();

    if (USE_PG) {
      // Insert into blacklist (UPSERT to handle re-blacklisting)
      await query(
        `INSERT INTO blacklist(id,user_id,reason,reason_category,blacklisted_by,email,phone) VALUES($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT(user_id) DO UPDATE SET reason=$3,reason_category=$4,blacklisted_by=$5,blacklisted_at=NOW()`,
        [id, target.id, reason, reasonCategory, req.user.id, target.email?.toLowerCase(), target.phone || null]
      );
      // Deactivate user
      await query('UPDATE users SET is_blacklisted=true, is_active=false WHERE id=$1', [target.id]);
      // Deactivate guide profile if exists
      await query('UPDATE guide_profiles SET is_blacklisted=true, is_available=false WHERE user_id=$1', [target.id]).catch(() => {});
      // Cancel active bookings
      await query(`UPDATE bookings SET status='CANCELLED' WHERE (guide_id=$1 OR traveler_id=$1) AND status IN ('PENDING','CONFIRMED')`, [target.id]).catch(() => {});
    } else {
      // JSON mode
      const path = require('path'), fs = require('fs');
      const file = path.join(__dirname, '../../data/blacklist.json');
      let store = [];
      try { store = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
      store = store.filter(b => b.userId !== target.id);
      store.push({ id, userId: target.id, reason, reasonCategory, blacklistedBy: req.user.id, email: target.email?.toLowerCase(), phone: target.phone, blacklistedAt: new Date().toISOString() });
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(store, null, 2));
      // Update user and guide in JSON stores
      await users.update(target.id, { isBlacklisted: true, isActive: false }).catch(() => {});
      const guide = await guideProfiles.findByUserId(target.id).catch(() => null);
      if (guide) await guideProfiles.update(guide.id, { isBlacklisted: true, isAvailable: false }).catch(() => {});
    }

    // Notify the blacklisted user
    await notifications.create({
      userId: target.id,
      title: 'Account Suspended',
      body: `Your account has been suspended. Reason: ${reasonCategory.replace(/_/g, ' ')}.`,
      type: 'GENERAL',
    }).catch(() => {});

    res.json({ success: true, user: { id: target.id, email: target.email, phone: target.phone, fullName: target.fullName } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /admin/blacklist
router.get('/blacklist', protect, adminOnly, async (req, res) => {
  try {
    if (USE_PG) {
      const rows = await query(
        `SELECT b.*,u.full_name,u.email as u_email,u.role FROM blacklist b JOIN users u ON u.id=b.user_id ORDER BY b.blacklisted_at DESC`
      );
      return res.json({ blacklist: rows.map(r => ({
        id: r.id, userId: r.user_id, fullName: r.full_name,
        email: r.email || r.u_email, phone: r.phone,
        reasonCategory: r.reason_category, reason: r.reason,
        blacklistedAt: r.blacklisted_at, role: r.role,
      }))});
    }
    const path = require('path'), fs = require('fs');
    const file = path.join(__dirname, '../../data/blacklist.json');
    let store = [];
    try { store = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
    const enriched = await Promise.all(store.map(async b => {
      const u = await users.findById(b.userId).catch(() => null);
      return { ...b, fullName: u?.fullName, role: u?.role };
    }));
    res.json({ blacklist: enriched.sort((a,b) => new Date(b.blacklistedAt) - new Date(a.blacklistedAt)) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /admin/blacklist/:userId
router.delete('/blacklist/:userId', protect, adminOnly, async (req, res) => {
  try {
    if (USE_PG) {
      await query('DELETE FROM blacklist WHERE user_id=$1', [req.params.userId]);
      await query('UPDATE users SET is_blacklisted=false, is_active=true WHERE id=$1', [req.params.userId]);
      await query('UPDATE guide_profiles SET is_blacklisted=false WHERE user_id=$1', [req.params.userId]).catch(() => {});
    } else {
      const path = require('path'), fs = require('fs');
      const file = path.join(__dirname, '../../data/blacklist.json');
      let store = [];
      try { store = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
      fs.writeFileSync(file, JSON.stringify(store.filter(b => b.userId !== req.params.userId), null, 2));
      await users.update(req.params.userId, { isBlacklisted: false, isActive: true }).catch(() => {});
      const guide = await guideProfiles.findByUserId(req.params.userId).catch(() => null);
      if (guide) await guideProfiles.update(guide.id, { isBlacklisted: false }).catch(() => {});
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/reasons', protect, adminOnly, (req, res) => {
  res.json({ reasons: BLACKLIST_REASONS });
});

module.exports = router;
