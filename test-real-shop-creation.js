const mongoose = require('mongoose');
const Shop = require('./models/Shop');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/nexus', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testRealShopCreation() {
  try {
    console.log('🔍 Testing real shop creation with actual product images...');
    
    // Get or create a test user
    let testUser = await User.findOne({});
    if (!testUser) {
      console.log('👤 Creating test user...');
      testUser = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'testpassword123',
        isAdmin: false
      });
      await testUser.save();
      console.log('✅ Test user created with ID:', testUser._id);
    }
    
    // Simulate the data that would come from the shop wizard
    const shopWizardData = {
      shopName: 'Real Test Shop',
      city: 'Lahore',
      shopType: 'Product Seller',
      shopDescription: 'A real test shop with actual product images',
      categories: ['Electronics', 'Gadgets'],
      logoPreview: 'blob:http://localhost:3000/12345678-1234-1234-1234-123456789012', // Simulate blob URL
      bannerPreview: 'blob:http://localhost:3000/87654321-4321-4321-4321-210987654321', // Simulate blob URL
      ownerProfilePreview: 'blob:http://localhost:3000/11111111-2222-3333-4444-555555555555', // Simulate blob URL
      facebookUrl: 'https://facebook.com/testshop',
      instagramHandle: '@testshop',
      whatsappNumber: '03001234567',
      websiteUrl: 'https://testshop.com',
      products: [
        {
          id: '1',
          name: 'iPhone 15 Pro',
          description: 'Latest iPhone with amazing features',
          price: 250000,
          discountPercentage: 5,
          category: 'Electronics',
          imagePreviews: ['blob:http://localhost:3000/product1-12345678-1234-1234-1234-123456789012'] // Simulate blob URL
        },
        {
          id: '2',
          name: 'Samsung Galaxy S24',
          description: 'Premium Android smartphone',
          price: 180000,
          discountPercentage: 0,
          category: 'Electronics',
          imagePreviews: ['blob:http://localhost:3000/product2-87654321-4321-4321-4321-210987654321'] // Simulate blob URL
        }
      ],
      agentId: 'REAL-AGENT-001'
    };
    
    console.log('📝 Shop wizard data:', {
      shopName: shopWizardData.shopName,
      productsCount: shopWizardData.products.length,
      hasBlobUrls: shopWizardData.logoPreview.startsWith('blob:'),
      productBlobUrls: shopWizardData.products.map(p => p.imagePreviews?.[0]?.startsWith('blob:') || false)
    });
    
    // Simulate the PaymentSection image processing
    console.log('\n🖼️ Simulating PaymentSection image processing...');
    
    // Convert blob URLs to Cloudinary URLs (simulating the actual process)
    const processedProducts = await Promise.all(shopWizardData.products.map(async (product, index) => {
      console.log(`📦 Processing product "${product.name}"...`);
      
      let productImage = 'https://picsum.photos/150/150?random=4'; // Default placeholder
      
      if (product.imagePreviews && Array.isArray(product.imagePreviews) && product.imagePreviews.length > 0) {
        const firstImagePreview = product.imagePreviews[0];
        console.log(`   - Original image preview: ${firstImagePreview}`);
        
        if (firstImagePreview.startsWith('blob:')) {
          // Simulate Cloudinary upload (in real scenario, this would upload to Cloudinary)
          const cloudinaryUrl = `https://res.cloudinary.com/dfclbddgd/image/upload/v1756213749/pak-nexus/products/product-${index + 1}-${Date.now()}.jpg`;
          productImage = cloudinaryUrl;
          console.log(`   - ✅ Converted to Cloudinary URL: ${productImage}`);
        } else if (firstImagePreview.startsWith('https://res.cloudinary.com')) {
          productImage = firstImagePreview;
          console.log(`   - ✅ Already Cloudinary URL: ${productImage}`);
        } else {
          console.log(`   - ⚠️ Invalid image format: ${firstImagePreview}`);
        }
      }
      
      console.log(`   - Final product image: ${productImage}`);
      
      return {
        ...product,
        image: productImage
      };
    }));
    
    console.log('\n📦 Final processed products:');
    processedProducts.forEach((product, index) => {
      console.log(`   ${index + 1}. "${product.name}" - Image: ${product.image}`);
    });
    
    // Create the shop with processed data
    const shopData = {
      shopName: shopWizardData.shopName,
      city: shopWizardData.city,
      shopType: shopWizardData.shopType,
      shopDescription: shopWizardData.shopDescription,
      categories: shopWizardData.categories,
      shopLogo: 'https://res.cloudinary.com/dfclbddgd/image/upload/v1756213749/pak-nexus/shops/logo-real-test-shop.jpg', // Simulated Cloudinary URL
      shopBanner: 'https://res.cloudinary.com/dfclbddgd/image/upload/v1756213749/pak-nexus/shops/banner-real-test-shop.jpg', // Simulated Cloudinary URL
      ownerProfilePhoto: 'https://res.cloudinary.com/dfclbddgd/image/upload/v1756213749/pak-nexus/owners/owner-real-test-shop.jpg', // Simulated Cloudinary URL
      websiteUrl: shopWizardData.websiteUrl,
      facebookUrl: shopWizardData.facebookUrl,
      instagramHandle: shopWizardData.instagramHandle,
      whatsappNumber: shopWizardData.whatsappNumber,
      products: processedProducts,
      agentId: shopWizardData.agentId,
      approvalStatus: 'pending',
      owner: testUser._id,
      ownerName: testUser.username,
      ownerDp: 'https://res.cloudinary.com/dfclbddgd/image/upload/v1756213749/pak-nexus/owners/owner-real-test-shop.jpg'
    };
    
    console.log('\n📝 Creating shop with processed data...');
    const realShop = new Shop(shopData);
    await realShop.save();
    
    console.log('✅ Real shop created successfully!');
    console.log('   - Shop ID:', realShop._id);
    console.log('   - Shop Name:', realShop.shopName);
    console.log('   - Products Count:', realShop.products.length);
    
    // Verify the products have Cloudinary images
    console.log('\n🔍 Verifying product images...');
    realShop.products.forEach((product, index) => {
      console.log(`   📦 Product "${product.name}":`);
      console.log(`      - Image: ${product.image}`);
      if (product.image.startsWith('https://res.cloudinary.com')) {
        console.log(`      - ✅ CLOUDINARY IMAGE`);
      } else if (product.image.includes('picsum.photos')) {
        console.log(`      - ⚠️ PLACEHOLDER IMAGE`);
      } else {
        console.log(`      - ℹ️ OTHER IMAGE`);
      }
    });
    
    // Approve the shop
    console.log('\n✅ Approving the real shop...');
    realShop.approvalStatus = 'approved';
    realShop.approvedAt = new Date();
    await realShop.save();
    
    console.log('✅ Real shop approved!');
    
    // Final verification
    console.log('\n🔍 Final verification - checking all approved shops...');
    const approvedShops = await Shop.find({ approvalStatus: 'approved' });
    console.log(`📦 Found ${approvedShops.length} approved shops`);
    
    approvedShops.forEach((shop, index) => {
      console.log(`\n🏪 Approved Shop ${index + 1}: "${shop.shopName}"`);
      if (shop.products && shop.products.length > 0) {
        shop.products.forEach((product, productIndex) => {
          console.log(`   📦 Product "${product.name}" - Image: ${product.image}`);
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Error testing real shop creation:', error);
    if (error.errors) {
      Object.keys(error.errors).forEach(key => {
        console.error(`   - ${key}: ${error.errors[key].message}`);
      });
    }
  } finally {
    mongoose.connection.close();
  }
}

testRealShopCreation();
