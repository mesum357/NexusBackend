const mongoose = require('mongoose');
const Shop = require('./models/Shop');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/nexus', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testProductImages() {
  try {
    console.log('🔍 Testing product images in database...');
    
    // Find all shops with products
    const shops = await Shop.find({ 'products.0': { $exists: true } });
    console.log(`📦 Found ${shops.length} shops with products`);
    
    shops.forEach((shop, shopIndex) => {
      console.log(`\n🏪 Shop ${shopIndex + 1}: "${shop.shopName}" (${shop.products.length} products)`);
      console.log(`   - Approval Status: ${shop.approvalStatus}`);
      console.log(`   - Agent ID: ${shop.agentId}`);
      
      shop.products.forEach((product, productIndex) => {
        console.log(`   📦 Product ${productIndex + 1}: "${product.name}"`);
        console.log(`     - Image: ${product.image || 'NOT SET'}`);
        console.log(`     - Image Preview: ${product.imagePreview || 'NOT SET'}`);
        console.log(`     - Image Previews: ${product.imagePreviews ? JSON.stringify(product.imagePreviews) : 'NOT SET'}`);
        
        // Check if image is Cloudinary URL
        if (product.image && product.image.startsWith('https://res.cloudinary.com')) {
          console.log(`     ✅ Has Cloudinary image: ${product.image}`);
        } else if (product.image && product.image.startsWith('blob:')) {
          console.log(`     ⚠️ Has blob URL: ${product.image}`);
        } else if (product.image) {
          console.log(`     ℹ️ Has other URL: ${product.image}`);
        } else {
          console.log(`     ❌ No image set`);
        }
      });
    });
    
    // Check for shops with placeholder images
    const shopsWithPlaceholders = shops.filter(shop => 
      shop.products.some(product => 
        product.image && product.image.includes('picsum.photos')
      )
    );
    
    console.log(`\n⚠️ Found ${shopsWithPlaceholders.length} shops with placeholder images`);
    
    if (shopsWithPlaceholders.length > 0) {
      shopsWithPlaceholders.forEach((shop, index) => {
        console.log(`\n🏪 Shop with placeholders ${index + 1}: "${shop.shopName}"`);
        shop.products.forEach((product, productIndex) => {
          if (product.image && product.image.includes('picsum.photos')) {
            console.log(`   📦 Product "${product.name}" has placeholder: ${product.image}`);
          }
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing product images:', error);
  } finally {
    mongoose.connection.close();
  }
}

testProductImages();
