const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pak-nexus';

async function removePlaceholderImages() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find products with placeholder images
    console.log('📦 Finding products with placeholder images...');
    const products = await Product.find({});
    console.log(`\n📊 Found ${products.length} total products\n`);

    let updatedCount = 0;
    let removedCount = 0;

    for (const product of products) {
      if (!product.images || !Array.isArray(product.images) || product.images.length === 0) {
        continue; // Skip products without images
      }

      // Filter out placeholder images
      const validImages = product.images.filter(img => {
        if (!img || typeof img !== 'string') return false;
        
        // Remove picsum.photos placeholders
        if (img.includes('picsum.photos')) {
          console.log(`   ❌ Removing picsum placeholder from "${product.title}": ${img.substring(0, 50)}...`);
          return false;
        }
        
        // Remove via.placeholder placeholders
        if (img.includes('via.placeholder')) {
          console.log(`   ❌ Removing via.placeholder from "${product.title}": ${img.substring(0, 50)}...`);
          return false;
        }
        
        // Keep valid URLs (Cloudinary or other valid URLs)
        if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('//')) {
          return true;
        }
        
        return false;
      });

      // Only update if images were filtered out
      if (validImages.length !== product.images.length) {
        console.log(`\n🔄 Updating product: "${product.title}"`);
        console.log(`   - Original images: ${product.images.length}`);
        console.log(`   - Valid images: ${validImages.length}`);
        console.log(`   - Removed: ${product.images.length - validImages.length} placeholder(s)`);

        // Update the product
        product.images = validImages;
        await product.save();

        updatedCount++;
        removedCount += (product.images.length - validImages.length);
        console.log(`   ✅ Updated successfully\n`);
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`\n📊 Migration Summary:\n`);
    console.log(`   ✅ Products updated: ${updatedCount}`);
    console.log(`   🗑️  Placeholder images removed: ${removedCount}`);
    console.log(`   ✅ Migration completed successfully!\n`);

    // Verify no placeholder images remain
    console.log(`\n🔍 Verifying cleanup...\n`);
    const remainingProducts = await Product.find({
      images: {
        $elemMatch: {
          $regex: /picsum\.photos|via\.placeholder/
        }
      }
    });

    if (remainingProducts.length > 0) {
      console.log(`   ⚠️  WARNING: ${remainingProducts.length} product(s) still have placeholder images:`);
      remainingProducts.forEach(p => {
        console.log(`   - "${p.title}" (${p._id})`);
        p.images.forEach(img => {
          if (img && (img.includes('picsum.photos') || img.includes('via.placeholder'))) {
            console.log(`     - ${img}`);
          }
        });
      });
    } else {
      console.log(`   ✅ All placeholder images have been removed!`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`\n✅ Migration completed!\n`);

  } catch (error) {
    console.error('❌ Error removing placeholder images:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the migration
if (require.main === module) {
  removePlaceholderImages()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { removePlaceholderImages };

