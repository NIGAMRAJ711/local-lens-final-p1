const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/error.middleware');

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  destination(req, file, cb) { cb(null, uploadsDir); },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|webm/;
  if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only images and videos are allowed'));
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB

const getFileUrl = (req, filename) => {
  const host = req.get('host') || `localhost:${process.env.PORT || 5001}`;
  const protocol = req.protocol || 'http';
  return `${protocol}://${host}/uploads/${filename}`;
};

// POST /api/upload/image
router.post('/image', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Try Cloudinary if configured
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      try {
        const cloudinary = require('cloudinary').v2;
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });
        const result = await cloudinary.uploader.upload(req.file.path, { folder: 'locallens' });
        fs.unlinkSync(req.file.path); // remove local after upload
        return res.json({ url: result.secure_url, publicId: result.public_id });
      } catch (cloudErr) {
        console.warn('Cloudinary upload failed, using local:', cloudErr.message);
      }
    }

    // Fall back to local file server
    const url = getFileUrl(req, req.file.filename);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// POST /api/upload/video
router.post('/video', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      try {
        const cloudinary = require('cloudinary').v2;
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'locallens/videos', resource_type: 'video',
        });
        fs.unlinkSync(req.file.path);
        const thumbnailUrl = result.secure_url.replace('/upload/', '/upload/so_0,f_jpg/').replace(/\.[^.]+$/, '.jpg');
        return res.json({ url: result.secure_url, thumbnailUrl });
      } catch (cloudErr) {
        console.warn('Cloudinary video upload failed, using local:', cloudErr.message);
      }
    }

    const url = getFileUrl(req, req.file.filename);
    res.json({ url, thumbnailUrl: null });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

module.exports = router;
