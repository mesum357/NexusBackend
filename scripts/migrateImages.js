const mongoose = require('mongoose');
const Institute = require('../models/Institute');
const Shop = require('../models/Shop');
const { uploadLocalFileToCloudinary, isLocalUploadsPath } = require('../utils/imageMigration');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

/**
 * Migrate institute images to Cloudinary
 */
const migrateInstituteImages = async () => {
  try {
    console.log('Starting institute image migration...');
    
    const institutes = await Institute.find({
      $or: [
        { logo: { $regex: '^/uploads/' } },
        { banner: { $regex: '^/uploads/' } },
        { gallery: { $elemMatch: { $regex: '^/uploads/' } } }
      ]
    });

    console.log(`Found ${institutes.length} institutes with local images`);

    for (const institute of institutes) {
      console.log(`Migrating images for institute: ${institute.name}`);
      
      const updates = {};

      // Migrate logo
      if (institute.logo && isLocalUploadsPath(institute.logo)) {
        const localPath = path.join(__dirname, '..', institute.logo);
        if (fs.existsSync(localPath)) {
          try {
            const cloudinaryUrl = await uploadLocalFileToCloudinary(localPath, 'pak-nexus/institutes');
            updates.logo = cloudinaryUrl;
            console.log(`Migrated logo: ${institute.logo} -> ${cloudinaryUrl}`);
          } catch (error) {
            console.error(`Failed to migrate logo for ${institute.name}:`, error.message);
          }
        }
      }

      // Migrate banner
      if (institute.banner && isLocalUploadsPath(institute.banner)) {
        const localPath = path.join(__dirname, '..', institute.banner);
        if (fs.existsSync(localPath)) {
          try {
            const cloudinaryUrl = await uploadLocalFileToCloudinary(localPath, 'pak-nexus/institutes');
            updates.banner = cloudinaryUrl;
            console.log(`Migrated banner: ${institute.banner} -> ${cloudinaryUrl}`);
          } catch (error) {
            console.error(`Failed to migrate banner for ${institute.name}:`, error.message);
          }
        }
      }

      // Migrate gallery images
      if (institute.gallery && institute.gallery.length > 0) {
        const newGallery = [];
        for (const imagePath of institute.gallery) {
          if (isLocalUploadsPath(imagePath)) {
            const localPath = path.join(__dirname, '..', imagePath);
            if (fs.existsSync(localPath)) {
              try {
                const cloudinaryUrl = await uploadLocalFileToCloudinary(localPath, 'pak-nexus/institutes');
                newGallery.push(cloudinaryUrl);
                console.log(`Migrated gallery image: ${imagePath} -> ${cloudinaryUrl}`);
              } catch (error) {
                console.error(`Failed to migrate gallery image for ${institute.name}:`, error.message);
                newGallery.push(imagePath); // Keep original if migration fails
              }
            } else {
              newGallery.push(imagePath); // Keep original if file doesn't exist
            }
          } else {
            newGallery.push(imagePath); // Keep non-local paths
          }
        }
        updates.gallery = newGallery;
      }

      // Update institute if there are changes
      if (Object.keys(updates).length > 0) {
        await Institute.findByIdAndUpdate(institute._id, updates);
        console.log(`Updated institute: ${institute.name}`);
      }
    }

    console.log('Institute migration completed!');
  } catch (error) {
    console.error('Error during institute migration:', error);
  }
};

/**
 * Migrate shop images to Cloudinary
 */
const migrateShopImages = async () => {
  try {
    console.log('Starting shop image migration...');
    
    const shops = await Shop.find({
      $or: [
        { shopLogo: { $regex: '^/uploads/' } },
        { shopBanner: { $regex: '^/uploads/' } },
        { ownerProfilePhoto: { $regex: '^/uploads/' } }
      ]
    });

    console.log(`Found ${shops.length} shops with local images`);

    for (const shop of shops) {
      console.log(`Migrating images for shop: ${shop.shopName}`);
      
      const updates = {};

      // Migrate shop logo
      if (shop.shopLogo && isLocalUploadsPath(shop.shopLogo)) {
        const localPath = path.join(__dirname, '..', shop.shopLogo);
        if (fs.existsSync(localPath)) {
          try {
            const cloudinaryUrl = await uploadLocalFileToCloudinary(localPath, 'pak-nexus/shops');
            updates.shopLogo = cloudinaryUrl;
            console.log(`Migrated shop logo: ${shop.shopLogo} -> ${cloudinaryUrl}`);
          } catch (error) {
            console.error(`Failed to migrate shop logo for ${shop.shopName}:`, error.message);
          }
        }
      }

      // Migrate shop banner
      if (shop.shopBanner && isLocalUploadsPath(shop.shopBanner)) {
        const localPath = path.join(__dirname, '..', shop.shopBanner);
        if (fs.existsSync(localPath)) {
          try {
            const cloudinaryUrl = await uploadLocalFileToCloudinary(localPath, 'pak-nexus/shops');
            updates.shopBanner = cloudinaryUrl;
            console.log(`Migrated shop banner: ${shop.shopBanner} -> ${cloudinaryUrl}`);
          } catch (error) {
            console.error(`Failed to migrate shop banner for ${shop.shopName}:`, error.message);
          }
        }
      }

      // Migrate owner profile photo
      if (shop.ownerProfilePhoto && isLocalUploadsPath(shop.ownerProfilePhoto)) {
        const localPath = path.join(__dirname, '..', shop.ownerProfilePhoto);
        if (fs.existsSync(localPath)) {
          try {
            const cloudinaryUrl = await uploadLocalFileToCloudinary(localPath, 'pak-nexus/profiles');
            updates.ownerProfilePhoto = cloudinaryUrl;
            console.log(`Migrated owner profile photo: ${shop.ownerProfilePhoto} -> ${cloudinaryUrl}`);
          } catch (error) {
            console.error(`Failed to migrate owner profile photo for ${shop.shopName}:`, error.message);
          }
        }
      }

      // Update shop if there are changes
      if (Object.keys(updates).length > 0) {
        await Shop.findByIdAndUpdate(shop._id, updates);
        console.log(`Updated shop: ${shop.shopName}`);
      }
    }

    console.log('Shop migration completed!');
  } catch (error) {
    console.error('Error during shop migration:', error);
  }
};

// Run migrations
const runMigrations = async () => {
  try {
    console.log('Starting image migration to Cloudinary...');
    
    await migrateInstituteImages();
    await migrateShopImages();
    
    console.log('All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

// Run if this file is executed directly
if (require.main === module) {
  runMigrations();
}

module.exports = { migrateInstituteImages, migrateShopImages };
