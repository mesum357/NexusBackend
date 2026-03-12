const mongoose = require('mongoose');
const Shop = require('./models/Shop');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pakistan_Online?retryWrites=true&w=majority';

async function createTestShop() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find a user to be the owner
    const User = require('./models/User');
    const user = await User.findOne({});
    if (!user) {
      console.error('No user found to own the shop');
      return;
    }

    const testShopData = {
      shopName: "Test Area Shop",
      city: "Faisalabad",
      area: "D-Type",
      shopType: "Product Seller",
      shopDescription: "A shop to test area saving",
      address: "Test Address",
      categories: ["Test"],
      owner: user._id,
      approvalStatus: "approved"
    };

    const shop = new Shop(testShopData);
    const savedShop = await shop.save();
    console.log('Test shop saved:', savedShop._id);
    console.log('Saved area:', savedShop.area);

    const retrievedShop = await Shop.findById(savedShop._id);
    console.log('Retrieved area:', retrievedShop.area);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

createTestShop();
