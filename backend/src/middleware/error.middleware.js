const jwt = require('jsonwebtoken');
const { users } = require('../db');
const JWT_SECRET = process.env.JWT_SECRET || 'locallens-secret-2024';

const blacklistedTokens = new Set();

async function protect(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'No token provided' });
  const token = auth.split(' ')[1];
  if (blacklistedTokens.has(token)) return res.status(401).json({ success: false, error: 'Token has been revoked' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await users.findById(decoded.userId);
    if (!user) return res.status(401).json({ success: false, error: 'User not found' });
    if (!user.isActive) return res.status(403).json({ success: false, error: 'Account suspended' });
    req.user = user;
    req.token = token;
    next();
  } catch { res.status(401).json({ success: false, error: 'Invalid or expired token' }); }
}

function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  console.error(`[${req.requestId || 'no-request-id'}]`, err.message);
  res.status(status).json({ success: false, error: err.message || 'Internal server error' });
}

function blacklistToken(token) {
  if (token) blacklistedTokens.add(token);
}

module.exports = { protect, errorHandler, blacklistToken };
