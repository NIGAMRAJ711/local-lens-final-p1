const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/error.middleware');

// Always use memory storage — never write to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|webm/;
    if (allowed.test(file.originalname.toLowerCase().split('.').pop()) || allowed.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only images and videos are allowed'));
  },
});

function getCloudinary() {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return null;
  }
  const cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

function uploadBuffer(cloudinary, buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) reject(err); else resolve(result);
    });
    stream.end(buffer);
  });
}

// POST /api/upload/image
router.post('/image', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const cloudinary = getCloudinary();
    if (!cloudinary) return res.status(500).json({ error: 'Media storage not configured. Set Cloudinary env vars.' });

    // Choose folder based on hint header or default to avatars
    const hint = req.headers['x-upload-hint'] || 'avatar';
    const folder = hint === 'cover' ? 'locallens/covers'
      : hint === 'thumb' ? 'locallens/reels/thumbs'
      : 'locallens/avatars';

    const result = await uploadBuffer(cloudinary, req.file.buffer, { folder, resource_type: 'image' });
    res.json({ url: result.secure_url, publicId: result.public_id });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// POST /api/upload/video
router.post('/video', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const cloudinary = getCloudinary();
    if (!cloudinary) return res.status(500).json({ error: 'Media storage not configured. Set Cloudinary env vars.' });

    const result = await uploadBuffer(cloudinary, req.file.buffer, {
      folder: 'locallens/reels',
      resource_type: 'video',
    });
    const thumbnailUrl = result.secure_url
      .replace('/upload/', '/upload/so_0,f_jpg/')
      .replace(/\.[^.]+$/, '.jpg');
    res.json({ url: result.secure_url, thumbnailUrl });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

module.exports = router;
