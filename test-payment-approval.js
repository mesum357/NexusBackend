/**
 * Test script to verify payment approval system
 * This script tests the updated payment approval logic to ensure
 * entities are approved regardless of agentId availability
 */

const mongoose = require('mongoose');
const PaymentRequest = require('./models/PaymentRequest');
const Institute = require('./models/Institute');
const Hospital = require('./models/Hospital');
const Shop = require('./models/Shop');
const Product = require('./models/Product');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nexus', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testPaymentApproval() {
  try {
    console.log('🧪 Testing Payment Approval System...\n');

    // 1. Check current payment requests
    console.log('📊 Current Payment Requests Status:');
    const allPayments = await PaymentRequest.find({}).populate('user', 'username email');
    
    const statusCounts = {};
    const entityTypeCounts = {};
    const agentIdStatus = { withAgentId: 0, withoutAgentId: 0 };
    
    allPayments.forEach(payment => {
      // Count by status
      statusCounts[payment.status] = (statusCounts[payment.status] || 0) + 1;
      
      // Count by entity type
      entityTypeCounts[payment.entityType] = (entityTypeCounts[payment.entityType] || 0) + 1;
      
      // Count by agentId availability
      if (payment.agentId) {
        agentIdStatus.withAgentId++;
      } else {
        agentIdStatus.withoutAgentId++;
      }
    });
    
    console.log('   Status Distribution:', statusCounts);
    console.log('   Entity Type Distribution:', entityTypeCounts);
    console.log('   Agent ID Status:', agentIdStatus);
    
    // 2. Check entities that should be approved but aren't
    console.log('\n🔍 Checking Entities Approval Status:');
    
    const entityTypes = ['institute', 'hospital', 'shop', 'marketplace'];
    for (const entityType of entityTypes) {
      let EntityModel;
      let entityNameField;
      
      switch (entityType) {
        case 'institute':
          EntityModel = Institute;
          entityNameField = 'name';
          break;
        case 'hospital':
          EntityModel = Hospital;
          entityNameField = 'hospitalName';
          break;
        case 'shop':
          EntityModel = Shop;
          entityNameField = 'shopName';
          break;
        case 'marketplace':
          EntityModel = Product;
          entityNameField = 'title';
          break;
      }
      
      const pendingEntities = await EntityModel.find({ approvalStatus: 'pending' });
      const approvedEntities = await EntityModel.find({ approvalStatus: 'approved' });
      
      console.log(`   ${entityType.toUpperCase()}:`);
      console.log(`     - Pending: ${pendingEntities.length}`);
      console.log(`     - Approved: ${approvedEntities.length}`);
      
      // Check if pending entities have associated verified payments
      for (const entity of pendingEntities) {
        const associatedPayments = await PaymentRequest.find({
          $or: [
            { agentId: entity.agentId },
            { entityId: entity._id },
            { entityType: entityType, user: entity.owner }
          ]
        });
        
        const verifiedPayments = associatedPayments.filter(p => p.status === 'verified');
        
        if (verifiedPayments.length > 0) {
          console.log(`     ⚠️  Entity "${entity[entityNameField]}" has verified payments but is still pending!`);
          console.log(`        - Entity ID: ${entity._id}`);
          console.log(`        - Agent ID: ${entity.agentId || 'N/A'}`);
          console.log(`        - Verified Payments: ${verifiedPayments.length}`);
        }
      }
    }
    
    // 3. Test specific payment approval scenarios
    console.log('\n🧪 Testing Payment Approval Scenarios:');
    
    // Find a payment request without agentId but with entityId
    const paymentWithoutAgentId = await PaymentRequest.findOne({
      $or: [
        { agentId: { $exists: false } },
        { agentId: null },
        { agentId: '' }
      ],
      entityId: { $exists: true, $ne: null }
    });
    
    if (paymentWithoutAgentId) {
      console.log(`   Found payment request without agentId: ${paymentWithoutAgentId._id}`);
      console.log(`   - Entity Type: ${paymentWithoutAgentId.entityType}`);
      console.log(`   - Entity ID: ${paymentWithoutAgentId.entityId}`);
      console.log(`   - Status: ${paymentWithoutAgentId.status}`);
      
      // Check if the associated entity exists and its approval status
      let associatedEntity;
      switch (paymentWithoutAgentId.entityType) {
        case 'institute':
          associatedEntity = await Institute.findById(paymentWithoutAgentId.entityId);
          break;
        case 'hospital':
          associatedEntity = await Hospital.findById(paymentWithoutAgentId.entityId);
          break;
        case 'shop':
          associatedEntity = await Shop.findById(paymentWithoutAgentId.entityId);
          break;
        case 'marketplace':
          associatedEntity = await Product.findById(paymentWithoutAgentId.entityId);
          break;
      }
      
      if (associatedEntity) {
        console.log(`   - Associated Entity: ${associatedEntity.name || associatedEntity.shopName || associatedEntity.hospitalName || associatedEntity.title}`);
        console.log(`   - Entity Approval Status: ${associatedEntity.approvalStatus}`);
        console.log(`   - Entity Agent ID: ${associatedEntity.agentId || 'N/A'}`);
      } else {
        console.log(`   - No associated entity found for entityId: ${paymentWithoutAgentId.entityId}`);
      }
    } else {
      console.log('   No payment requests found without agentId but with entityId');
    }
    
    // 4. Recommendations
    console.log('\n💡 Recommendations:');
    console.log('   1. Run the fixMissingAgentIds.js script to ensure all entities have Agent IDs');
    console.log('   2. Check if there are any payment requests that need manual approval');
    console.log('   3. Verify that the updated payment approval logic is working correctly');
    
    if (agentIdStatus.withoutAgentId > 0) {
      console.log(`   4. Found ${agentIdStatus.withoutAgentId} payment requests without Agent ID - these may need attention`);
    }
    
    console.log('\n✅ Payment approval system test completed!');

  } catch (error) {
    console.error('❌ Error during payment approval test:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed.');
  }
}

// Run the test
testPaymentApproval();
