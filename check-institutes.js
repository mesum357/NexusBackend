const mongoose = require('mongoose');
const Institute = require('./models/Institute');

async function checkInstitutes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pak-nexus');
    console.log('Connected to MongoDB');

    const institutes = await Institute.find({});
    console.log('Total institutes found:', institutes.length);
    
    if (institutes.length > 0) {
      institutes.forEach((inst, index) => {
        console.log(`\nInstitute ${index + 1}:`);
        console.log('  ID:', inst._id);
        console.log('  Name:', inst.name);
        console.log('  Owner:', inst.owner);
        console.log('  Created:', inst.createdAt);
      });
    } else {
      console.log('No institutes found in database');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkInstitutes();
