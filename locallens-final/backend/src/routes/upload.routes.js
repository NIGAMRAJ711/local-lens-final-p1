const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/error.middleware');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|mp4|mov|webm|quicktime/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = /image\/|video\//.test(file.mimetype);
    if (extOk || mimeOk) cb(null, true);
    else cb(new Error('Only images and videos are allowed'));
  },
});

async function uploadToCloudinary(buffer, mimetype, folder, resourceType = 'auto') {
  const cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  const b64 = Buffer.from(buffer).toString('base64');
  const dataURI = `data:${mimetype};base64,${b64}`;
  return cloudinary.uploader.upload(dataURI, { folder: `locallens/${folder}`, resource_type: resourceType });
}

// POST /api/upload/image
router.post('/image', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      const result = await uploadToCloudinary(req.file.buffer, req.file.mimetype, 'images', 'image');
      return res.json({ url: result.secure_url, publicId: result.public_id });
    }
    // Fallback: base64 data URL (works without Cloudinary)
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    res.json({ url: `data:${req.file.mimetype};base64,${b64}` });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// POST /api/upload/video
router.post('/video', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      const result = await uploadToCloudinary(req.file.buffer, req.file.mimetype, 'videos', 'video');
      const thumbnailUrl = result.secure_url.replace('/upload/', '/upload/so_0,f_jpg/').replace('.mp4', '.jpg');
      return res.json({ url: result.secure_url, publicId: result.public_id, thumbnailUrl });
    }
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    res.json({ url: `data:${req.file.mimetype};base64,${b64}`, thumbnailUrl: null });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

module.exports = router;
