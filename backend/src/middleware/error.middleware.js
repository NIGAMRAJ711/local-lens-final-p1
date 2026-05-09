const jwt = require('jsonwebtoken');
const { users } = require('../db');
const JWT_SECRET = process.env.JWT_SECRET || 'locallens-secret-2024';

async function protect(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await users.findById(decoded.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch { res.status(401).json({ error: 'Invalid or expired token' }); }
}

function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
}

module.exports = { protect, errorHandler };
