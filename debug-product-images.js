const mongoose = require('mongoose');
const Shop = require('./models/Shop');
const User = require('./models/User');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/nexus', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function debugProductImages() {
  try {
    console.log('🔍 Debugging product image processing...');
    
    // Get or create a test user
    let testUser = await User.findOne({});
    if (!testUser) {
      console.log('👤 Creating test user...');
      testUser = new User({
        username: 'debuguser',
        email: 'debug@example.com',
        password: 'debugpassword123',
        isAdmin: false
      });
      await testUser.save();
      console.log('✅ Test user created with ID:', testUser._id);
    }
    
    // Test different scenarios for product images
    console.log('\n📦 Testing different product image scenarios...');
    
    // Scenario 1: Products with blob URLs (what should happen in real flow)
    console.log('\n🔍 Scenario 1: Products with blob URLs');
    const scenario1Data = {
      shopName: 'Debug Shop - Blob URLs',
      city: 'Lahore',
      shopType: 'Product Seller',
      shopDescription: 'Testing blob URL processing',
      categories: ['Electronics'],
      shopLogo: 'https://picsum.photos/200/200?random=1',
      shopBanner: 'https://picsum.photos/800/400?random=2',
      ownerProfilePhoto: 'https://picsum.photos/100/100?random=3',
      websiteUrl: '',
      facebookUrl: '',
      instagramHandle: '',
      whatsappNumber: '03001234567',
      products: [
        {
          id: '1',
          name: 'Blob Test Product 1',
          description: 'Product with blob URL',
          price: 1000,
          discountPercentage: 0,
          category: 'Electronics',
          imagePreviews: ['blob:http://localhost:3000/debug-blob-1-12345678-1234-1234-1234-123456789012']
        },
        {
          id: '2',
          name: 'Blob Test Product 2',
          description: 'Another product with blob URL',
          price: 2000,
          discountPercentage: 10,
          category: 'Electronics',
          imagePreviews: ['blob:http://localhost:3000/debug-blob-2-87654321-4321-4321-4321-210987654321']
        }
      ],
      agentId: 'DEBUG-BLOB-001',
      approvalStatus: 'pending',
      owner: testUser._id,
      ownerName: testUser.username,
      ownerDp: 'https://picsum.photos/100/100?random=3'
    };
    
    console.log('📝 Scenario 1 data:', {
      shopName: scenario1Data.shopName,
      productsCount: scenario1Data.products.length,
      product1ImagePreviews: scenario1Data.products[0].imagePreviews,
      product2ImagePreviews: scenario1Data.products[1].imagePreviews
    });
    
    // Simulate the PaymentSection processing
    console.log('\n🖼️ Simulating PaymentSection processing for Scenario 1...');
    const processedProducts1 = await Promise.all(scenario1Data.products.map(async (product, index) => {
      console.log(`📦 Processing product "${product.name}"...`);
      
      let productImage = 'https://picsum.photos/150/150?random=4'; // Default placeholder
      
      if (product.imagePreviews && Array.isArray(product.imagePreviews) && product.imagePreviews.length > 0) {
        const firstImagePreview = product.imagePreviews[0];
        console.log(`   - Original image preview: ${firstImagePreview}`);
        
        if (firstImagePreview.startsWith('blob:')) {
          // Simulate Cloudinary upload
          const cloudinaryUrl = `https://res.cloudinary.com/dfclbddgd/image/upload/v1756213749/pak-nexus/debug/products/debug-blob-${index + 1}-${Date.now()}.jpg`;
          productImage = cloudinaryUrl;
          console.log(`   - ✅ Converted to Cloudinary URL: ${productImage}`);
        } else {
          console.log(`   - ⚠️ Not a blob URL: ${firstImagePreview}`);
        }
      } else {
        console.log(`   - ⚠️ No imagePreviews found`);
      }
      
      console.log(`   - Final product image: ${productImage}`);
      
      return {
        ...product,
        image: productImage
      };
    }));
    
    console.log('\n📦 Scenario 1 processed products:');
    processedProducts1.forEach((product, index) => {
      console.log(`   ${index + 1}. "${product.name}" - Image: ${product.image}`);
    });
    
    // Create the shop with processed data
    const shopData1 = {
      ...scenario1Data,
      products: processedProducts1
    };
    
    console.log('\n📝 Creating shop for Scenario 1...');
    const shop1 = new Shop(shopData1);
    await shop1.save();
    
    console.log('✅ Scenario 1 shop created successfully!');
    console.log('   - Shop ID:', shop1._id);
    console.log('   - Products Count:', shop1.products.length);
    
    // Verify the products
    console.log('\n🔍 Verifying Scenario 1 products...');
    shop1.products.forEach((product, index) => {
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
    
    // Scenario 2: Products with existing Cloudinary URLs
    console.log('\n🔍 Scenario 2: Products with existing Cloudinary URLs');
    const scenario2Data = {
      shopName: 'Debug Shop - Existing Cloudinary',
      city: 'Karachi',
      shopType: 'Product Seller',
      shopDescription: 'Testing existing Cloudinary URLs',
      categories: ['Electronics'],
      shopLogo: 'https://picsum.photos/200/200?random=1',
      shopBanner: 'https://picsum.photos/800/400?random=2',
      ownerProfilePhoto: 'https://picsum.photos/100/100?random=3',
      websiteUrl: '',
      facebookUrl: '',
      instagramHandle: '',
      whatsappNumber: '03001234567',
      products: [
        {
          id: '1',
          name: 'Cloudinary Test Product 1',
          description: 'Product with existing Cloudinary URL',
          price: 1000,
          discountPercentage: 0,
          category: 'Electronics',
          image: 'https://res.cloudinary.com/dfclbddgd/image/upload/v1756213749/pak-nexus/debug/existing-product-1.jpg'
        },
        {
          id: '2',
          name: 'Cloudinary Test Product 2',
          description: 'Another product with existing Cloudinary URL',
          price: 2000,
          discountPercentage: 10,
          category: 'Electronics',
          image: 'https://res.cloudinary.com/dfclbddgd/image/upload/v1756213749/pak-nexus/debug/existing-product-2.jpg'
        }
      ],
      agentId: 'DEBUG-CLOUDINARY-001',
      approvalStatus: 'pending',
      owner: testUser._id,
      ownerName: testUser.username,
      ownerDp: 'https://picsum.photos/100/100?random=3'
    };
    
    console.log('📝 Scenario 2 data:', {
      shopName: scenario2Data.shopName,
      productsCount: scenario2Data.products.length,
      product1Image: scenario2Data.products[0].image,
      product2Image: scenario2Data.products[1].image
    });
    
    // Create the shop directly (no processing needed)
    console.log('\n📝 Creating shop for Scenario 2...');
    const shop2 = new Shop(scenario2Data);
    await shop2.save();
    
    console.log('✅ Scenario 2 shop created successfully!');
    console.log('   - Shop ID:', shop2._id);
    console.log('   - Products Count:', shop2.products.length);
    
    // Verify the products
    console.log('\n🔍 Verifying Scenario 2 products...');
    shop2.products.forEach((product, index) => {
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
    
    // Approve both shops
    console.log('\n✅ Approving both debug shops...');
    shop1.approvalStatus = 'approved';
    shop1.approvedAt = new Date();
    await shop1.save();
    
    shop2.approvalStatus = 'approved';
    shop2.approvedAt = new Date();
    await shop2.save();
    
    console.log('✅ Both debug shops approved!');
    
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
    console.error('❌ Error debugging product images:', error);
    if (error.errors) {
      Object.keys(error.errors).forEach(key => {
        console.error(`   - ${key}: ${error.errors[key].message}`);
      });
    }
  } finally {
    mongoose.connection.close();
  }
}

debugProductImages();
