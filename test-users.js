const mongoose = require('mongoose');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/nexus', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testUsers() {
  try {
    console.log('🔍 Testing users in database...');
    
    // Find all users
    const allUsers = await User.find({});
    console.log(`👥 Found ${allUsers.length} total users`);
    
    if (allUsers.length > 0) {
      allUsers.forEach((user, index) => {
        console.log(`\n👤 User ${index + 1}:`);
        console.log(`   - ID: ${user._id}`);
        console.log(`   - Username: ${user.username}`);
        console.log(`   - Email: ${user.email}`);
        console.log(`   - Is Admin: ${user.isAdmin}`);
        console.log(`   - Created At: ${user.createdAt}`);
      });
    } else {
      console.log('❌ No users found in database');
    }
    
  } catch (error) {
    console.error('❌ Error testing users:', error);
  } finally {
    mongoose.connection.close();
  }
}

testUsers();
