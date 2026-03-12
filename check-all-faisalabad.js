const mongoose = require('mongoose');
const Shop = require('./models/Shop');
require('dotenv').config();

async function checkAllFaisalabad() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const shops = await Shop.find({ city: 'Faisalabad' }).sort({ createdAt: -1 });
  console.log(`Found ${shops.length} total shops in Faisalabad:`);
  
  shops.forEach((shop, index) => {
    console.log(`${index + 1}. Shop: "${shop.shopName}" | Area: "${shop.area}" | Status: ${shop.approvalStatus} | Created: ${shop.createdAt}`);
  });

  await mongoose.disconnect();
}

checkAllFaisalabad();
