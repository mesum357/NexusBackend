const mongoose = require('mongoose');
const InstituteMessage = require('./models/InstituteMessage');
const Institute = require('./models/Institute');

// Test script to verify the complete message flow
async function testMessageFlow() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pak-nexus');
    console.log('Connected to MongoDB');

    // Test 1: Check if we have any institutes
    console.log('\n=== Test 1: Check Institutes ===');
    const institutes = await Institute.find({}).limit(3);
    console.log('Available institutes:', institutes.length);
    
    if (institutes.length === 0) {
      console.log('❌ No institutes found. Please create an institute first.');
      return;
    }

    const testInstitute = institutes[0];
    console.log('Using institute:', {
      id: testInstitute._id,
      name: testInstitute.name,
      owner: testInstitute.owner
    });

    // Test 2: Create a test message
    console.log('\n=== Test 2: Create Test Message ===');
    const testMessage = new InstituteMessage({
      institute: testInstitute._id,
      senderName: 'Test Institute',
      message: 'This is a test message from the institute dashboard.'
    });

    const savedMessage = await testMessage.save();
    console.log('✅ Test message created:', {
      id: savedMessage._id,
      institute: savedMessage.institute,
      senderName: savedMessage.senderName,
      message: savedMessage.message,
      createdAt: savedMessage.createdAt
    });

    // Test 3: Retrieve messages for the institute
    console.log('\n=== Test 3: Retrieve Messages ===');
    const retrievedMessages = await InstituteMessage.find({ institute: testInstitute._id });
    console.log('✅ Messages found for institute:', retrievedMessages.length);
    
    retrievedMessages.forEach((msg, index) => {
      console.log(`  Message ${index + 1}:`, {
        id: msg._id,
        senderName: msg.senderName,
        message: msg.message,
        createdAt: msg.createdAt
      });
    });

    // Test 4: Verify the message structure matches frontend expectations
    console.log('\n=== Test 4: Verify Message Structure ===');
    const messageForFrontend = retrievedMessages[0];
    const frontendMessage = {
      id: String(messageForFrontend._id),
      from: messageForFrontend.senderName,
      subject: messageForFrontend.message,
      time: new Date(messageForFrontend.createdAt).toLocaleString(),
      unread: true
    };
    
    console.log('✅ Frontend message structure:', frontendMessage);

    // Test 5: Clean up test message
    console.log('\n=== Test 5: Cleanup ===');
    await InstituteMessage.findByIdAndDelete(savedMessage._id);
    console.log('✅ Test message cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the test
testMessageFlow();
