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

async function testPublicEndpoint() {
  try {
    console.log('🔍 Testing Public Payment Requests Endpoint...\n');

    // Simulate the public endpoint logic
    const query = {};
    const page = 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    
    console.log('1. Fetching payment requests from database...');
    const [paymentRequests, total] = await Promise.all([
      PaymentRequest.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PaymentRequest.countDocuments(query)
    ]);
    
    console.log(`   Found ${paymentRequests.length} payment requests`);
    
    // Test the Agent ID population logic
    console.log('\n2. Testing Agent ID population logic...');
    const enhancedPaymentRequests = await Promise.all(
      paymentRequests.map(async (payment) => {
        console.log(`\n   Processing payment ${payment._id}:`);
        console.log(`     - Current agentId: ${payment.agentId}`);
        console.log(`     - Entity Type: ${payment.entityType}`);
        console.log(`     - Entity ID: ${payment.entityId}`);
        
        // If payment already has agentId, use it
        if (payment.agentId) {
          console.log(`     ✅ Already has agentId: ${payment.agentId}`);
          return payment;
        }
        
        // Try to fetch agentId from associated entity
        if (payment.entityId) {
          try {
            let entity;
            switch (payment.entityType) {
              case 'institute':
              case 'hospital':
                entity = await Institute.findById(payment.entityId);
                break;
              case 'shop':
                entity = await Shop.findById(payment.entityId);
                break;
              case 'marketplace':
                entity = await Product.findById(payment.entityId);
                break;
            }
            if (entity && entity.agentId) {
              payment.agentId = entity.agentId;
              console.log(`     ✅ Found Agent ID ${entity.agentId} from ${payment.entityType}`);
            } else if (entity) {
              console.log(`     ❌ Entity found but no Agent ID: ${entity.name || entity.shopName || entity.title}`);
            } else {
              console.log(`     ❌ No entity found for entityId: ${payment.entityId}`);
            }
          } catch (error) {
            console.log(`     ❌ Error fetching entity: ${error.message}`);
          }
        } else {
          console.log(`     ❌ No entityId, skipping Agent ID lookup`);
        }
        return payment;
      })
    );
    
    console.log('\n3. Final results:');
    enhancedPaymentRequests.forEach((payment, index) => {
      console.log(`   Payment ${index + 1}: ID=${payment._id}, AgentID=${payment.agentId || 'N/A'}`);
    });
    
    console.log('\n✅ Public Endpoint Test Complete!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the test
testPublicEndpoint();
