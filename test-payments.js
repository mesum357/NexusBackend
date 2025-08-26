const mongoose = require('mongoose');
const PaymentRequest = require('./models/PaymentRequest');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/nexus', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testPayments() {
  try {
    console.log('🔍 Testing payment requests in database...');
    
    // Find all payment requests
    const allPayments = await PaymentRequest.find({});
    console.log(`💰 Found ${allPayments.length} total payment requests`);
    
    if (allPayments.length > 0) {
      allPayments.forEach((payment, index) => {
        console.log(`\n💰 Payment ${index + 1}:`);
        console.log(`   - ID: ${payment._id}`);
        console.log(`   - Transaction ID: ${payment.transactionId}`);
        console.log(`   - Entity Type: ${payment.entityType}`);
        console.log(`   - Status: ${payment.status}`);
        console.log(`   - Agent ID: ${payment.agentId}`);
        console.log(`   - Entity ID: ${payment.entityId}`);
        console.log(`   - Amount: ${payment.amount}`);
        console.log(`   - Created At: ${payment.createdAt}`);
        console.log(`   - Updated At: ${payment.updatedAt}`);
      });
    } else {
      console.log('❌ No payment requests found in database');
    }
    
  } catch (error) {
    console.error('❌ Error testing payments:', error);
  } finally {
    mongoose.connection.close();
  }
}

testPayments();
