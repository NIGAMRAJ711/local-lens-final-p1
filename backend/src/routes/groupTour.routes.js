const express = require('express');
const router = express.Router();
const { groupTours, groupTourMembers, guideProfiles, notifications } = require('../db');
const { protect } = require('../middleware/error.middleware');

router.get('/', async (req, res) => {
  try {
    const tours = await groupTours.findMany(req.query);
    res.json({ tours, total: tours.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/my/joined', protect, async (req, res) => {
  try {
    const tours = await groupTourMembers.findByUserTours(req.user.id);
    res.json({ tours: tours.filter(Boolean) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const tour = await groupTours.findById(req.params.id);
    if (!tour) return res.status(404).json({ error: 'Tour not found' });
    res.json({ tour });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', protect, async (req, res) => {
  try {
    const guide = await guideProfiles.findByUserId(req.user.id);
    if (!guide) return res.status(403).json({ error: 'Guide profile required to create tours' });
    const tour = await groupTours.create({ guideId: guide.id, ...req.body });
    res.status(201).json({ tour });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/join', protect, async (req, res) => {
  try {
    const member = await groupTourMembers.join(req.params.id, req.user.id);
    const tour = await groupTours.findById(req.params.id);
    if (tour?.guide?.userId) {
      await notifications.create({
        userId: tour.guide.userId,
        title: '👥 New Member Joined!',
        body: `${req.user.fullName} joined your tour: ${tour.title}`,
        type: 'GROUP_TOUR_JOIN',
        data: { tourId: tour.id },
      });
    }
    res.status(201).json({ member });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;
