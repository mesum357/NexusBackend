const mongoose = require('mongoose');
const Hospital = require('./models/Hospital');
const PaymentRequest = require('./models/PaymentRequest');
const User = require('./models/User');

// Connect to MongoDB Atlas (same as main app)
const mongoURI = 'mongodb+srv://ahmed357:pDliM118811@cluster0.vtangzf.mongodb.net/';
console.log('🔌 Connecting to MongoDB Atlas...');

const mongooseOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true
};

mongoose.connect(mongoURI, mongooseOptions)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    console.log('   - Database:', mongoose.connection.db.databaseName);
    console.log('   - Host:', mongoose.connection.host);
    console.log('');
  })
  .catch((err) => {
    console.error('❌ Error connecting to MongoDB Atlas:', err);
    process.exit(1);
  });

async function testHospitalApproval() {
  try {
    console.log('🏥 Testing Hospital Approval System...\n');

    // 0. Check database connection and collections
    console.log('0️⃣ Checking database connection and collections...');
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`   Collections found: ${collections.length}`);
    collections.forEach(collection => {
      console.log(`     - ${collection.name}`);
    });
    console.log('');

    // 1. Check all hospitals in database
    console.log('1️⃣ Checking all hospitals in database...');
    const allHospitals = await Hospital.find({});
    console.log(`   Total hospitals found: ${allHospitals.length}\n`);

    if (allHospitals.length > 0) {
      allHospitals.forEach((hospital, index) => {
        console.log(`   Hospital ${index + 1}:`);
        console.log(`     - Name: ${hospital.name}`);
        console.log(`     - ID: ${hospital._id}`);
        console.log(`     - Approval Status: ${hospital.approvalStatus}`);
        console.log(`     - Owner: ${hospital.owner}`);
        console.log(`     - Created: ${hospital.createdAt}`);
        console.log(`     - Updated: ${hospital.updatedAt}`);
        console.log(`     - Payment Verified: ${hospital.paymentVerified || 'NOT SET'}`);
        console.log(`     - Payment Request ID: ${hospital.paymentRequestId || 'NOT SET'}`);
        console.log('');
      });
    }

    // 2. Check payment requests for hospitals
    console.log('2️⃣ Checking payment requests for hospitals...');
    const hospitalPaymentRequests = await PaymentRequest.find({ entityType: 'hospital' });
    console.log(`   Total hospital payment requests: ${hospitalPaymentRequests.length}\n`);

    if (hospitalPaymentRequests.length > 0) {
      hospitalPaymentRequests.forEach((payment, index) => {
        console.log(`   Payment Request ${index + 1}:`);
        console.log(`     - ID: ${payment._id}`);
        console.log(`     - User: ${payment.user}`);
        console.log(`     - Entity Type: ${payment.entityType}`);
        console.log(`     - Entity ID: ${payment.entityId || 'NOT SET'}`);
        console.log(`     - Status: ${payment.status}`);
        console.log(`     - Amount: ${payment.amount}`);
        console.log(`     - Created: ${payment.createdAt}`);
        console.log('');
      });
    }

    // 3. Check ALL payment requests to see what entity types exist
    console.log('3️⃣ Checking ALL payment requests...');
    const allPaymentRequests = await PaymentRequest.find({});
    console.log(`   Total payment requests: ${allPaymentRequests.length}\n`);

    if (allPaymentRequests.length > 0) {
      const entityTypeCounts = {};
      allPaymentRequests.forEach(payment => {
        const entityType = payment.entityType || 'unknown';
        entityTypeCounts[entityType] = (entityTypeCounts[entityType] || 0) + 1;
      });

      console.log('   Entity type breakdown:');
      Object.entries(entityTypeCounts).forEach(([entityType, count]) => {
        console.log(`     - ${entityType}: ${count}`);
      });
      console.log('');

      // Show first few payment requests
      allPaymentRequests.slice(0, 5).forEach((payment, index) => {
        console.log(`   Payment Request ${index + 1}:`);
        console.log(`     - ID: ${payment._id}`);
        console.log(`     - User: ${payment.user}`);
        console.log(`     - Entity Type: ${payment.entityType || 'NOT SET'}`);
        console.log(`     - Entity ID: ${payment.entityId || 'NOT SET'}`);
        console.log(`     - Status: ${payment.status}`);
        console.log(`     - Amount: ${payment.amount}`);
        console.log(`     - Created: ${payment.createdAt}`);
        console.log('');
      });
    }

    // 4. Check specific approval statuses
    console.log('4️⃣ Checking approval status breakdown...');
    const pendingHospitals = await Hospital.find({ approvalStatus: 'pending' });
    const approvedHospitals = await Hospital.find({ approvalStatus: 'approved' });
    const rejectedHospitals = await Hospital.find({ approvalStatus: 'rejected' });

    console.log(`   Pending hospitals: ${pendingHospitals.length}`);
    console.log(`   Approved hospitals: ${approvedHospitals.length}`);
    console.log(`   Rejected hospitals: ${rejectedHospitals.length}\n`);

    // 5. Check hospitals with payment verification
    console.log('5️⃣ Checking hospitals with payment verification...');
    const paymentVerifiedHospitals = await Hospital.find({ paymentVerified: true });
    console.log(`   Hospitals with paymentVerified=true: ${paymentVerifiedHospitals.length}\n`);

    if (paymentVerifiedHospitals.length > 0) {
      paymentVerifiedHospitals.forEach((hospital, index) => {
        console.log(`   Payment Verified Hospital ${index + 1}:`);
        console.log(`     - Name: ${hospital.name}`);
        console.log(`     - Approval Status: ${hospital.approvalStatus}`);
        console.log(`     - Payment Request ID: ${hospital.paymentRequestId}`);
        console.log('');
      });
    }

    // 6. Check if there are any users who might have created hospitals
    console.log('6️⃣ Checking users who might have created hospitals...');
    const users = await User.find({}).limit(5);
    console.log(`   Sample users found: ${users.length}\n`);

    if (users.length > 0) {
      users.forEach((user, index) => {
        console.log(`   User ${index + 1}:`);
        console.log(`     - ID: ${user._id}`);
        console.log(`     - Username: ${user.username || 'NOT SET'}`);
        console.log(`     - Email: ${user.email || 'NOT SET'}`);
        console.log('');
      });
    }

    console.log('✅ Hospital approval test completed!');

  } catch (error) {
    console.error('❌ Error testing hospital approval:', error);
  } finally {
    mongoose.connection.close();
  }
}

testHospitalApproval();
