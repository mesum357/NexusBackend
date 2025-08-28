// Test script to check shop product images in database
const mongoose = require('mongoose');
const Shop = require('./models/Shop');

// Connect to MongoDB (you'll need to set your connection string)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/your_database_name';

async function testShopImages() {
  try {
    console.log('🔍 Testing Shop Product Images...');
    console.log('=====================================');
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get all shops
    const shops = await Shop.find({}).limit(5); // Limit to 5 shops for testing
    console.log(`📊 Found ${shops.length} shops in database`);
    
    shops.forEach((shop, shopIndex) => {
      console.log(`\n🏪 Shop ${shopIndex + 1}: "${shop.shopName}" (ID: ${shop._id})`);
      console.log(`   - Approval Status: ${shop.approvalStatus}`);
      console.log(`   - Products Count: ${shop.products ? shop.products.length : 0}`);
      
      if (shop.products && shop.products.length > 0) {
        shop.products.forEach((product, productIndex) => {
          console.log(`   📦 Product ${productIndex + 1}: "${product.name}"`);
          console.log(`     - Image: ${product.image || 'NOT SET'}`);
          console.log(`     - Image Preview: ${product.imagePreview || 'NOT SET'}`);
          console.log(`     - Image Previews: ${product.imagePreviews ? JSON.stringify(product.imagePreviews) : 'NOT SET'}`);
          
          // Check if image is Picsum
          if (product.image && product.image.includes('picsum.photos')) {
            console.log(`     ⚠️  WARNING: Product has Picsum image!`);
          } else if (product.image && product.image.startsWith('https://res.cloudinary.com')) {
            console.log(`     ✅ Product has Cloudinary image`);
          } else if (product.image) {
            console.log(`     ❓ Product has unknown image type: ${product.image}`);
          } else {
            console.log(`     🔄 Product has no image`);
          }
        });
      } else {
        console.log(`   📦 No products in this shop`);
      }
    });
    
    console.log('\n🔍 Checking specific shop by ID...');
    
    // If you have a specific shop ID, test it here
    // const specificShop = await Shop.findById('your_shop_id_here');
    // if (specificShop) {
    //   console.log('Specific shop found:', specificShop.shopName);
    //   console.log('Products:', specificShop.products);
    // }
    
  } catch (error) {
    console.error('❌ Error testing shop images:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testShopImages();
