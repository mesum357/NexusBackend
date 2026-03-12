const mongoose = require('mongoose');
const Shop = require('./models/Shop');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pakistan_Online?retryWrites=true&w=majority';

async function findShopsWithArea() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const shops = await Shop.find({ area: { $exists: true, $ne: '', $ne: 'undefined' } });
    console.log(`Found ${shops.length} shops with defined area:`);
    
    shops.forEach(shop => {
      console.log(`- Shop: "${shop.shopName}" | Area: "${shop.area}"`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

findShopsWithArea();
