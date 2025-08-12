console.log('Starting simple test...');

const mongoose = require('mongoose');

async function simpleTest() {
  try {
    console.log('Attempting to connect to MongoDB...');
    
    // Try to connect
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pak-nexus');
    console.log('✅ Connected to MongoDB successfully!');
    
    // Check if we can access the models
    console.log('Checking models...');
    
    try {
      const Institute = require('./models/Institute');
      console.log('✅ Institute model loaded');
      
      const InstituteMessage = require('./models/InstituteMessage');
      console.log('✅ InstituteMessage model loaded');
      
      // Try to count documents
      const instituteCount = await Institute.countDocuments();
      console.log('📊 Institute count:', instituteCount);
      
      const messageCount = await InstituteMessage.countDocuments();
      console.log('📊 Message count:', messageCount);
      
    } catch (modelError) {
      console.log('❌ Error loading models:', modelError.message);
    }
    
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  }
}

simpleTest().then(() => {
  console.log('Test completed');
}).catch(err => {
  console.log('Test failed:', err);
});
