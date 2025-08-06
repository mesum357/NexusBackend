const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const Notification = require('../models/Notification');

const { ensureAuthenticated } = require('../middleware/auth');

// Multer config for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Create a post
router.post('/post', ensureAuthenticated, upload.single('image'), async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });
    const post = new Post({
      user: req.user._id,
      content,
      image: req.file ? `/uploads/${req.file.filename}` : undefined
    });
    await post.save();
    res.status(201).json({ post });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all posts (with user and comments populated, newest first)
router.get('/posts', async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate('user', 'username fullName email profileImage city')
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
          select: 'username fullName email profileImage city'
        }
      });
    res.json({ posts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single post by ID
router.get('/post/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'username fullName email profileImage city')
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
          select: 'username fullName email profileImage city'
        }
      });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json({ post });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Like/unlike a post
router.post('/post/:id/like', ensureAuthenticated, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const userId = req.user._id;
    const index = post.likes.indexOf(userId);
    let liked = false;
    if (index === -1) {
      post.likes.push(userId);
      liked = true;
      // Notify post owner (not self)
      if (String(post.user) !== String(userId)) {
        await Notification.create({
          user: post.user,
          type: 'like',
          fromUser: userId,
          post: post._id,
          message: 'liked your post',
        });
      }
    } else {
      post.likes.splice(index, 1);
    }
    await post.save();
    res.json({ likes: post.likes.length, liked });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a comment (or reply to a comment)
router.post('/post/:id/comment', ensureAuthenticated, async (req, res) => {
  try {
    const { content, parentId } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const comment = new Comment({
      post: post._id,
      user: req.user._id,
      content,
      parent: parentId || null
    });
    await comment.save();
    if (parentId) {
      // Nested reply - notify parent comment owner (not self)
      const parentComment = await Comment.findById(parentId);
      if (parentComment && String(parentComment.user) !== String(req.user._id)) {
        await Notification.create({
          user: parentComment.user,
          type: 'reply',
          fromUser: req.user._id,
          post: post._id,
          comment: parentComment._id,
          message: 'replied to your comment',
        });
      }
    } else {
      // Top-level comment
      post.comments.push(comment._id);
      await post.save();
      // Notify post owner (not self)
      if (String(post.user) !== String(req.user._id)) {
        await Notification.create({
          user: post.user,
          type: 'comment',
          fromUser: req.user._id,
          post: post._id,
          comment: comment._id,
          message: 'commented on your post',
        });
      }
    }
    res.status(201).json({ comment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Like/unlike a comment
router.post('/comment/:id/like', ensureAuthenticated, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    const userId = req.user._id;
    const index = comment.likes.indexOf(userId);
    let liked = false;
    if (index === -1) {
      comment.likes.push(userId);
      liked = true;
      // Notify comment owner (not self)
      if (String(comment.user) !== String(userId)) {
        await Notification.create({
          user: comment.user,
          type: 'like',
          fromUser: userId,
          comment: comment._id,
          message: 'liked your comment',
        });
      }
    } else {
      comment.likes.splice(index, 1);
    }
    await comment.save();
    res.json({ likes: comment.likes.length, liked });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get comments for a post (with nested replies)
router.get('/post/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.id })
      .populate('user', 'username fullName email profileImage city')
      .sort({ createdAt: 1 });
    res.json({ comments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a post (owner only)
router.delete('/post/:id', ensureAuthenticated, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
    if (!post) return res.status(404).json({ error: 'Post not found' })
    if (!req.user || String(post.user) !== String(req.user._id)) {
      return res.status(403).json({ error: 'You are not authorized to delete this post' })
    }
    // Delete all comments for this post
    await Comment.deleteMany({ post: post._id })
    await post.deleteOne()
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Delete a comment (owner only)
router.delete('/comment/:id', ensureAuthenticated, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id)
    if (!comment) return res.status(404).json({ error: 'Comment not found' })
    if (!req.user || String(comment.user) !== String(req.user._id)) {
      return res.status(403).json({ error: 'You are not authorized to delete this comment' })
    }
    await comment.deleteOne()
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Edit a post (owner only)
router.put('/post/:id', ensureAuthenticated, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
    if (!post) return res.status(404).json({ error: 'Post not found' })
    if (!req.user || String(post.user) !== String(req.user._id)) {
      return res.status(403).json({ error: 'You are not authorized to edit this post' })
    }
    
    const { content } = req.body
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' })
    }
    
    post.content = content.trim()
    await post.save()
    
    res.json({ success: true, post })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Edit a comment (owner only)
router.put('/comment/:id', ensureAuthenticated, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id)
    if (!comment) return res.status(404).json({ error: 'Comment not found' })
    if (!req.user || String(comment.user) !== String(req.user._id)) {
      return res.status(403).json({ error: 'You are not authorized to edit this comment' })
    }
    
    const { content } = req.body
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' })
    }
    
    comment.content = content.trim()
    await comment.save()
    
    res.json({ success: true, comment })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get notifications for current user
router.get('/notifications', ensureAuthenticated, async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('fromUser', 'username fullName email profileImage city')
      .populate('post', 'content')
      .populate('comment', 'content');
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark notifications as read
router.post('/notifications/read', ensureAuthenticated, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get trending hashtags
router.get('/trending-hashtags', async (req, res) => {
  try {
    // Extract hashtags from posts and count their occurrences
    const posts = await Post.find({}, 'content');
    
    const hashtagCounts = {};
    const hashtagRegex = /#(\w+)/g;
    
    posts.forEach(post => {
      let match;
      while ((match = hashtagRegex.exec(post.content)) !== null) {
        const hashtag = match[1].toLowerCase();
        hashtagCounts[hashtag] = (hashtagCounts[hashtag] || 0) + 1;
      }
    });
    
    // Sort by count and get top hashtags
    const sortedHashtags = Object.entries(hashtagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([hashtag]) => `#${hashtag}`);
    
    // If no hashtags found, return default ones
    const defaultHashtags = [
      "#PakistanOnline",
      "#SmallBusiness", 
      "#Education",
      "#TechStartups",
      "#Karachi",
      "#Lahore"
    ];
    
    res.json({ 
      hashtags: sortedHashtags.length > 0 ? sortedHashtags : defaultHashtags 
    });
  } catch (error) {
    console.error('Error fetching trending hashtags:', error);
    res.status(500).json({ error: 'Failed to fetch trending hashtags' });
  }
});

// Get user by username
router.get('/user/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username }).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Error fetching user by username:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user profile
router.put('/profile/update', ensureAuthenticated, upload.single('profileImage'), async (req, res) => {
  try {
    const userId = req.user._id;
    const { fullName, email, mobile, city, bio, website, currentPassword, newPassword } = req.body;
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Handle password change if provided
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change password' });
      }
      
      // Verify current password
      const isPasswordValid = await user.authenticate(currentPassword);
      if (!isPasswordValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      
      // Set new password
      user.password = newPassword;
    }

    // Handle profile image upload
    if (req.file) {
      user.profileImage = `/uploads/${req.file.filename}`;
    }

    // Update other fields
    if (fullName !== undefined) user.fullName = fullName;
    if (email !== undefined) user.email = email;
    if (mobile !== undefined) user.mobile = mobile;
    if (city !== undefined) user.city = city;
    if (bio !== undefined) user.bio = bio;
    if (website !== undefined) user.website = website;

    // Save the user
    await user.save();

    // Return updated user data (without password)
    const updatedUser = await User.findById(userId).select('-password');
    
    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router; 