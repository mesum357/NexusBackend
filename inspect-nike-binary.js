const mongoose = require('mongoose');
const Shop = require('./models/Shop');
require('dotenv').config();

async function checkNikeBinary() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const shopsToCheck = ['Nike Binary', 'Five star pakwan', 'FFL DG khan'];
  
  for (const name of shopsToCheck) {
    const shop = await Shop.findOne({ shopName: new RegExp(name, 'i') });
    if (shop) {
      console.log(`- Name: ${shop.shopName}`);
      console.log(`  City: ${shop.city}`);
      console.log(`  Area: ${shop.area}`);
      console.log(`  Created: ${shop.createdAt}`);
      console.log(`  Fields: ${Object.keys(shop.toObject()).join(', ')}`);
    } else {
      console.log(`${name} shop not found`);
    }
    console.log('-------------------');
  }

  await mongoose.disconnect();
}

checkNikeBinary();
