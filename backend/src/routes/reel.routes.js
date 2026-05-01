const express = require('express');
const router = express.Router();
const { reels } = require('../db');
const { protect } = require('../middleware/error.middleware');

router.get('/', (req, res) => {
  const feed = reels.findMany(req.query);
  res.json({ reels: feed });
});

router.post('/', protect, (req, res) => {
  const { videoUrl, thumbnailUrl, caption, reelType, city, locationName } = req.body;
  if (!videoUrl) return res.status(400).json({ error: 'Video URL required' });
  const reel = reels.create({ userId: req.user.id, videoUrl, thumbnailUrl, caption, reelType, city, locationName });
  res.status(201).json({ reel });
});

router.post('/:id/like', protect, (req, res) => {
  const liked = reels.like(req.params.id, req.user.id);
  res.json({ liked });
});

router.post('/:id/view', (req, res) => {
  reels.view(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
