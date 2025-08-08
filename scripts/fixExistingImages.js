const mongoose = require('mongoose');
const Institute = require('../models/Institute');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const fixExistingImages = async () => {
  try {
    console.log('Fixing existing institute images...');
    
    const institutes = await Institute.find({
      $or: [
        { logo: { $regex: '^/uploads/' } },
        { banner: { $regex: '^/uploads/' } }
      ]
    });
    
    console.log(`Found ${institutes.length} institutes with local image paths`);
    
    for (const institute of institutes) {
      console.log(`\nFixing institute: ${institute.name}`);
      
      const updates = {};
      
      // Replace local logo with placeholder or remove
      if (institute.logo && institute.logo.startsWith('/uploads/')) {
        // Option 1: Remove the broken path
        updates.logo = '';
        console.log(`Removed broken logo path: ${institute.logo}`);
        
        // Option 2: Use a placeholder image (uncomment if you want this)
        // updates.logo = 'https://via.placeholder.com/300x200?text=No+Logo';
        // console.log(`Replaced logo with placeholder`);
      }
      
      // Replace local banner with placeholder or remove
      if (institute.banner && institute.banner.startsWith('/uploads/')) {
        // Option 1: Remove the broken path
        updates.banner = '';
        console.log(`Removed broken banner path: ${institute.banner}`);
        
        // Option 2: Use a placeholder image (uncomment if you want this)
        // updates.banner = 'https://via.placeholder.com/800x400?text=No+Banner';
        // console.log(`Replaced banner with placeholder`);
      }
      
      // Update the institute
      if (Object.keys(updates).length > 0) {
        await Institute.findByIdAndUpdate(institute._id, updates);
        console.log(`✅ Updated institute: ${institute.name}`);
      }
    }
    
    console.log('\n=== FIX COMPLETED ===');
    console.log('All broken local image paths have been removed.');
    console.log('You can now re-upload images through your app, and they will use Cloudinary.');
    
  } catch (error) {
    console.error('Error fixing images:', error);
  } finally {
    mongoose.connection.close();
  }
};

fixExistingImages();
