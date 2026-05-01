const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { users, travelerProfiles, guideProfiles, notifications } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'locallens-secret-2024';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'locallens-refresh-2024';

function generateTokens(userId) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
  const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '30d' });
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
    if (!email || !password || !fullName) return res.status(400).json({ error: 'Email, password and name are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const existing = users.findByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = users.create({ email, phone, passwordHash, fullName, role: role || 'TRAVELER' });
    travelerProfiles.create(user.id);
    if (role === 'GUIDE') {
      guideProfiles.create({ userId: user.id, bio: '', city: '', country: 'India', languages: [], expertiseTags: [], hourlyRate: 500, halfDayRate: 2000, fullDayRate: 3500 });
      users.update(user.id, { role: 'GUIDE' });
    }
    const { accessToken, refreshToken } = generateTokens(user.id);
    notifications.create({ userId: user.id, title: 'Welcome to LocalLens! 🌍', body: 'Discover local guides and hidden gems around the world.', type: 'WELCOME' });
    const updatedUser = users.findById(user.id);
    res.status(201).json({ accessToken, refreshToken, user: safeUser(updatedUser) });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = users.findByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
    const { accessToken, refreshToken } = generateTokens(user.id);
    res.json({ accessToken, refreshToken, user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const user = users.findById(decoded.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    const tokens = generateTokens(user.id);
    res.json(tokens);
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const user = users.findByEmail(email);
    if (!user) return res.json({ message: 'If that email is registered, a reset link has been sent.' });
    const resetToken = jwt.sign({ userId: user.id, purpose: 'reset' }, JWT_SECRET, { expiresIn: '1h' });
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    console.log(`[DEV] Password reset link for ${email}:`, resetLink);
    res.json({
      message: 'If that email is registered, a reset link has been sent.',
      devToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined,
      devLink: process.env.NODE_ENV !== 'production' ? resetLink : undefined,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
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
    users.update(decoded.userId, { passwordHash });
    res.json({ message: 'Password reset successfully. Please login.' });
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' });
    res.status(400).json({ error: 'Invalid or expired reset token' });
  }
});

module.exports = router;
