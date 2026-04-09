const express = require('express');
const passport = require('passport');
const User = require('../models/User');
const Order = require('../models/Order');
const { signMobileToken, mobileBearerOnly } = require('../middleware/auth');

const router = express.Router();

function publicUser(u) {
  if (!u) return null;
  const o = typeof u.toObject === 'function' ? u.toObject() : u;
  return {
    id: String(o._id),
    email: o.email,
    username: o.username,
    fullName: o.fullName,
    mobile: o.mobile,
    profileImage: o.profileImage,
    city: o.city,
    bio: o.bio,
    website: o.website,
  };
}

router.post('/auth/register', (req, res) => {
  const { password, confirmPassword, email, fullName, mobile } = req.body || {};

  if (!password || !confirmPassword || !email || !fullName || !mobile) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  const userData = {
    username: email,
    email,
    fullName,
    mobile,
    verified: true,
  };

  User.register(userData, password, (err, user) => {
    if (err) {
      const msg =
        err.name === 'UserExistsError' ? 'User already exists with this email' : 'Registration failed';
      return res.status(400).json({ error: msg });
    }
    const token = signMobileToken(user);
    return res.status(201).json({
      token,
      user: publicUser(user),
    });
  });
});

router.post('/auth/login', (req, res, next) => {
  const email = req.body?.email || req.body?.username;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  req.body.username = email;

  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (user.isFrozen) {
      return res.status(403).json({ error: 'This account is frozen. Please contact support.' });
    }
    const token = signMobileToken(user);
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: publicUser(user),
    });
  })(req, res, next);
});

router.get('/auth/me', mobileBearerOnly, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: publicUser(user) });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load profile' });
  }
});

router.get('/profile/stats', mobileBearerOnly, async (req, res) => {
  try {
    const userId = req.user._id;
    const orders = await Order.countDocuments({ user: userId });
    return res.json({
      orders,
      courses: 0,
      points: 0,
    });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load stats' });
  }
});

/** Register or replace Expo push token for the current user (one device). */
router.put('/me/push-token', mobileBearerOnly, async (req, res) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (!token) {
      return res.status(400).json({ error: 'token is required' });
    }
    await User.updateOne(
      { _id: req.user._id },
      { $addToSet: { expoPushTokens: token } },
    );
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to save push token' });
  }
});

module.exports = router;
