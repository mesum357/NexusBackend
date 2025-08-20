/**
 * Script to update existing shops, products, and institutes with Agent IDs
 * Run this script to ensure all existing entities have Agent IDs
 */

const mongoose = require('mongoose');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const Institute = require('../models/Institute');
const { generateShopAgentId, generateProductAgentId, generateInstituteAgentId } = require('../utils/agentIdGenerator');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pak-nexus', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function updateExistingAgentIds() {
  try {
    console.log('🔄 Starting Agent ID update process...\n');

    // Update existing shops without Agent IDs
    const shopsWithoutAgentId = await Shop.find({ 
      $or: [
        { agentId: { $exists: false } },
        { agentId: null },
        { agentId: '' }
      ]
    });

    console.log(`📊 Found ${shopsWithoutAgentId.length} shops without Agent IDs`);

    for (const shop of shopsWithoutAgentId) {
      const agentId = generateShopAgentId(shop.shopName);
      shop.agentId = agentId;
      await shop.save();
      console.log(`✅ Updated shop "${shop.shopName}" with Agent ID: ${agentId}`);
    }

    // Update existing products without Agent IDs
    const productsWithoutAgentId = await Product.find({ 
      $or: [
        { agentId: { $exists: false } },
        { agentId: null },
        { agentId: '' }
      ]
    });

    console.log(`📊 Found ${productsWithoutAgentId.length} products without Agent IDs`);

    for (const product of productsWithoutAgentId) {
      const agentId = generateProductAgentId(product.title);
      product.agentId = agentId;
      await product.save();
      console.log(`✅ Updated product "${product.title}" with Agent ID: ${agentId}`);
    }

    // Update existing institutes without Agent IDs
    const institutesWithoutAgentId = await Institute.find({ 
      $or: [
        { agentId: { $exists: false } },
        { agentId: null },
        { agentId: '' }
      ]
    });

    console.log(`📊 Found ${institutesWithoutAgentId.length} institutes without Agent IDs`);

    for (const institute of institutesWithoutAgentId) {
      const agentId = generateInstituteAgentId(institute.name);
      institute.agentId = agentId;
      await institute.save();
      console.log(`✅ Updated institute "${institute.name}" with Agent ID: ${agentId}`);
    }

    console.log('\n🎉 Agent ID update process completed successfully!');
    console.log(`📈 Updated ${shopsWithoutAgentId.length} shops`);
    console.log(`📈 Updated ${productsWithoutAgentId.length} products`);
    console.log(`📈 Updated ${institutesWithoutAgentId.length} institutes`);

  } catch (error) {
    console.error('❌ Error updating Agent IDs:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  updateExistingAgentIds();
}

module.exports = { updateExistingAgentIds };
