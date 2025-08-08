const mongoose = require('mongoose');
const Shop = require('../models/Shop');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const fixShopImages = async () => {
  try {
    console.log('Fixing existing shop images...');
    
    const shops = await Shop.find({
      $or: [
        { shopLogo: { $regex: '^/uploads/' } },
        { shopBanner: { $regex: '^/uploads/' } },
        { ownerProfilePhoto: { $regex: '^/uploads/' } },
        { 'products.image': { $regex: '^/uploads/' } },
        { 'gallery': { $elemMatch: { $regex: '^/uploads/' } } }
      ]
    });
    
    console.log(`Found ${shops.length} shops with local image paths`);
    
    for (const shop of shops) {
      console.log(`\nFixing shop: ${shop.shopName}`);
      
      const updates = {};
      
      // Fix shop logo
      if (shop.shopLogo && shop.shopLogo.startsWith('/uploads/')) {
        updates.shopLogo = '';
        console.log(`Removed broken shop logo: ${shop.shopLogo}`);
      }
      
      // Fix shop banner
      if (shop.shopBanner && shop.shopBanner.startsWith('/uploads/')) {
        updates.shopBanner = '';
        console.log(`Removed broken shop banner: ${shop.shopBanner}`);
      }
      
      // Fix owner profile photo
      if (shop.ownerProfilePhoto && shop.ownerProfilePhoto.startsWith('/uploads/')) {
        updates.ownerProfilePhoto = '';
        console.log(`Removed broken owner profile photo: ${shop.ownerProfilePhoto}`);
      }
      
      // Fix gallery images
      if (shop.gallery && shop.gallery.length > 0) {
        const newGallery = shop.gallery.filter(img => !img.startsWith('/uploads/'));
        if (newGallery.length !== shop.gallery.length) {
          updates.gallery = newGallery;
          console.log(`Removed ${shop.gallery.length - newGallery.length} broken gallery images`);
        }
      }
      
      // Fix product images
      if (shop.products && shop.products.length > 0) {
        let hasProductUpdates = false;
        shop.products.forEach((product, index) => {
          if (product.image && product.image.startsWith('/uploads/')) {
            shop.products[index].image = '';
            hasProductUpdates = true;
            console.log(`Removed broken product image: ${product.image}`);
          }
        });
        if (hasProductUpdates) {
          updates.products = shop.products;
        }
      }
      
      // Update the shop
      if (Object.keys(updates).length > 0) {
        await Shop.findByIdAndUpdate(shop._id, updates);
        console.log(`✅ Updated shop: ${shop.shopName}`);
      }
    }
    
    console.log('\n=== SHOP FIX COMPLETED ===');
    console.log('All broken local image paths have been removed from shops.');
    console.log('You can now re-upload images through your app, and they will use Cloudinary.');
    
  } catch (error) {
    console.error('Error fixing shop images:', error);
  } finally {
    mongoose.connection.close();
  }
};

fixShopImages();
