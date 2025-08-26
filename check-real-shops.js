const mongoose = require('mongoose');
const Shop = require('./models/Shop');
const PaymentRequest = require('./models/PaymentRequest');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/nexus', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function checkRealShops() {
  try {
    console.log('🔍 Checking for real shops created through the wizard...');
    
    // Find all shops
    const allShops = await Shop.find({});
    console.log(`📦 Found ${allShops.length} total shops`);
    
    if (allShops.length > 0) {
      allShops.forEach((shop, index) => {
        console.log(`\n🏪 Shop ${index + 1}: "${shop.shopName}"`);
        console.log(`   - ID: ${shop._id}`);
        console.log(`   - Approval Status: ${shop.approvalStatus}`);
        console.log(`   - Agent ID: ${shop.agentId}`);
        console.log(`   - Products Count: ${shop.products ? shop.products.length : 0}`);
        console.log(`   - Created At: ${shop.createdAt}`);
        
        if (shop.products && shop.products.length > 0) {
          console.log(`   📦 Products:`);
          shop.products.forEach((product, productIndex) => {
            console.log(`     ${productIndex + 1}. "${product.name}"`);
            console.log(`        - Image: ${product.image || 'NOT SET'}`);
            console.log(`        - Image Preview: ${product.imagePreview || 'NOT SET'}`);
            console.log(`        - Image Previews: ${product.imagePreviews ? JSON.stringify(product.imagePreviews) : 'NOT SET'}`);
            
            // Check if it's a placeholder
            if (product.image && product.image.includes('picsum.photos')) {
              console.log(`        ⚠️ USING PLACEHOLDER IMAGE`);
            } else if (product.image && product.image.startsWith('https://res.cloudinary.com')) {
              console.log(`        ✅ USING CLOUDINARY IMAGE`);
            } else if (product.image && product.image.startsWith('blob:')) {
              console.log(`        ⚠️ USING BLOB URL (needs processing)`);
            } else if (product.image) {
              console.log(`        ℹ️ USING OTHER URL`);
            } else {
              console.log(`        ❌ NO IMAGE SET`);
            }
          });
        } else {
          console.log(`   📦 No products`);
        }
      });
    }
    
    // Check payment requests to see if any shops were created through the payment flow
    console.log('\n💰 Checking payment requests...');
    const allPayments = await PaymentRequest.find({});
    console.log(`💰 Found ${allPayments.length} payment requests`);
    
    if (allPayments.length > 0) {
      allPayments.forEach((payment, index) => {
        console.log(`\n💰 Payment ${index + 1}:`);
        console.log(`   - Transaction ID: ${payment.transactionId}`);
        console.log(`   - Entity Type: ${payment.entityType}`);
        console.log(`   - Status: ${payment.status}`);
        console.log(`   - Agent ID: ${payment.agentId}`);
        console.log(`   - Entity ID: ${payment.entityId}`);
        console.log(`   - Created At: ${payment.createdAt}`);
      });
    }
    
    // Check for shops with Cloudinary images
    console.log('\n🔍 Checking for shops with Cloudinary images...');
    const shopsWithCloudinary = allShops.filter(shop => 
      shop.products && shop.products.some(product => 
        product.image && product.image.startsWith('https://res.cloudinary.com')
      )
    );
    
    console.log(`📦 Found ${shopsWithCloudinary.length} shops with Cloudinary product images`);
    
    if (shopsWithCloudinary.length > 0) {
      shopsWithCloudinary.forEach((shop, index) => {
        console.log(`\n🏪 Shop with Cloudinary images ${index + 1}: "${shop.shopName}"`);
        shop.products.forEach((product, productIndex) => {
          if (product.image && product.image.startsWith('https://res.cloudinary.com')) {
            console.log(`   📦 Product "${product.name}" - Cloudinary: ${product.image}`);
          }
        });
      });
    }
    
    // Check for shops with placeholder images
    console.log('\n🔍 Checking for shops with placeholder images...');
    const shopsWithPlaceholders = allShops.filter(shop => 
      shop.products && shop.products.some(product => 
        product.image && product.image.includes('picsum.photos')
      )
    );
    
    console.log(`📦 Found ${shopsWithPlaceholders.length} shops with placeholder product images`);
    
    if (shopsWithPlaceholders.length > 0) {
      shopsWithPlaceholders.forEach((shop, index) => {
        console.log(`\n🏪 Shop with placeholders ${index + 1}: "${shop.shopName}"`);
        shop.products.forEach((product, productIndex) => {
          if (product.image && product.image.includes('picsum.photos')) {
            console.log(`   📦 Product "${product.name}" - Placeholder: ${product.image}`);
          }
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking real shops:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkRealShops();
