const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const fixMarketplaceImages = async () => {
  try {
    console.log('Fixing existing marketplace product images...');
    
    const products = await Product.find({
      $or: [
        { images: { $elemMatch: { $regex: '^/uploads/' } } }
      ]
    });
    
    console.log(`Found ${products.length} marketplace products with local image paths`);
    
    for (const product of products) {
      console.log(`\nFixing product: ${product.title}`);
      
      const updates = {};
      
      // Fix product images
      if (product.images && product.images.length > 0) {
        const newImages = product.images.filter(img => !img.startsWith('/uploads/'));
        if (newImages.length !== product.images.length) {
          updates.images = newImages;
          console.log(`Removed ${product.images.length - newImages.length} broken product images`);
        }
      }
      
      // Update the product
      if (Object.keys(updates).length > 0) {
        await Product.findByIdAndUpdate(product._id, updates);
        console.log(`✅ Updated product: ${product.title}`);
      }
    }
    
    console.log('\n=== MARKETPLACE FIX COMPLETED ===');
    console.log('All broken local image paths have been removed from marketplace products.');
    console.log('You can now re-upload images through your app, and they will use Cloudinary.');
    
  } catch (error) {
    console.error('Error fixing marketplace images:', error);
  } finally {
    mongoose.connection.close();
  }
};

fixMarketplaceImages();
