const express = require('express');
const router = express.Router();
const Friend = require('../models/Friend');
const User = require('../models/User');
const { ensureAuthenticated } = require('../middleware/auth');

// Get all friends data (friends, suggestions, requests)
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get accepted friends
    const friends = await Friend.find({
      $or: [
        { user: userId, status: 'accepted' },
        { friend: userId, status: 'accepted' }
      ]
    }).populate('user', 'username fullName email profileImage city')
      .populate('friend', 'username fullName email profileImage city');

    // Get pending friend requests (sent to current user)
    const requests = await Friend.find({
      friend: userId,
      status: 'pending'
    }).populate('user', 'username fullName email profileImage city');

    // Get pending friend requests (sent by current user)
    const sentRequests = await Friend.find({
      user: userId,
      status: 'pending'
    }).populate('friend', 'username fullName email profileImage city');

    // Get all users for suggestions (excluding current user and existing friends/requests)
    const allUsers = await User.find({ _id: { $ne: userId } });
    
    // Get all friend relationships for current user
    const allFriendRelationships = await Friend.find({
      $or: [
        { user: userId },
        { friend: userId }
      ]
    });

    // Get IDs of users who are already friends or have pending requests
    const excludedUserIds = allFriendRelationships.map(rel => 
      rel.user.toString() === userId.toString() ? rel.friend : rel.user
    );

    // Filter out users who are already friends or have pending requests
    const suggestedUsers = allUsers.filter(user => 
      !excludedUserIds.includes(user._id.toString())
    );

    // Format friends data
    const formattedFriends = friends.map(friend => {
      const friendUser = friend.user._id.toString() === userId.toString() 
        ? friend.friend 
        : friend.user;
      
      return {
        id: friend._id,
        name: friendUser.fullName || friendUser.username,
        email: friendUser.email,
        avatar: friendUser.profileImage,
        mutualFriends: Math.floor(Math.random() * 20) + 1, // Mock data for now
        isOnline: Math.random() > 0.5,
        lastActive: Math.random() > 0.5 ? "Active now" : "2h ago"
      };
    });

    // Format requests data
    const formattedRequests = requests.map(request => ({
      id: request._id,
      name: request.user.fullName || request.user.username,
      email: request.user.email,
      avatar: request.user.profileImage,
      mutualFriends: Math.floor(Math.random() * 10) + 1, // Mock data for now
      time: `${Math.floor(Math.random() * 7) + 1}d ago`
    }));

    // Format suggestions data
    const formattedSuggestions = suggestedUsers.slice(0, 10).map(user => ({
      id: user._id,
      name: user.fullName || user.username,
      email: user.email,
      avatar: user.profileImage,
      mutualFriends: Math.floor(Math.random() * 15) + 1, // Mock data for now
      reason: "People you may know"
    }));

    res.json({
      friends: formattedFriends,
      requests: formattedRequests,
      suggestions: formattedSuggestions,
      sentRequests: sentRequests.map(req => req.friend._id.toString())
    });
  } catch (error) {
    console.error('Error fetching friends data:', error);
    res.status(500).json({ error: 'Failed to fetch friends data' });
  }
});

// Send friend request
router.post('/request/:userId', ensureAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (userId === currentUserId.toString()) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    // Check if friend relationship already exists
    const existingFriend = await Friend.findOne({
      $or: [
        { user: currentUserId, friend: userId },
        { user: userId, friend: currentUserId }
      ]
    });

    if (existingFriend) {
      return res.status(400).json({ error: 'Friend relationship already exists' });
    }

    // Create new friend request
    const friendRequest = new Friend({
      user: currentUserId,
      friend: userId,
      requestedBy: currentUserId,
      status: 'pending'
    });

    await friendRequest.save();
    res.json({ message: 'Friend request sent successfully' });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// Accept friend request
router.post('/accept/:requestId', ensureAuthenticated, async (req, res) => {
  try {
    const { requestId } = req.params;
    const currentUserId = req.user._id;

    const friendRequest = await Friend.findOne({
      _id: requestId,
      friend: currentUserId,
      status: 'pending'
    });

    if (!friendRequest) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    friendRequest.status = 'accepted';
    friendRequest.acceptedAt = new Date();
    await friendRequest.save();

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

// Decline friend request
router.post('/decline/:requestId', ensureAuthenticated, async (req, res) => {
  try {
    const { requestId } = req.params;
    const currentUserId = req.user._id;

    const friendRequest = await Friend.findOne({
      _id: requestId,
      friend: currentUserId,
      status: 'pending'
    });

    if (!friendRequest) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    friendRequest.status = 'rejected';
    friendRequest.rejectedAt = new Date();
    await friendRequest.save();

    res.json({ message: 'Friend request declined' });
  } catch (error) {
    console.error('Error declining friend request:', error);
    res.status(500).json({ error: 'Failed to decline friend request' });
  }
});

// Remove friend
router.delete('/:friendId', ensureAuthenticated, async (req, res) => {
  try {
    const { friendId } = req.params;
    const currentUserId = req.user._id;

    const friendRelationship = await Friend.findOne({
      $or: [
        { user: currentUserId, friend: friendId },
        { user: friendId, friend: currentUserId }
      ]
    });

    if (!friendRelationship) {
      return res.status(404).json({ error: 'Friend relationship not found' });
    }

    await Friend.findByIdAndDelete(friendRelationship._id);
    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

module.exports = router; 