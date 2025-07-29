const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { ensureAuthenticated } = require('../middleware/auth');

// Follow a user
router.post('/:userId', ensureAuthenticated, async (req, res) => {
  try {
    const followerId = req.user._id;
    const userIdToFollow = req.params.userId;

    if (!userIdToFollow) {
      return res.status(400).json({ error: 'User ID to follow is required' });
    }

    // Check if user is trying to follow themselves
    if (followerId.toString() === userIdToFollow) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    // Check if user to follow exists
    const userToFollow = await User.findById(userIdToFollow);
    if (!userToFollow) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already following
    const currentUser = await User.findById(followerId);
    if (!currentUser) {
      return res.status(404).json({ error: 'Current user not found' });
    }
    
    if (currentUser.following && currentUser.following.includes(userIdToFollow)) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    // Add to following and followers
    await User.findByIdAndUpdate(followerId, {
      $addToSet: { following: userIdToFollow }
    });

    await User.findByIdAndUpdate(userIdToFollow, {
      $addToSet: { followers: followerId }
    });

    res.json({ success: true, message: 'Successfully followed user' });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// Unfollow a user
router.delete('/:userId', ensureAuthenticated, async (req, res) => {
  try {
    const followerId = req.user._id;
    const userIdToUnfollow = req.params.userId;

    if (!userIdToUnfollow) {
      return res.status(400).json({ error: 'User ID to unfollow is required' });
    }

    // Remove from following and followers
    await User.findByIdAndUpdate(followerId, {
      $pull: { following: userIdToUnfollow }
    });

    await User.findByIdAndUpdate(userIdToUnfollow, {
      $pull: { followers: followerId }
    });

    res.json({ success: true, message: 'Successfully unfollowed user' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// Get followers of a user
router.get('/followers/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const user = await User.findById(userId).populate('followers', 'username fullName email profileImage city');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ followers: user.followers || [] });
  } catch (error) {
    console.error('Error fetching followers:', error);
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

// Get users that a user is following
router.get('/following/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const user = await User.findById(userId).populate('following', 'username fullName email profileImage city');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ following: user.following || [] });
  } catch (error) {
    console.error('Error fetching following:', error);
    res.status(500).json({ error: 'Failed to fetch following' });
  }
});

// Get suggested users to follow
router.get('/suggestions', ensureAuthenticated, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const currentUser = await User.findById(currentUserId);
    
    if (!currentUser) {
      return res.status(404).json({ error: 'Current user not found' });
    }
    
    // Get users that the current user is following
    const followingIds = currentUser.following || [];
    
    // Get users that are not being followed by current user (excluding current user)
    const suggestedUsers = await User.find({
      _id: { 
        $nin: [...followingIds, currentUserId] 
      }
    })
    .select('username fullName email profileImage city')
    .limit(20) // Get more users for rotation
    .sort({ createdAt: -1 });

    // Add follower count to each user
    const usersWithFollowerCount = await Promise.all(
      suggestedUsers.map(async (user) => {
        const followerCount = await User.countDocuments({ following: user._id });
        return {
          _id: user._id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          profileImage: user.profileImage,
          city: user.city,
          followerCount
        };
      })
    );

    res.json({ suggestions: usersWithFollowerCount });
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
});

// Check if current user is following a specific user
router.get('/check/:userId', ensureAuthenticated, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const userIdToCheck = req.params.userId;
    
    if (!userIdToCheck) {
      return res.status(400).json({ error: 'User ID to check is required' });
    }
    
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ error: 'Current user not found' });
    }
    
    const isFollowing = currentUser.following && currentUser.following.includes(userIdToCheck);
    
    res.json({ isFollowing });
  } catch (error) {
    console.error('Error checking follow status:', error);
    res.status(500).json({ error: 'Failed to check follow status' });
  }
});

module.exports = router; 