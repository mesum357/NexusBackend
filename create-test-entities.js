/**
 * Script to create test shops and products with Agent IDs for testing admin panel display
 */

const mongoose = require('mongoose');
const Shop = require('./models/Shop');
const Product = require('./models/Product');
const User = require('./models/User');
const { generateShopAgentId, generateProductAgentId } = require('./utils/agentIdGenerator');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pak-nexus', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function createTestEntities() {
  try {
    console.log('🔄 Creating test entities with Agent IDs...\n');

    // First, check if we have any users
    const users = await User.find({}).limit(1);
    if (users.length === 0) {
      console.log('❌ No users found. Please create a user first.');
      return;
    }

    const testUser = users[0];
    console.log('Using user:', {
      id: testUser._id,
      username: testUser.username,
      email: testUser.email
    });

    // Create test shops
    const testShops = [
      {
        shopName: 'Tech Gadgets Store',
        city: 'Karachi',
        shopType: 'Product Seller',
        shopDescription: 'Best tech gadgets and electronics store',
        categories: ['Electronics', 'Gadgets'],
        owner: testUser._id,
        ownerName: testUser.username || testUser.email,
        approvalStatus: 'pending',
        agentId: generateShopAgentId('Tech Gadgets Store')
      },
      {
        shopName: 'Fashion Boutique',
        city: 'Lahore',
        shopType: 'Product Seller',
        shopDescription: 'Trendy fashion and accessories',
        categories: ['Fashion', 'Accessories'],
        owner: testUser._id,
        ownerName: testUser.username || testUser.email,
        approvalStatus: 'pending',
        agentId: generateShopAgentId('Fashion Boutique')
      }
    ];

    console.log('📊 Creating test shops...');
    for (const shopData of testShops) {
      const shop = new Shop(shopData);
      const savedShop = await shop.save();
      console.log(`✅ Created shop: "${savedShop.shopName}" with Agent ID: ${savedShop.agentId}`);
    }

    // Create test products
    const testProducts = [
      {
        title: 'iPhone 15 Pro',
        description: 'Latest iPhone with advanced features',
        price: 250000,
        category: 'Electronics',
        condition: 'new',
        location: 'Karachi',
        city: 'Karachi',
        owner: testUser._id,
        ownerName: testUser.fullName || testUser.username || testUser.email,
        approvalStatus: 'pending',
        agentId: generateProductAgentId('iPhone 15 Pro')
      },
      {
        title: 'Samsung Galaxy S24',
        description: 'Premium Android smartphone',
        price: 180000,
        category: 'Electronics',
        condition: 'new',
        location: 'Lahore',
        city: 'Lahore',
        owner: testUser._id,
        ownerName: testUser.fullName || testUser.username || testUser.email,
        approvalStatus: 'pending',
        agentId: generateProductAgentId('Samsung Galaxy S24')
      },
      {
        title: 'Designer Handbag',
        description: 'Luxury designer handbag',
        price: 45000,
        category: 'Fashion',
        condition: 'new',
        location: 'Islamabad',
        city: 'Islamabad',
        owner: testUser._id,
        ownerName: testUser.fullName || testUser.username || testUser.email,
        approvalStatus: 'pending',
        agentId: generateProductAgentId('Designer Handbag')
      }
    ];

    console.log('\n📊 Creating test products...');
    for (const productData of testProducts) {
      const product = new Product(productData);
      const savedProduct = await product.save();
      console.log(`✅ Created product: "${savedProduct.title}" with Agent ID: ${savedProduct.agentId}`);
    }

    console.log('\n🎉 Test entities created successfully!');
    console.log('📋 Summary:');
    console.log(`   - Created ${testShops.length} test shops`);
    console.log(`   - Created ${testProducts.length} test products`);
    console.log('🔍 You can now check the admin panel to see Agent IDs displayed');

  } catch (error) {
    console.error('❌ Error creating test entities:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  createTestEntities();
}

module.exports = { createTestEntities };
