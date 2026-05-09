const express = require('express');
const router = express.Router();
const { groupTours, groupTourMembers, guideProfiles, notifications, users } = require('../db');
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

// Open to ALL logged-in users — not just guides
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, city, date, startTime, duration, maxMembers,
            pricePerPerson, meetupPoint, category, coverImage,
            whatsappLink, photos } = req.body;
    if (!title || !date) return res.status(400).json({ error: 'title and date are required' });

    // Try to get guide profile (optional — non-guides can also create)
    const guide = await guideProfiles.findByUserId(req.user.id).catch(() => null);

    const tour = await groupTours.create({
      guideId: guide?.id || null,
      creatorId: req.user.id,
      creatorType: req.user.role || 'TRAVELER',
      title, description, city, date, startTime,
      duration: duration || '3 hours',
      maxMembers: parseInt(maxMembers) || 6,
      pricePerPerson: parseFloat(pricePerPerson) || 0,
      meetupPoint: meetupPoint || '',
      category: category || [],
      coverImage: coverImage || null,
      whatsappLink: whatsappLink || '',
      photos: photos || [],
    });
    res.status(201).json({ tour });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/join', protect, async (req, res) => {
  try {
    const member = await groupTourMembers.join(req.params.id, req.user.id);
    const tour = await groupTours.findById(req.params.id);

    // Notify tour creator
    const creatorId = tour?.creatorId || tour?.guide?.userId;
    if (creatorId && creatorId !== req.user.id) {
      await notifications.create({
        userId: creatorId,
        title: 'New member joined! 🎉',
        body: `${req.user.fullName} joined your tour "${tour.title}"`,
        type: 'GROUP_TOUR_JOIN',
        data: { tourId: tour.id, tourTitle: tour.title, joinerId: req.user.id },
      });
    }

    // Notify the joiner themselves
    const waMsg = tour?.whatsappLink
      ? `Check WhatsApp group for updates.`
      : 'Check the tour details for meetup info.';
    await notifications.create({
      userId: req.user.id,
      title: "You're in! 🥳",
      body: `You joined "${tour?.title}". ${waMsg}`,
      type: 'GROUP_TOUR_JOINED',
      data: { tourId: tour?.id, whatsappLink: tour?.whatsappLink },
    });

    res.status(201).json({ member });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;
