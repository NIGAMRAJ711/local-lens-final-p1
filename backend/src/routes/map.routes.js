const express = require('express');
const router = express.Router();
const { guideProfiles, hiddenGems } = require('../db');

// GET /api/map/guides
router.get('/guides', (req, res) => {
  try {
    const guides = guideProfiles.findMany(req.query);
    // Return all guides (even those without coordinates — frontend handles display)
    res.json({ guides });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/map/hidden-gems
router.get('/hidden-gems', (req, res) => {
  try {
    const gems = hiddenGems.findMany(req.query);
    res.json({ gems });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
