require('dotenv').config();
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { users, guideProfiles, travelerProfiles, notifications } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'locallens-secret-2024';
const JWT_REFRESH = process.env.JWT_REFRESH_SECRET || 'locallens-refresh-2024';

function makeTokens(userId) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
  const refreshToken = jwt.sign({ userId }, JWT_REFRESH, { expiresIn: '30d' });
  return { accessToken, refreshToken };
}

function safeUser(u) {
  if (!u) return null;
  const { passwordHash, ...safe } = u;
  return safe;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName, phone, role } = req.body;
    if (!email || !password || !fullName) return res.status(400).json({ error: 'email, password and fullName are required' });
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });
    if (!/^(\+91|91)?[6-9]\d{9}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const existing = await users.findByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await users.create({ email, phone: phone||null, passwordHash, fullName, role: role||'TRAVELER' });
    // Auto-create traveler profile
    await travelerProfiles.create(user.id);
    // Welcome notification
    await notifications.create({ userId: user.id, title: 'Welcome to LocalLens! 🌍', body: 'Discover local guides, hidden gems and authentic travel experiences.', type: 'GENERAL' });
    const { accessToken, refreshToken } = makeTokens(user.id);
    res.status(201).json({ accessToken, refreshToken, user: safeUser(user) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = await users.findByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
    if (!user.isActive) return res.status(403).json({ error: 'Your account has been suspended. Contact support.' });
    const { accessToken, refreshToken } = makeTokens(user.id);
    res.json({ accessToken, refreshToken, user: safeUser(user) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
    const decoded = jwt.verify(refreshToken, JWT_REFRESH);
    const { accessToken, refreshToken: newRefresh } = makeTokens(decoded.userId);
    res.json({ accessToken, refreshToken: newRefresh });
  } catch { res.status(401).json({ error: 'Invalid refresh token' }); }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const user = await users.findByEmail(email);
    if (!user) return res.json({ message: 'If that email is registered, a reset link has been sent.' });
    const resetToken = jwt.sign({ userId: user.id, purpose: 'reset' }, JWT_SECRET, { expiresIn: '1h' });
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    // Try email if configured
    if (process.env.SMTP_USER) {
      try {
        const nodemailer = require('nodemailer');
        const t = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT||587), auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
        await t.sendMail({ from: process.env.EMAIL_FROM||process.env.SMTP_USER, to: email, subject: 'LocalLens — Reset your password', html: `<p>Click to reset (valid 1 hour):</p><a href="${resetLink}">${resetLink}</a>` });
      } catch(e) { console.error('Email error:', e.message); }
    }
    // Always return the same generic message — never expose the token in the response
    res.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.purpose !== 'reset') return res.status(400).json({ error: 'Invalid reset token' });
    const passwordHash = await bcrypt.hash(password, 12);
    await users.update(decoded.userId, { passwordHash });
    res.json({ message: 'Password reset successfully. Please login.' });
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(400).json({ error: 'Reset link expired. Please request a new one.' });
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;
