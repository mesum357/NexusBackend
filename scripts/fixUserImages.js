const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const fixUserImages = async () => {
  try {
    console.log('Fixing existing user profile images...');
    
    const users = await User.find({
      profileImage: { $regex: '^/uploads/' }
    });
    
    console.log(`Found ${users.length} users with local profile images`);
    
    for (const user of users) {
      console.log(`\nFixing user: ${user.username || user.email}`);
      
      // Remove broken profile image path
      await User.findByIdAndUpdate(user._id, { profileImage: '' });
      console.log(`Removed broken profile image: ${user.profileImage}`);
    }
    
    console.log('\n=== USER PROFILE IMAGES FIXED ===');
    
    // Fix post images
    console.log('\nFixing existing post images...');
    
    const posts = await Post.find({
      image: { $regex: '^/uploads/' }
    });
    
    console.log(`Found ${posts.length} posts with local images`);
    
    for (const post of posts) {
      console.log(`\nFixing post: ${post._id}`);
      
      // Remove broken post image path
      await Post.findByIdAndUpdate(post._id, { image: undefined });
      console.log(`Removed broken post image: ${post.image}`);
    }
    
    console.log('\n=== POST IMAGES FIXED ===');
    console.log('All broken local image paths have been removed from users and posts.');
    console.log('You can now re-upload images through your app, and they will use Cloudinary.');
    
  } catch (error) {
    console.error('Error fixing user images:', error);
  } finally {
    mongoose.connection.close();
  }
};

fixUserImages();
