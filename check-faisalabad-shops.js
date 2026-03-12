const mongoose = require('mongoose');
const Shop = require('./models/Shop');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pakistan_Online?retryWrites=true&w=majority';

async function checkShops() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const shops = await Shop.find({ city: /faisalabad/i });
    console.log(`Found ${shops.length} shops in Faisalabad:`);
    
    shops.forEach(shop => {
      console.log(`- Shop: "${shop.shopName}"`);
      console.log(`  City: "${shop.city}"`);
      console.log(`  Area: "${shop.area}"`);
      console.log(`  Address: "${shop.address}"`);
      console.log(`  Status: ${shop.approvalStatus}`);
      console.log('-------------------');
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkShops();
