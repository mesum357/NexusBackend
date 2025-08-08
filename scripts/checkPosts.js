const mongoose = require('mongoose');
const Post = require('../models/Post');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const checkPosts = async () => {
  try {
    console.log('Checking posts in database...');
    
    const posts = await Post.find({});
    console.log(`Found ${posts.length} total posts`);
    
    const postsWithImages = posts.filter(p => p.image);
    console.log(`Posts with images: ${postsWithImages.length}`);
    
    const postsWithLocalImages = posts.filter(p => p.image && p.image.startsWith('/uploads/'));
    console.log(`Posts with local images: ${postsWithLocalImages.length}`);
    
    const postsWithCloudinaryImages = posts.filter(p => p.image && p.image.includes('cloudinary'));
    console.log(`Posts with Cloudinary images: ${postsWithCloudinaryImages.length}`);
    
    const postsWithNoImages = posts.filter(p => !p.image);
    console.log(`Posts with no images: ${postsWithNoImages.length}`);
    
    if (postsWithLocalImages.length > 0) {
      console.log('\nPosts with local images:');
      postsWithLocalImages.forEach(p => {
        console.log(`  - ${p._id}: ${p.image}`);
      });
    }
    
    if (postsWithCloudinaryImages.length > 0) {
      console.log('\nPosts with Cloudinary images:');
      postsWithCloudinaryImages.forEach(p => {
        console.log(`  - ${p._id}: ${p.image}`);
      });
    }
    
  } catch (error) {
    console.error('Error checking posts:', error);
  } finally {
    mongoose.connection.close();
  }
};

checkPosts();
