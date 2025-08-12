const mongoose = require('mongoose');
const Institute = require('./models/Institute');
const User = require('./models/User');

async function createTestInstitute() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pak-nexus');
    console.log('Connected to MongoDB');

    // First, check if we have any users
    const users = await User.find({}).limit(1);
    if (users.length === 0) {
      console.log('❌ No users found. Please create a user first.');
      return;
    }

    const testUser = users[0];
    console.log('Using user:', {
      id: testUser._id,
      username: testUser.username,
      email: testUser.email
    });

    // Create a test institute
    const testInstitute = new Institute({
      name: 'Test University',
      type: 'University',
      city: 'Test City',
      province: 'Test Province',
      location: 'Test City, Test Province',
      description: 'This is a test institute for testing the message functionality.',
      specialization: 'Computer Science',
      phone: '+1234567890',
      email: 'test@testuniversity.edu',
      website: 'https://testuniversity.edu',
      address: '123 Test Street, Test City, Test Province',
      owner: testUser._id,
      ownerName: testUser.username || testUser.email,
      ownerEmail: testUser.email,
      verified: false,
      rating: 4.5,
      totalReviews: 0,
      admissionStatus: 'Open',
      establishedYear: 2024
    });

    const savedInstitute = await testInstitute.save();
    console.log('✅ Test institute created:', {
      id: savedInstitute._id,
      name: savedInstitute.name,
      owner: savedInstitute.owner,
      city: savedInstitute.city,
      province: savedInstitute.province
    });

    return savedInstitute;

  } catch (error) {
    console.error('❌ Error creating test institute:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

createTestInstitute();
