const mongoose = require('mongoose');
const User = require('./models/User');

async function createTestUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pak-nexus');
    console.log('Connected to MongoDB');

    // Check if user already exists
    const existingUser = await User.findOne({ email: 'test@example.com' });
    if (existingUser) {
      console.log('✅ Test user already exists:', {
        id: existingUser._id,
        username: existingUser.username,
        email: existingUser.email
      });
      return existingUser;
    }

    // Create a test user
    const testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      fullName: 'Test User',
      mobile: '+1234567890',
      city: 'Test City',
      bio: 'This is a test user for testing the message functionality.',
      verified: true
    });

    const savedUser = await testUser.save();
    console.log('✅ Test user created:', {
      id: savedUser._id,
      username: savedUser.username,
      email: savedUser.email,
      fullName: savedUser.fullName
    });

    return savedUser;

  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createTestUser();
