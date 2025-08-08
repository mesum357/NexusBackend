const mongoose = require('mongoose');
const Post = require('../models/Post');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const fixPostImages = async () => {
  try {
    console.log('Fixing existing post images...');
    
    const posts = await Post.find({
      image: { $regex: '^/uploads/' }
    });
    
    console.log(`Found ${posts.length} posts with local image paths`);
    
    for (const post of posts) {
      console.log(`\nFixing post: ${post._id}`);
      console.log(`Content: ${post.content.substring(0, 50)}...`);
      console.log(`Current image: ${post.image}`);
      
      // Remove broken post image path
      await Post.findByIdAndUpdate(post._id, { image: undefined });
      console.log(`✅ Removed broken post image: ${post.image}`);
    }
    
    console.log('\n=== POST IMAGES FIXED ===');
    console.log('All broken local image paths have been removed from posts.');
    console.log('You can now re-upload images through your app, and they will use Cloudinary.');
    
  } catch (error) {
    console.error('Error fixing post images:', error);
  } finally {
    mongoose.connection.close();
  }
};

fixPostImages();
