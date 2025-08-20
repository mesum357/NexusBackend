/**
 * Test script to check Agent ID generation and display for shops and products
 */

const mongoose = require('mongoose');
const Shop = require('./models/Shop');
const Product = require('./models/Product');
const Institute = require('./models/Institute');
const { generateShopAgentId, generateProductAgentId, generateInstituteAgentId } = require('./utils/agentIdGenerator');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pak-nexus', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testAgentIdDisplay() {
  try {
    console.log('🔍 Testing Agent ID Display for All Entity Types...\n');

    // Test 1: Check existing shops
    console.log('📊 Checking existing shops:');
    const shops = await Shop.find({}).limit(5);
    console.log(`Found ${shops.length} shops`);
    
    shops.forEach((shop, index) => {
      console.log(`  ${index + 1}. Shop: "${shop.shopName}"`);
      console.log(`     Agent ID: ${shop.agentId || 'NOT SET'}`);
      console.log(`     Status: ${shop.approvalStatus || 'unknown'}`);
      console.log('');
    });

    // Test 2: Check existing products
    console.log('📊 Checking existing products:');
    const products = await Product.find({}).limit(5);
    console.log(`Found ${products.length} products`);
    
    products.forEach((product, index) => {
      console.log(`  ${index + 1}. Product: "${product.title}"`);
      console.log(`     Agent ID: ${product.agentId || 'NOT SET'}`);
      console.log(`     Status: ${product.approvalStatus || 'unknown'}`);
      console.log('');
    });

    // Test 3: Check existing institutes
    console.log('📊 Checking existing institutes:');
    const institutes = await Institute.find({}).limit(5);
    console.log(`Found ${institutes.length} institutes`);
    
    institutes.forEach((institute, index) => {
      console.log(`  ${index + 1}. Institute: "${institute.name}"`);
      console.log(`     Agent ID: ${institute.agentId || 'NOT SET'}`);
      console.log(`     Status: ${institute.approvalStatus || 'unknown'}`);
      console.log('');
    });

    // Test 4: Generate sample Agent IDs
    console.log('🧪 Testing Agent ID Generation:');
    console.log(`Sample Shop Agent ID: ${generateShopAgentId('Test Shop')}`);
    console.log(`Sample Product Agent ID: ${generateProductAgentId('Test Product')}`);
    console.log(`Sample Institute Agent ID: ${generateInstituteAgentId('Test Institute')}`);

    // Test 5: Check pending entities
    console.log('\n📋 Checking pending entities:');
    const pendingShops = await Shop.find({ approvalStatus: 'pending' });
    const pendingProducts = await Product.find({ approvalStatus: 'pending' });
    const pendingInstitutes = await Institute.find({ approvalStatus: 'pending' });

    console.log(`Pending Shops: ${pendingShops.length}`);
    pendingShops.forEach((shop, index) => {
      console.log(`  ${index + 1}. "${shop.shopName}" - Agent ID: ${shop.agentId || 'NOT SET'}`);
    });

    console.log(`\nPending Products: ${pendingProducts.length}`);
    pendingProducts.forEach((product, index) => {
      console.log(`  ${index + 1}. "${product.title}" - Agent ID: ${product.agentId || 'NOT SET'}`);
    });

    console.log(`\nPending Institutes: ${pendingInstitutes.length}`);
    pendingInstitutes.forEach((institute, index) => {
      console.log(`  ${index + 1}. "${institute.name}" - Agent ID: ${institute.agentId || 'NOT SET'}`);
    });

    console.log('\n✅ Agent ID Display Test Completed!');

  } catch (error) {
    console.error('❌ Error testing Agent ID display:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the test
if (require.main === module) {
  testAgentIdDisplay();
}

module.exports = { testAgentIdDisplay };
