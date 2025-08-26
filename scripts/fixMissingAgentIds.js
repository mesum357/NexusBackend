/**
 * Script to identify and fix entities missing Agent IDs
 * This script helps resolve the issue where entities without agentId 
 * are not being automatically approved after payment verification
 */

const mongoose = require('mongoose');
const Institute = require('../models/Institute');
const Hospital = require('../models/Hospital');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const PaymentRequest = require('../models/PaymentRequest');
const { generateInstituteAgentId, generateHospitalAgentId, generateShopAgentId, generateProductAgentId } = require('../utils/agentIdGenerator');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nexus', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function fixMissingAgentIds() {
  try {
    console.log('🔍 Starting Agent ID fix process...\n');

    // 1. Check Institutes
    console.log('📚 Checking Institutes...');
    const institutesWithoutAgentId = await Institute.find({ 
      $or: [
        { agentId: { $exists: false } },
        { agentId: null },
        { agentId: '' }
      ]
    });
    
    console.log(`   Found ${institutesWithoutAgentId.length} institutes without Agent ID`);
    
    for (const institute of institutesWithoutAgentId) {
      const newAgentId = generateInstituteAgentId(institute.name);
      institute.agentId = newAgentId;
      await institute.save();
      console.log(`   ✅ Fixed institute "${institute.name}": ${newAgentId}`);
    }

    // 2. Check Hospitals
    console.log('\n🏥 Checking Hospitals...');
    const hospitalsWithoutAgentId = await Hospital.find({ 
      $or: [
        { agentId: { $exists: false } },
        { agentId: null },
        { agentId: '' }
      ]
    });
    
    console.log(`   Found ${hospitalsWithoutAgentId.length} hospitals without Agent ID`);
    
    for (const hospital of hospitalsWithoutAgentId) {
      const newAgentId = generateHospitalAgentId(hospital.hospitalName);
      hospital.agentId = newAgentId;
      await hospital.save();
      console.log(`   ✅ Fixed hospital "${hospital.hospitalName}": ${newAgentId}`);
    }

    // 3. Check Shops
    console.log('\n🏪 Checking Shops...');
    const shopsWithoutAgentId = await Shop.find({ 
      $or: [
        { agentId: { $exists: false } },
        { agentId: null },
        { agentId: '' }
      ]
    });
    
    console.log(`   Found ${shopsWithoutAgentId.length} shops without Agent ID`);
    
    for (const shop of shopsWithoutAgentId) {
      const newAgentId = generateShopAgentId(shop.shopName);
      shop.agentId = newAgentId;
      await shop.save();
      console.log(`   ✅ Fixed shop "${shop.shopName}": ${newAgentId}`);
    }

    // 4. Check Products
    console.log('\n📦 Checking Products...');
    const productsWithoutAgentId = await Product.find({ 
      $or: [
        { agentId: { $exists: false } },
        { agentId: null },
        { agentId: '' }
      ]
    });
    
    console.log(`   Found ${productsWithoutAgentId.length} products without Agent ID`);
    
    for (const product of productsWithoutAgentId) {
      const newAgentId = generateProductAgentId(product.title);
      product.agentId = newAgentId;
      await product.save();
      console.log(`   ✅ Fixed product "${product.title}": ${newAgentId}`);
    }

    // 5. Check Payment Requests and link them to entities
    console.log('\n💰 Checking Payment Requests...');
    const paymentRequestsWithoutAgentId = await PaymentRequest.find({ 
      $or: [
        { agentId: { $exists: false } },
        { agentId: null },
        { agentId: '' }
      ]
    });
    
    console.log(`   Found ${paymentRequestsWithoutAgentId.length} payment requests without Agent ID`);
    
    for (const payment of paymentRequestsWithoutAgentId) {
      if (payment.entityId) {
        try {
          let entity;
          switch (payment.entityType) {
            case 'institute':
              entity = await Institute.findById(payment.entityId);
              break;
            case 'hospital':
              entity = await Hospital.findById(payment.entityId);
              break;
            case 'shop':
              entity = await Shop.findById(payment.entityId);
              break;
            case 'marketplace':
            case 'product':
              entity = await Product.findById(payment.entityId);
              break;
          }
          
          if (entity && entity.agentId) {
            payment.agentId = entity.agentId;
            await payment.save();
            console.log(`   ✅ Linked payment request ${payment._id} to ${payment.entityType} with Agent ID: ${entity.agentId}`);
          } else if (entity) {
            console.log(`   ⚠️ Entity found but no Agent ID for payment ${payment._id}`);
          } else {
            console.log(`   ❌ No entity found for payment ${payment._id} (entityId: ${payment.entityId})`);
          }
        } catch (error) {
          console.log(`   ❌ Error processing payment ${payment._id}: ${error.message}`);
        }
      } else {
        console.log(`   ⚠️ Payment request ${payment._id} has no entityId`);
      }
    }

    // 6. Summary
    console.log('\n📊 Summary:');
    console.log(`   - Institutes fixed: ${institutesWithoutAgentId.length}`);
    console.log(`   - Hospitals fixed: ${hospitalsWithoutAgentId.length}`);
    console.log(`   - Shops fixed: ${shopsWithoutAgentId.length}`);
    console.log(`   - Products fixed: ${productsWithoutAgentId.length}`);
    console.log(`   - Payment requests processed: ${paymentRequestsWithoutAgentId.length}`);
    
    console.log('\n✅ Agent ID fix process completed!');
    console.log('   All entities should now have Agent IDs and payment approval should work correctly.');

  } catch (error) {
    console.error('❌ Error during Agent ID fix process:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed.');
  }
}

// Run the script
fixMissingAgentIds();
