const mongoose = require('mongoose');
const Shop = require('./models/Shop');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/nexus', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testShopCreation() {
  try {
    console.log('🔍 Testing shop creation...');
    
    // Test data for shop creation
    const testShopData = {
      shopName: 'Test Shop',
      city: 'Test City',
      shopType: 'General',
      shopDescription: 'Test shop description',
      categories: ['Test Category'],
      shopLogo: 'https://picsum.photos/200/200?random=1',
      shopBanner: 'https://picsum.photos/800/400?random=2',
      ownerProfilePhoto: 'https://picsum.photos/100/100?random=3',
      websiteUrl: '',
      facebookUrl: '',
      instagramHandle: '',
      whatsappNumber: '1234567890',
      products: [
        {
          id: '1',
          name: 'Test Product',
          description: 'Test product description',
          price: 100,
          discountPercentage: 0,
          category: 'Test Category',
          image: 'https://picsum.photos/150/150?random=4'
        }
      ],
      agentId: 'TEST-AGENT-001',
      approvalStatus: 'pending'
    };
    
    console.log('📝 Creating test shop with data:', testShopData);
    
    // Create a test shop
    const testShop = new Shop(testShopData);
    await testShop.save();
    
    console.log('✅ Test shop created successfully!');
    console.log('   - Shop ID:', testShop._id);
    console.log('   - Shop Name:', testShop.shopName);
    console.log('   - Products Count:', testShop.products.length);
    console.log('   - First Product Image:', testShop.products[0]?.image);
    
    // Verify the shop was saved
    const savedShop = await Shop.findById(testShop._id);
    if (savedShop) {
      console.log('✅ Shop verified in database');
      console.log('   - Products:', savedShop.products.map(p => ({ name: p.name, image: p.image })));
    } else {
      console.log('❌ Shop not found in database after creation');
    }
    
  } catch (error) {
    console.error('❌ Error testing shop creation:', error);
  } finally {
    mongoose.connection.close();
  }
}

testShopCreation();
