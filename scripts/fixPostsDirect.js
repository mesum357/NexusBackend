const mongoose = require('mongoose');
const Post = require('../models/Post');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const fixPostsDirect = async () => {
  try {
    console.log('Fixing posts with local images directly...');
    
    // Find all posts with local image paths
    const posts = await Post.find({
      image: { $regex: '^/uploads/' }
    });
    
    console.log(`Found ${posts.length} posts with local images`);
    
    // Update all posts at once
    const result = await Post.updateMany(
      { image: { $regex: '^/uploads/' } },
      { $unset: { image: "" } }
    );
    
    console.log(`Updated ${result.modifiedCount} posts`);
    console.log('✅ All local image paths have been removed from posts');
    
    // Verify the fix
    const remainingPosts = await Post.find({
      image: { $regex: '^/uploads/' }
    });
    
    console.log(`Posts still with local images: ${remainingPosts.length}`);
    
    if (remainingPosts.length === 0) {
      console.log('🎉 All posts are now clean!');
    } else {
      console.log('⚠️  Some posts still have local images');
      remainingPosts.forEach(p => {
        console.log(`  - ${p._id}: ${p.image}`);
      });
    }
    
  } catch (error) {
    console.error('Error fixing posts:', error);
  } finally {
    mongoose.connection.close();
  }
};

fixPostsDirect();
