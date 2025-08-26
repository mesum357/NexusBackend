const mongoose = require('mongoose');
const Shop = require('./models/Shop');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/nexus', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testShops() {
  try {
    console.log('🔍 Testing shops in database...');
    
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
            console.log(`     ${productIndex + 1}. "${product.name}" - Image: ${product.image || 'NOT SET'}`);
          });
        } else {
          console.log(`   📦 No products`);
        }
      });
    } else {
      console.log('❌ No shops found in database');
    }
    
  } catch (error) {
    console.error('❌ Error testing shops:', error);
  } finally {
    mongoose.connection.close();
  }
}

testShops();
