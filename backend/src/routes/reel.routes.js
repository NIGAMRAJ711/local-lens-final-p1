const express = require('express');
const router = express.Router();
const { reels, notifications } = require('../db');
const { protect } = require('../middleware/error.middleware');

router.get('/', async (req, res) => {
  try {
    const data = await reels.findMany(req.query);
    res.json({ reels: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', protect, async (req, res) => {
  try {
    const { videoUrl, thumbnailUrl, caption, reelType, city, locationName, latitude, longitude } = req.body;
    if (!videoUrl) return res.status(400).json({ error: 'videoUrl is required' });
    const reel = await reels.create({ userId: req.user.id, videoUrl, thumbnailUrl: thumbnailUrl||null, caption: caption||'', reelType: reelType||'GENERAL', city: city||'', locationName: locationName||'', latitude: latitude||null, longitude: longitude||null });
    res.status(201).json({ reel });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/like', protect, async (req, res) => {
  try {
    const liked = await reels.like(req.params.id, req.user.id);
    res.json({ liked });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/view', async (req, res) => {
  try {
    await reels.view(req.params.id);
    res.json({ ok: true });
  } catch (err) { res.json({ ok: false }); }
});

module.exports = router;
