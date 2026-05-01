const express = require('express');
const router = express.Router();
const { guideProfiles, hiddenGems } = require('../db');

router.get('/guides', (req, res) => {
  const guides = guideProfiles.findMany({ ...req.query, limit: 200 })
    .filter(g => g.latitude && g.longitude);
  res.json({ guides });
});

router.get('/hidden-gems', (req, res) => {
  const gems = hiddenGems.findMany(req.query);
  res.json({ gems });
});

module.exports = router;
