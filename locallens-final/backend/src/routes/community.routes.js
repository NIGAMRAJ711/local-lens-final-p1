const express = require('express');
const router = express.Router();
const { communities, communityMembers, communityPosts, notifications } = require('../db');
const { protect } = require('../middleware/error.middleware');

// GET /api/communities
router.get('/', protect, async (req, res) => {
  try {
    const comms = await communities.findMany();
    res.json({ communities: comms });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/communities
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, coverImage } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    
    const community = await communities.create({
      creatorId: req.user.id,
      name: name.trim(),
      description: description?.trim() || '',
      coverImage: coverImage || null
    });
    
    res.status(201).json({ community });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/communities/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const community = await communities.findById(req.params.id);
    if (!community) return res.status(404).json({ error: 'Community not found' });
    
    const [members, posts] = await Promise.all([
      communityMembers.findByCommunity(req.params.id),
      communityPosts.findByCommunity(req.params.id)
    ]);
    
    res.json({ community, members, posts });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/communities/:id/join
router.post('/:id/join', protect, async (req, res) => {
  try {
    const community = await communities.findById(req.params.id);
    if (!community) return res.status(404).json({ error: 'Community not found' });
    
    const member = await communityMembers.join(req.params.id, req.user.id);
    await notifications.create({
      userId: community.creatorId,
      title: '👋 New Community Member',
      body: `${req.user.fullName} joined your community "${community.name}"!`,
      type: 'GENERAL'
    });
    res.json({ member, message: 'Joined successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/communities/:id/leave
router.delete('/:id/leave', protect, async (req, res) => {
  try {
    await communityMembers.leave(req.params.id, req.user.id);
    res.json({ message: 'Left community' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/communities/:id/posts
router.post('/:id/posts', protect, async (req, res) => {
  try {
    const { content, mediaUrl } = req.body;
    if (!content?.trim() && !mediaUrl) {
      return res.status(400).json({ error: 'Post must contain content or media' });
    }
    
    const community = await communities.findById(req.params.id);
    if (!community) return res.status(404).json({ error: 'Community not found' });
    
    // Ensure user is member
    const members = await communityMembers.findByCommunity(req.params.id);
    const isMember = members.some(m => m.userId === req.user.id);
    if (!isMember) return res.status(403).json({ error: 'You must join to post' });
    
    const postId = await communityPosts.create({
      communityId: req.params.id,
      authorId: req.user.id,
      content: content?.trim() || '',
      mediaUrl: mediaUrl || null
    });
    
    // Fetch newly created post to get populated author
    const posts = await communityPosts.findByCommunity(req.params.id);
    const newPost = posts.find(p => p.id === postId);
    
    res.status(201).json({ post: newPost });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
