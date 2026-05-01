const express = require('express');
const router = express.Router();
const { groupTours, groupTourMembers, guideProfiles, notifications } = require('../db');
const { protect } = require('../middleware/error.middleware');

// GET /api/group-tours — browse with filters
router.get('/', (req, res) => {
  try {
    const tours = groupTours.findMany(req.query);
    res.json({ tours, total: tours.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/group-tours/my/joined
router.get('/my/joined', protect, (req, res) => {
  try {
    const tours = groupTourMembers.findByUserTours(req.user.id);
    res.json({ tours });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/group-tours/:id
router.get('/:id', (req, res) => {
  try {
    const tour = groupTours.findById(req.params.id);
    if (!tour) return res.status(404).json({ error: 'Tour not found' });
    res.json({ tour });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/group-tours — create (guide only)
router.post('/', protect, (req, res) => {
  try {
    const guide = guideProfiles.findByUserId(req.user.id);
    if (!guide) return res.status(403).json({ error: 'Guide profile required to create tours' });
    const tour = groupTours.create({ guideId: guide.id, ...req.body });
    res.status(201).json({ tour });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/group-tours/:id/join
router.post('/:id/join', protect, (req, res) => {
  try {
    const member = groupTourMembers.join(req.params.id, req.user.id);
    const tour = groupTours.findById(req.params.id);
    // Notify guide
    if (tour?.guide?.userId) {
      notifications.create({
        userId: tour.guide.userId,
        title: '👥 New Member Joined!',
        body: `${req.user.fullName} joined your tour: ${tour.title}`,
        type: 'GROUP_TOUR_JOIN',
        data: { tourId: tour.id },
      });
    }
    res.status(201).json({ member });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
