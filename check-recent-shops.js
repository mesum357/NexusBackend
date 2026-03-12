const mongoose = require('mongoose');
const Shop = require('./models/Shop');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pakistan_Online?retryWrites=true&w=majority';

async function checkRecentShops() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const shops = await Shop.find({}).sort({ createdAt: -1 }).limit(20);
    console.log(`Checking the 10 most recent shops:`);
    
    shops.forEach((shop, index) => {
      console.log(`${index + 1}. Shop: "${shop.shopName}" | City: "${shop.city}" | Area: "${shop.area}" | Status: ${shop.approvalStatus}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkRecentShops();
