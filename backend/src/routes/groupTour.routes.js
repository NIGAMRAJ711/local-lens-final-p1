const express = require('express');
const router = express.Router();
const { groupTours, groupTourMembers, guideProfiles, users, notifications } = require('../db');
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

// Open to ALL logged-in users — no guide profile required
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, city, date, startTime, duration, maxMembers,
      pricePerPerson, meetupPoint, category, coverImage, whatsappLink, photos } = req.body;
    if (!title || !city || !date || !pricePerPerson) {
      return res.status(400).json({ error: 'title, city, date and pricePerPerson are required' });
    }

    // Try to get guide profile for guideId (optional now)
    const guide = await guideProfiles.findByUserId(req.user.id).catch(() => null);

    const tour = await groupTours.create({
      guideId: guide?.id || null,
      creatorId: req.user.id,
      creatorType: req.user.role || 'TRAVELER',
      title, description, city, date, startTime,
      duration: duration || '3 hours',
      maxMembers: parseInt(maxMembers) || 10,
      pricePerPerson: parseFloat(pricePerPerson),
      meetupPoint: meetupPoint || '',
      category: category || [],
      coverImage: coverImage || '',
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

    // Notify creator
    const creatorId = tour?.creatorId || tour?.guide?.userId;
    if (creatorId && creatorId !== req.user.id) {
      await notifications.create({
        userId: creatorId,
        title: '🎉 New member joined!',
        body: `${req.user.fullName} joined your tour "${tour.title}"`,
        type: 'GROUP_TOUR_JOIN',
        data: { tourId: tour.id, joinerName: req.user.fullName },
      }).catch(() => {});
    }

    // Notify the joiner
    const waMsg = tour?.whatsappLink
      ? `Check the WhatsApp group for updates.`
      : `Meetup at ${tour?.meetupPoint || 'the listed location'}.`;
    await notifications.create({
      userId: req.user.id,
      title: "You're in! 🥳",
      body: `You joined "${tour?.title}". ${waMsg}`,
      type: 'GROUP_TOUR_JOINED',
      data: { tourId: tour?.id, whatsappLink: tour?.whatsappLink },
    }).catch(() => {});

    res.status(201).json({ member });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

module.exports = router;
