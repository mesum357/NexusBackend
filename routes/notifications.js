const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const { ensureAuthenticated } = require('../middleware/auth');

// Get user notifications
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .populate('fromUser', 'username fullName profileImage')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
router.put('/:id/read', ensureAuthenticated, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true },
      { new: true }
    );
    res.json({ notification });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create welcome notification
router.post('/welcome', ensureAuthenticated, async (req, res) => {
  try {
    const existing = await Notification.findOne({ 
      user: req.user._id, 
      type: 'welcome' 
    });

    if (existing) {
      return res.json({ message: 'Welcome notification already exists' });
    }

    // Find an admin user to send the welcome from, or use a system-like ID
    // For simplicity, we can just use the user themselves or a dummy ID if no admin found
    const admin = await User.findOne({ isAdmin: true });
    
    const notification = new Notification({
      user: req.user._id,
      type: 'welcome',
      fromUser: admin ? admin._id : req.user._id,
      message: `Welcome to Pakistan Online, ${req.user.fullName || req.user.username}! We're glad to have you here.`
    });

    await notification.save();
    res.status(201).json({ notification });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
