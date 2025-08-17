const mongoose = require('mongoose');
const User = require('./models/User');

async function makeUserAdmin(email) {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pak-nexus');
    console.log('Connected to MongoDB');

    // Find user by email
    const user = await User.findOne({ email: email });
    if (!user) {
      console.log('❌ User not found with email:', email);
      return;
    }

    // Check if user is already admin
    if (user.isAdmin) {
      console.log('✅ User is already an admin:', {
        id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin
      });
      return;
    }

    // Make user admin
    user.isAdmin = true;
    await user.save();

    console.log('✅ User made admin successfully:', {
      id: user._id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin
    });

  } catch (error) {
    console.error('❌ Error making user admin:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Get email from command line argument
const email = process.argv[2];
if (!email) {
  console.log('❌ Please provide an email address as an argument');
  console.log('Usage: node make-admin.js <email>');
  process.exit(1);
}

makeUserAdmin(email);
