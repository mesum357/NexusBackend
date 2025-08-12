const mongoose = require('mongoose');
const InstituteMessage = require('./models/InstituteMessage');

// Test script to verify message functionality
async function testMessages() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pak-nexus');
    console.log('Connected to MongoDB');

    // Test 1: Check if InstituteMessage model exists
    console.log('\n=== Test 1: Model Check ===');
    console.log('InstituteMessage model:', InstituteMessage ? 'Exists' : 'Missing');

    // Test 2: List all messages in the database
    console.log('\n=== Test 2: List All Messages ===');
    const allMessages = await InstituteMessage.find({});
    console.log('Total messages in database:', allMessages.length);
    
    if (allMessages.length > 0) {
      console.log('Sample message:', allMessages[0]);
    }

    // Test 3: Find messages for a specific institute (replace with actual institute ID)
    console.log('\n=== Test 3: Find Messages by Institute ===');
    // You can replace this with an actual institute ID from your database
    const sampleInstituteId = '507f1f77bcf86cd799439011'; // Example ObjectId
    const instituteMessages = await InstituteMessage.find({ institute: sampleInstituteId });
    console.log(`Messages for institute ${sampleInstituteId}:`, instituteMessages.length);

    // Test 4: Check message schema
    console.log('\n=== Test 4: Message Schema ===');
    if (allMessages.length > 0) {
      const sample = allMessages[0];
      console.log('Message fields:', Object.keys(sample.toObject()));
      console.log('Sample message structure:', {
        _id: sample._id,
        institute: sample.institute,
        senderName: sample.senderName,
        message: sample.message,
        createdAt: sample.createdAt,
        updatedAt: sample.updatedAt
      });
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the test
testMessages();
