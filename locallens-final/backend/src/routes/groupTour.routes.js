const express = require('express');
const router = express.Router();
const { groupTours, groupTourMembers, guideProfiles, notifications } = require('../db');
const { protect } = require('../middleware/error.middleware');

// GET /api/group-tours/my/joined — MUST be before /:id
router.get('/my/joined', protect, (req, res) => {
  const tours = groupTourMembers.findByUserTours(req.user.id);
  res.json({ tours });
});

// GET /api/group-tours
router.get('/', (req, res) => {
  const tours = groupTours.findMany(req.query);
  res.json({ tours, total: tours.length });
});

// GET /api/group-tours/:id
router.get('/:id', (req, res) => {
  const tour = groupTours.findById(req.params.id);
  if (!tour) return res.status(404).json({ error: 'Tour not found' });
  res.json({ tour });
});

// POST /api/group-tours
router.post('/', protect, (req, res) => {
  try {
    const guide = guideProfiles.findByUserId(req.user.id);
    if (!guide) return res.status(403).json({ error: 'Guide profile required' });
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
    // Notify guide
    const tour = groupTours.findById(req.params.id);
    if (tour?.guide?.userId) {
      notifications.create({
        userId: tour.guide.userId,
        title: '👥 New Group Tour Member',
        body: `${req.user.fullName} joined your tour: ${tour.title}`,
        type: 'GROUP_TOUR_JOIN',
      });
    }
    res.status(201).json({ member });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
