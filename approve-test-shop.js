const mongoose = require('mongoose');
const Shop = require('./models/Shop');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/nexus', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function approveTestShop() {
  try {
    console.log('🔍 Approving test shop...');
    
    // Find the test shop
    const testShop = await Shop.findOne({ shopName: 'Test Shop' });
    if (!testShop) {
      console.log('❌ Test shop not found');
      return;
    }
    
    console.log('🏪 Found test shop:', {
      id: testShop._id,
      name: testShop.shopName,
      currentStatus: testShop.approvalStatus,
      productsCount: testShop.products.length
    });
    
    // Approve the shop
    testShop.approvalStatus = 'approved';
    testShop.approvedAt = new Date();
    await testShop.save();
    
    console.log('✅ Test shop approved successfully!');
    console.log('   - New Status:', testShop.approvalStatus);
    console.log('   - Approved At:', testShop.approvedAt);
    
    // Verify the approval
    const approvedShop = await Shop.findById(testShop._id);
    console.log('✅ Verification - Shop status:', approvedShop.approvalStatus);
    
    // Test the shop display logic again
    console.log('\n🔍 Testing shop display logic after approval...');
    const approvedShops = await Shop.find({ approvalStatus: 'approved' });
    console.log(`📦 Found ${approvedShops.length} approved shops`);
    
    if (approvedShops.length > 0) {
      approvedShops.forEach((shop, index) => {
        console.log(`\n🏪 Approved Shop ${index + 1}: "${shop.shopName}"`);
        if (shop.products && shop.products.length > 0) {
          shop.products.forEach((product, productIndex) => {
            console.log(`   📦 Product "${product.name}" - Image: ${product.image || 'NOT SET'}`);
          });
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error approving test shop:', error);
  } finally {
    mongoose.connection.close();
  }
}

approveTestShop();
