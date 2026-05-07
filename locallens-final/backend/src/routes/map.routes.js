const express = require('express');
const router = express.Router();
const { guideProfiles, hiddenGems } = require('../db');
router.get('/guides', async (req, res) => {
  try { const guides = await guideProfiles.findMany({ ...req.query, limit:500 }); res.json({ guides }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
router.get('/hidden-gems', async (req, res) => {
  try { const gems = await hiddenGems.findMany(req.query); res.json({ gems }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
module.exports = router;
