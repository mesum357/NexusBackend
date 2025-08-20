const mongoose = require('mongoose');
const Institute = require('./models/Institute');
const Shop = require('./models/Shop');
const Product = require('./models/Product');
const PaymentRequest = require('./models/PaymentRequest');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://ahmed357:pDliM118811@cluster0.vtangzf.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testAgentIdSystem() {
  try {
    console.log('🔍 Testing Agent ID System...\n');

    // 1. Check if we have any entities with Agent IDs
    console.log('1. Checking entities with Agent IDs:');
    
    const institutesWithAgentId = await Institute.find({ agentId: { $exists: true, $ne: null } });
    console.log(`   Institutes with Agent ID: ${institutesWithAgentId.length}`);
    institutesWithAgentId.forEach(inst => {
      console.log(`   - ${inst.name}: Agent ID = ${inst.agentId}`);
    });

    const shopsWithAgentId = await Shop.find({ agentId: { $exists: true, $ne: null } });
    console.log(`   Shops with Agent ID: ${shopsWithAgentId.length}`);
    shopsWithAgentId.forEach(shop => {
      console.log(`   - ${shop.shopName}: Agent ID = ${shop.agentId}`);
    });

    const productsWithAgentId = await Product.find({ agentId: { $exists: true, $ne: null } });
    console.log(`   Products with Agent ID: ${productsWithAgentId.length}`);
    productsWithAgentId.forEach(product => {
      console.log(`   - ${product.title}: Agent ID = ${product.agentId}`);
    });

    // 2. Check payment requests
    console.log('\n2. Checking payment requests:');
    
    const totalPayments = await PaymentRequest.countDocuments();
    console.log(`   Total payment requests: ${totalPayments}`);
    
    const paymentsWithAgentId = await PaymentRequest.find({ agentId: { $exists: true, $ne: null } });
    console.log(`   Payment requests with Agent ID: ${paymentsWithAgentId.length}`);
    
    const paymentsWithoutAgentId = await PaymentRequest.find({ 
      $or: [
        { agentId: { $exists: false } },
        { agentId: null },
        { agentId: '' }
      ]
    });
    console.log(`   Payment requests without Agent ID: ${paymentsWithoutAgentId.length}`);

    // 3. Check a sample payment request
    if (paymentsWithoutAgentId.length > 0) {
      console.log('\n3. Sample payment request without Agent ID:');
      const samplePayment = paymentsWithoutAgentId[0];
      console.log(`   Payment ID: ${samplePayment._id}`);
      console.log(`   Entity Type: ${samplePayment.entityType}`);
      console.log(`   Entity ID: ${samplePayment.entityId}`);
      console.log(`   User: ${samplePayment.user}`);
      console.log(`   Amount: ${samplePayment.amount}`);
      
      // Try to fetch the associated entity
      if (samplePayment.entityId) {
        console.log('\n   Attempting to fetch associated entity...');
        try {
          let entity;
          switch (samplePayment.entityType) {
            case 'institute':
            case 'hospital':
              entity = await Institute.findById(samplePayment.entityId);
              break;
            case 'shop':
              entity = await Shop.findById(samplePayment.entityId);
              break;
            case 'marketplace':
              entity = await Product.findById(samplePayment.entityId);
              break;
          }
          
          if (entity) {
            console.log(`   Entity found: ${entity.name || entity.shopName || entity.title}`);
            console.log(`   Entity Agent ID: ${entity.agentId || 'Not set'}`);
          } else {
            console.log('   Entity not found');
          }
        } catch (error) {
          console.log(`   Error fetching entity: ${error.message}`);
        }
      }
    }

    // 4. Test the Agent ID population logic
    console.log('\n4. Testing Agent ID population logic:');
    
    const testPayment = paymentsWithoutAgentId[0];
    if (testPayment && testPayment.entityId) {
      try {
        let entity;
        switch (testPayment.entityType) {
          case 'institute':
          case 'hospital':
            entity = await Institute.findById(testPayment.entityId);
            break;
          case 'shop':
            entity = await Shop.findById(testPayment.entityId);
            break;
          case 'marketplace':
            entity = await Product.findById(testPayment.entityId);
            break;
        }
        
        if (entity && entity.agentId) {
          console.log(`   ✅ Would populate Agent ID: ${entity.agentId}`);
        } else {
          console.log('   ❌ No Agent ID available to populate');
        }
      } catch (error) {
        console.log(`   ❌ Error in population logic: ${error.message}`);
      }
    }

    console.log('\n✅ Agent ID System Test Complete!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the test
testAgentIdSystem();
