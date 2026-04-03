const jwt = require('jsonwebtoken');
const User = require('../models/User');

const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
};

const ensureAdmin = (req, res, next) => {
  console.log('ensureAdmin middleware called');
  if (!req.isAuthenticated()) {
    console.log('Authentication failed, sending 401');
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!req.user.isAdmin) {
    console.log('User is not admin, sending 403');
    return res.status(403).json({ error: 'Admin access required' });
  }

  console.log('Admin access granted');
  next();
};

function getJwtSecret() {
  const s = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === 'production') {
      console.error('JWT_SECRET or SESSION_SECRET must be set for mobile auth in production');
    }
    return 'dev-only-mobile-jwt-change-me';
  }
  return s;
}

/**
 * Attach req.user from Authorization: Bearer <jwt> if valid.
 * @returns {Promise<boolean>}
 */
async function tryAttachJwtUser(req) {
  const h = req.headers.authorization;
  if (!h || typeof h !== 'string' || !h.startsWith('Bearer ')) {
    return false;
  }
  const token = h.slice(7).trim();
  if (!token) return false;
  try {
    const payload = jwt.verify(token, getJwtSecret());
    const sub = payload.sub;
    if (!sub) return false;
    const user = await User.findById(sub);
    if (!user || user.isFrozen) return false;
    req.user = user;
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Passport session OR Bearer JWT (for React Native / mobile clients).
 */
const ensureAuthenticatedOrMobile = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  tryAttachJwtUser(req)
    .then((ok) => {
      if (ok) return next();
      return res.status(401).json({ error: 'Not authenticated' });
    })
    .catch((e) => {
      console.error('ensureAuthenticatedOrMobile error:', e);
      return res.status(500).json({ error: 'Authentication error' });
    });
};

/** Attach req.user from Bearer JWT when present; always calls next (for optional owner checks). */
const optionalAttachMobileUser = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  tryAttachJwtUser(req)
    .then(() => next())
    .catch(() => next());
};

function signMobileToken(user) {
  return jwt.sign(
    { sub: user._id.toString() },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
}

/**
 * Strict middleware: only Bearer JWT (for /api/mobile/* that must not use session).
 */
const mobileBearerOnly = (req, res, next) => {
  tryAttachJwtUser(req)
    .then((ok) => {
      if (!ok) return res.status(401).json({ error: 'Not authenticated' });
      return next();
    })
    .catch((e) => {
      console.error('mobileBearerOnly error:', e);
      return res.status(500).json({ error: 'Authentication error' });
    });
};

module.exports = {
  ensureAuthenticated,
  ensureAdmin,
  ensureAuthenticatedOrMobile,
  optionalAttachMobileUser,
  signMobileToken,
  mobileBearerOnly,
  getJwtSecret,
};
