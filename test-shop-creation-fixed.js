const mongoose = require('mongoose');
const Shop = require('./models/Shop');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/nexus', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testShopCreationFixed() {
  try {
    console.log('🔍 Testing shop creation with valid data...');
    
    // First, create a test user if none exists
    let testUser = await User.findOne({});
    if (!testUser) {
      console.log('👤 Creating test user...');
      testUser = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'testpassword123',
        isAdmin: false
      });
      await testUser.save();
      console.log('✅ Test user created with ID:', testUser._id);
    } else {
      console.log('👤 Using existing user with ID:', testUser._id);
    }
    
    // Test data for shop creation with valid values
    const testShopData = {
      shopName: 'Test Shop',
      city: 'Test City',
      shopType: 'Product Seller', // Valid enum value
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
      approvalStatus: 'pending',
      owner: testUser._id, // Required field
      ownerName: testUser.username,
      ownerDp: testUser.profileImage || 'https://picsum.photos/100/100?random=3'
    };
    
    console.log('📝 Creating test shop with valid data:', {
      shopName: testShopData.shopName,
      shopType: testShopData.shopType,
      owner: testShopData.owner,
      productsCount: testShopData.products.length
    });
    
    // Create a test shop
    const testShop = new Shop(testShopData);
    await testShop.save();
    
    console.log('✅ Test shop created successfully!');
    console.log('   - Shop ID:', testShop._id);
    console.log('   - Shop Name:', testShop.shopName);
    console.log('   - Shop Type:', testShop.shopType);
    console.log('   - Owner:', testShop.owner);
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
    
    // Test the shop display logic
    console.log('\n🔍 Testing shop display logic...');
    const allShops = await Shop.find({ approvalStatus: 'approved' });
    console.log(`📦 Found ${allShops.length} approved shops`);
    
    if (allShops.length > 0) {
      allShops.forEach((shop, index) => {
        console.log(`\n🏪 Shop ${index + 1}: "${shop.shopName}"`);
        if (shop.products && shop.products.length > 0) {
          shop.products.forEach((product, productIndex) => {
            console.log(`   📦 Product "${product.name}" - Image: ${product.image || 'NOT SET'}`);
          });
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing shop creation:', error);
    if (error.errors) {
      Object.keys(error.errors).forEach(key => {
        console.error(`   - ${key}: ${error.errors[key].message}`);
      });
    }
  } finally {
    mongoose.connection.close();
  }
}

testShopCreationFixed();
