const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const { ensureAuthenticatedOrMobile } = require('../middleware/auth');
const { notifyUser } = require('../services/notifyUser');

/** Types that belong to store scope (including legacy rows without `scope`). */
const STORE_TYPES = [
  'order_placed',
  'order_status_update',
  'shop_pending',
  'shop_approved',
  'shop_rejected',
  'product_approved',
  'product_rejected',
  'payment_verified',
  'payment_rejected',
  'payment_pending',
];

const EDUCATION_TYPES = [
  'institute_pending',
  'institute_approved',
  'institute_rejected',
  'student_application_received',
  'student_application_status',
];

const HEALTH_TYPES = [
  'hospital_pending',
  'hospital_approved',
  'hospital_rejected',
  'patient_application_received',
  'patient_application_status',
];

function buildScopeQuery(scope, userId) {
  const base = { user: userId };
  if (!scope || scope === 'all') {
    return base;
  }
  if (scope === 'store') {
    return {
      ...base,
      $or: [
        { scope: 'store' },
        {
          type: { $in: STORE_TYPES },
          $or: [{ scope: { $exists: false } }, { scope: null }],
        },
      ],
    };
  }
  if (scope === 'education') {
    return {
      ...base,
      $or: [
        { scope: 'education' },
        {
          type: { $in: EDUCATION_TYPES },
          $or: [{ scope: { $exists: false } }, { scope: null }],
        },
      ],
    };
  }
  if (scope === 'health') {
    return {
      ...base,
      $or: [
        { scope: 'health' },
        {
          type: { $in: HEALTH_TYPES },
          $or: [{ scope: { $exists: false } }, { scope: null }],
        },
      ],
    };
  }
  return base;
}

// Get user notifications (session or Bearer JWT)
router.get('/', ensureAuthenticatedOrMobile, async (req, res) => {
  try {
    const scope = typeof req.query.scope === 'string' ? req.query.scope : '';
    const query = buildScopeQuery(scope, req.user._id);
    const notifications = await Notification.find(query)
      .populate('fromUser', 'username fullName profileImage')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
router.put('/:id/read', ensureAuthenticatedOrMobile, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true },
    ).populate('fromUser', 'username fullName profileImage');
    res.json({ notification });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create welcome notification
router.post('/welcome', ensureAuthenticatedOrMobile, async (req, res) => {
  try {
    const existing = await Notification.findOne({
      user: req.user._id,
      type: 'welcome',
    });

    if (existing) {
      return res.json({ message: 'Welcome notification already exists' });
    }

    const admin = await User.findOne({ isAdmin: true });

    const notification = await notifyUser({
      userId: req.user._id,
      type: 'welcome',
      fromUser: admin ? admin._id : req.user._id,
      message: `Welcome to Pakistan Online, ${req.user.fullName || req.user.username}! We're glad to have you here.`,
      scope: 'system',
    });
    res.status(201).json({ notification });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
