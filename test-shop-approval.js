const mongoose = require('mongoose');
const Shop = require('./models/Shop');
const PaymentRequest = require('./models/PaymentRequest');

// Connect to MongoDB
mongoose.connect('mongodb+srv://ahmed357:pDliM118811@cluster0.vtangzf.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testShopApproval() {
  try {
    console.log('🧪 Testing Shop Approval System...\n');

    // 1. Check all shops and their approval status
    console.log('1️⃣ Checking all shops...');
    const allShops = await Shop.find({}).sort({ createdAt: -1 });
    
    console.log(`   Total shops found: ${allShops.length}`);
    
    allShops.forEach((shop, index) => {
      console.log(`   ${index + 1}. ${shop.shopName}`);
      console.log(`      - ID: ${shop._id}`);
      console.log(`      - Agent ID: ${shop.agentId}`);
      console.log(`      - Approval Status: ${shop.approvalStatus}`);
      console.log(`      - Created: ${shop.createdAt}`);
      console.log(`      - Approved At: ${shop.approvedAt || 'Not approved'}`);
      console.log(`      - Products: ${shop.products ? shop.products.length : 0}`);
      console.log('');
    });

    // 2. Check all payment requests
    console.log('2️⃣ Checking all payment requests...');
    const allPayments = await PaymentRequest.find({}).sort({ createdAt: -1 });
    
    console.log(`   Total payment requests found: ${allPayments.length}`);
    
    allPayments.forEach((payment, index) => {
      console.log(`   ${index + 1}. Payment Request`);
      console.log(`      - ID: ${payment._id}`);
      console.log(`      - Entity Type: ${payment.entityType}`);
      console.log(`      - Agent ID: ${payment.agentId}`);
      console.log(`      - Entity ID: ${payment.entityId}`);
      console.log(`      - Status: ${payment.status}`);
      console.log(`      - Amount: ${payment.amount}`);
      console.log(`      - Created: ${payment.createdAt}`);
      console.log(`      - Verified At: ${payment.verifiedAt || 'Not verified'}`);
      console.log('');
    });

    // 3. Check shops that should be approved but aren't
    console.log('3️⃣ Checking shops that should be approved...');
    const pendingShops = allShops.filter(shop => shop.approvalStatus === 'pending');
    const approvedShops = allShops.filter(shop => shop.approvalStatus === 'approved');
    
    console.log(`   Pending shops: ${pendingShops.length}`);
    console.log(`   Approved shops: ${approvedShops.length}`);
    
    if (pendingShops.length > 0) {
      console.log('\n   📋 Pending shops that might need approval:');
      pendingShops.forEach((shop, index) => {
        console.log(`      ${index + 1}. ${shop.shopName} (Agent ID: ${shop.agentId})`);
        
        // Check if there's a verified payment for this shop
        const verifiedPayment = allPayments.find(payment => 
          (payment.agentId === shop.agentId || payment.entityId?.toString() === shop._id.toString()) &&
          payment.status === 'verified'
        );
        
        if (verifiedPayment) {
          console.log(`         ✅ Has verified payment but still pending!`);
          console.log(`         💰 Payment ID: ${verifiedPayment._id}`);
          console.log(`         💰 Payment Status: ${verifiedPayment.status}`);
        } else {
          console.log(`         ❌ No verified payment found`);
        }
        console.log('');
      });
    }

    // 4. Check payment requests that are verified but shops aren't approved
    console.log('4️⃣ Checking verified payments without approved shops...');
    const verifiedPayments = allPayments.filter(payment => payment.status === 'verified');
    
    verifiedPayments.forEach((payment, index) => {
      console.log(`   ${index + 1}. Verified Payment`);
      console.log(`      - ID: ${payment._id}`);
      console.log(`      - Entity Type: ${payment.entityType}`);
      console.log(`      - Agent ID: ${payment.agentId}`);
      console.log(`      - Entity ID: ${payment.entityId}`);
      
      if (payment.entityType === 'shop') {
        const shop = allShops.find(s => 
          s.agentId === payment.agentId || s._id.toString() === payment.entityId?.toString()
        );
        
        if (shop) {
          if (shop.approvalStatus === 'approved') {
            console.log(`      ✅ Associated shop is approved: ${shop.shopName}`);
          } else {
            console.log(`      ❌ Associated shop is NOT approved: ${shop.shopName}`);
            console.log(`         Current status: ${shop.approvalStatus}`);
          }
        } else {
          console.log(`      ⚠️ No associated shop found`);
        }
      }
      console.log('');
    });

    // 5. Summary and recommendations
    console.log('5️⃣ Summary and Recommendations:');
    console.log(`   - Total shops: ${allShops.length}`);
    console.log(`   - Approved shops: ${approvedShops.length}`);
    console.log(`   - Pending shops: ${pendingShops.length}`);
    console.log(`   - Total payments: ${allPayments.length}`);
    console.log(`   - Verified payments: ${verifiedPayments.length}`);
    
    const shopsWithVerifiedPayments = pendingShops.filter(shop => {
      return allPayments.some(payment => 
        (payment.agentId === shop.agentId || payment.entityId?.toString() === shop._id.toString()) &&
        payment.status === 'verified'
      );
    });
    
    if (shopsWithVerifiedPayments.length > 0) {
      console.log(`\n   🚨 ISSUE FOUND: ${shopsWithVerifiedPayments.length} shops have verified payments but are still pending!`);
      console.log('   These shops should be automatically approved. Check the admin approval logic.');
      
      console.log('\n   📋 Shops that need manual approval:');
      shopsWithVerifiedPayments.forEach((shop, index) => {
        console.log(`      ${index + 1}. ${shop.shopName} (Agent ID: ${shop.agentId})`);
        console.log(`         Use: PUT /api/admin/shop/approve-by-agent/${shop.agentId}`);
      });
    } else {
      console.log('\n   ✅ All shops with verified payments are properly approved!');
    }

  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the test
testShopApproval();
