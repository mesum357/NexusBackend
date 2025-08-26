const mongoose = require('mongoose');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const FormData = require('form-data');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/nexus', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testShopCreationAPI() {
  try {
    console.log('🔍 Testing shop creation through API endpoints...');
    
    const API_BASE_URL = 'http://localhost:5000';
    
    // Step 1: Test if the server is running
    console.log('\n📡 Step 1: Testing server connectivity...');
    try {
      const healthResponse = await fetch(`${API_BASE_URL}/api/health`);
      if (healthResponse.ok) {
        console.log('✅ Server is running');
      } else {
        console.log('❌ Server responded but not healthy');
      }
    } catch (error) {
      console.log('❌ Server is not running or not accessible');
      console.log('   Error:', error.message);
      return;
    }
    
    // Step 2: Test payment creation endpoint
    console.log('\n💰 Step 2: Testing payment creation...');
    
    // Create a test payment request
    const paymentData = new FormData();
    paymentData.append('entityType', 'shop');
    paymentData.append('agentId', 'API-TEST-AGENT-001');
    paymentData.append('amount', '5000');
    
    // Create a dummy image file for testing
    const dummyImageBuffer = Buffer.from('fake-image-data');
    paymentData.append('transactionScreenshot', dummyImageBuffer, {
      filename: 'test-screenshot.jpg',
      contentType: 'image/jpeg'
    });
    
    try {
      const paymentResponse = await fetch(`${API_BASE_URL}/api/payment/create`, {
        method: 'POST',
        body: paymentData
      });
      
      if (paymentResponse.ok) {
        const paymentResult = await paymentResponse.json();
        console.log('✅ Payment created successfully');
        console.log('   - Transaction ID:', paymentResult.paymentRequest?.transactionId);
        console.log('   - Status:', paymentResult.paymentRequest?.status);
      } else {
        const errorText = await paymentResponse.text();
        console.log('❌ Payment creation failed');
        console.log('   - Status:', paymentResponse.status);
        console.log('   - Error:', errorText);
      }
    } catch (error) {
      console.log('❌ Payment creation error:', error.message);
    }
    
    // Step 3: Test shop creation endpoint
    console.log('\n🏪 Step 3: Testing shop creation endpoint...');
    
    // Simulate the data that would be sent from PaymentSection
    const shopCreationData = {
      shopName: 'API Test Shop',
      city: 'Karachi',
      shopType: 'Product Seller',
      shopDescription: 'Shop created through API test',
      categories: ['Electronics'],
      shopLogo: 'https://res.cloudinary.com/dfclbddgd/image/upload/v1756213749/pak-nexus/shops/api-test-logo.jpg',
      shopBanner: 'https://res.cloudinary.com/dfclbddgd/image/upload/v1756213749/pak-nexus/shops/api-test-banner.jpg',
      ownerProfilePhoto: 'https://res.cloudinary.com/dfclbddgd/image/upload/v1756213749/pak-nexus/owners/api-test-owner.jpg',
      websiteUrl: '',
      facebookUrl: '',
      instagramHandle: '',
      whatsappNumber: '03001234567',
      products: [
        {
          id: '1',
          name: 'API Test Product 1',
          description: 'Product created through API test',
          price: 1000,
          discountPercentage: 0,
          category: 'Electronics',
          image: 'https://res.cloudinary.com/dfclbddgd/image/upload/v1756213749/pak-nexus/products/api-test-product-1.jpg'
        },
        {
          id: '2',
          name: 'API Test Product 2',
          description: 'Another product created through API test',
          price: 2000,
          discountPercentage: 10,
          category: 'Electronics',
          image: 'https://res.cloudinary.com/dfclbddgd/image/upload/v1756213749/pak-nexus/products/api-test-product-2.jpg'
        }
      ],
      agentId: 'API-TEST-AGENT-001',
      approvalStatus: 'pending'
    };
    
    try {
      const shopResponse = await fetch(`${API_BASE_URL}/api/shop-wizard/create-from-wizard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(shopCreationData)
      });
      
      if (shopResponse.ok) {
        const shopResult = await shopResponse.json();
        console.log('✅ Shop created successfully through API');
        console.log('   - Shop ID:', shopResult.shop?._id);
        console.log('   - Shop Name:', shopResult.shop?.shopName);
        console.log('   - Products Count:', shopResult.shop?.products?.length);
        
        // Check product images
        if (shopResult.shop?.products) {
          console.log('   📦 Product Images:');
          shopResult.shop.products.forEach((product, index) => {
            console.log(`     ${index + 1}. "${product.name}" - Image: ${product.image}`);
            if (product.image && product.image.startsWith('https://res.cloudinary.com')) {
              console.log(`        ✅ CLOUDINARY IMAGE`);
            } else if (product.image && product.image.includes('picsum.photos')) {
              console.log(`        ⚠️ PLACEHOLDER IMAGE`);
            } else {
              console.log(`        ℹ️ OTHER IMAGE`);
            }
          });
        }
      } else {
        const errorText = await shopResponse.text();
        console.log('❌ Shop creation failed');
        console.log('   - Status:', shopResponse.status);
        console.log('   - Error:', errorText);
      }
    } catch (error) {
      console.log('❌ Shop creation error:', error.message);
    }
    
    // Step 4: Check the database for the created shop
    console.log('\n🔍 Step 4: Checking database for created shop...');
    
    const Shop = require('./models/Shop');
    const createdShop = await Shop.findOne({ shopName: 'API Test Shop' });
    
    if (createdShop) {
      console.log('✅ Shop found in database');
      console.log('   - Shop ID:', createdShop._id);
      console.log('   - Approval Status:', createdShop.approvalStatus);
      console.log('   - Products Count:', createdShop.products?.length);
      
      if (createdShop.products && createdShop.products.length > 0) {
        console.log('   📦 Database Product Images:');
        createdShop.products.forEach((product, index) => {
          console.log(`     ${index + 1}. "${product.name}" - Image: ${product.image}`);
          if (product.image && product.image.startsWith('https://res.cloudinary.com')) {
            console.log(`        ✅ CLOUDINARY IMAGE`);
          } else if (product.image && product.image.includes('picsum.photos')) {
            console.log(`        ⚠️ PLACEHOLDER IMAGE`);
          } else {
            console.log(`        ℹ️ OTHER IMAGE`);
          }
        });
      }
    } else {
      console.log('❌ Shop not found in database');
    }
    
  } catch (error) {
    console.error('❌ Error testing shop creation API:', error);
  } finally {
    mongoose.connection.close();
  }
}

testShopCreationAPI();
