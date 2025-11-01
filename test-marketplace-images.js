const mongoose = require('mongoose');
const Product = require('./models/Product');
const axios = require('axios');
require('dotenv').config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pak-nexus';
const API_BASE_URL = process.env.API_BASE_URL || process.env.BACKEND_URL || 'http://localhost:3000';

async function testMarketplaceImages() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find recent marketplace products
    console.log('📦 Fetching recent marketplace products from database...');
    const products = await Product.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    console.log(`\n📊 Found ${products.length} products in database\n`);

    if (products.length === 0) {
      console.log('⚠️  No products found in database');
      console.log('\n🧪 Testing API endpoint to verify response structure...\n');
      
      // Test API endpoint even if no products in DB
      try {
        const apiResponse = await axios.get(`${API_BASE_URL}/api/marketplace`);
        console.log('✅ API endpoint is accessible');
        console.log(`   - Response status: ${apiResponse.status}`);
        console.log(`   - Products returned: ${apiResponse.data?.products?.length || 0}`);
      } catch (apiError) {
        console.error('❌ API endpoint error:', apiError.message);
        if (apiError.response) {
          console.error(`   - Status: ${apiError.response.status}`);
          console.error(`   - Data: ${JSON.stringify(apiError.response.data)}`);
        }
      }
      
      await mongoose.connection.close();
      return;
    }

    // Analyze each product's images
    products.forEach((product, index) => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Product ${index + 1}: ${product.title}`);
      console.log(`ID: ${product._id}`);
      console.log(`Status: ${product.status}`);
      console.log(`Approval Status: ${product.approvalStatus}`);
      console.log(`Created: ${product.createdAt}`);
      console.log(`Owner ID: ${product.owner || 'N/A'}`);
      console.log(`Owner Name: ${product.ownerName || 'N/A'}`);
      
      console.log(`\n📸 Images Analysis:`);
      if (!product.images || !Array.isArray(product.images) || product.images.length === 0) {
        console.log('   ❌ No images found');
        console.log('   - images field:', product.images);
      } else {
        console.log(`   ✅ Found ${product.images.length} image(s):`);
        product.images.forEach((img, imgIndex) => {
          const isCloudinary = img && typeof img === 'string' && img.includes('res.cloudinary.com');
          const isPicsum = img && typeof img === 'string' && img.includes('picsum.photos');
          const isPlaceholder = img && typeof img === 'string' && img.includes('via.placeholder');
          const isValid = img && (img.startsWith('http://') || img.startsWith('https://'));
          
          console.log(`\n   Image ${imgIndex + 1}:`);
          console.log(`   - URL: ${img?.substring(0, 80)}${img?.length > 80 ? '...' : ''}`);
          console.log(`   - Type: ${typeof img}`);
          console.log(`   - Valid URL: ${isValid ? '✅' : '❌'}`);
          console.log(`   - Cloudinary: ${isCloudinary ? '✅ YES' : '❌ NO'}`);
          console.log(`   - Picsum: ${isPicsum ? '⚠️  YES (should be removed)' : '✅ NO'}`);
          console.log(`   - Placeholder: ${isPlaceholder ? '⚠️  YES (should be removed)' : '✅ NO'}`);
          
          if (!isCloudinary && !isPicsum && !isPlaceholder && isValid) {
            console.log(`   - ⚠️  Other URL type: ${img.substring(0, 50)}...`);
          }
        });
      }

      // Check if product has any valid Cloudinary images
      const validImages = product.images && Array.isArray(product.images)
        ? product.images.filter(img => 
            img && typeof img === 'string' && 
            img.includes('res.cloudinary.com') &&
            !img.includes('picsum.photos') &&
            !img.includes('via.placeholder')
          )
        : [];
      
      console.log(`\n   📊 Summary:`);
      console.log(`   - Total images: ${product.images?.length || 0}`);
      console.log(`   - Valid Cloudinary images: ${validImages.length}`);
      if (validImages.length === 0 && product.images?.length > 0) {
        console.log(`   - ⚠️  WARNING: Product has images but none are valid Cloudinary URLs!`);
      } else if (validImages.length > 0) {
        console.log(`   - ✅ Product has valid Cloudinary images`);
      }
    });

    // Summary statistics
    console.log(`\n${'='.repeat(60)}`);
    console.log(`\n📈 Summary Statistics:\n`);
    
    const totalProducts = products.length;
    const productsWithImages = products.filter(p => p.images && Array.isArray(p.images) && p.images.length > 0).length;
    const productsWithCloudinary = products.filter(p => {
      if (!p.images || !Array.isArray(p.images)) return false;
      return p.images.some(img => 
        img && typeof img === 'string' && 
        img.includes('res.cloudinary.com') &&
        !img.includes('picsum.photos') &&
        !img.includes('via.placeholder')
      );
    }).length;
    const productsWithPicsum = products.filter(p => {
      if (!p.images || !Array.isArray(p.images)) return false;
      return p.images.some(img => img && typeof img === 'string' && img.includes('picsum.photos'));
    }).length;
    const productsWithPlaceholder = products.filter(p => {
      if (!p.images || !Array.isArray(p.images)) return false;
      return p.images.some(img => img && typeof img === 'string' && img.includes('via.placeholder'));
    }).length;
    const productsNoImages = products.filter(p => !p.images || !Array.isArray(p.images) || p.images.length === 0).length;

    console.log(`   Total products checked: ${totalProducts}`);
    console.log(`   Products with images: ${productsWithImages}`);
    console.log(`   Products with Cloudinary images: ${productsWithCloudinary} ✅`);
    console.log(`   Products with Picsum images: ${productsWithPicsum} ⚠️`);
    console.log(`   Products with Placeholder images: ${productsWithPlaceholder} ⚠️`);
    console.log(`   Products without images: ${productsNoImages}`);

    if (productsWithPicsum > 0 || productsWithPlaceholder > 0) {
      console.log(`\n   ⚠️  WARNING: ${productsWithPicsum + productsWithPlaceholder} product(s) still have placeholder images!`);
    }

    // Test API endpoint
    console.log(`\n${'='.repeat(60)}`);
    console.log(`\n🌐 Testing API Endpoint:\n`);
    console.log(`   GET ${API_BASE_URL}/api/marketplace`);
    console.log(`   This endpoint should return products with images array`);
    console.log(`   Check if images are properly included in the response\n`);

    try {
      const apiResponse = await axios.get(`${API_BASE_URL}/api/marketplace`, {
        params: { page: 1, limit: 10 }
      });
      
      console.log(`   ✅ API endpoint accessible`);
      console.log(`   - Response status: ${apiResponse.status}`);
      console.log(`   - Products returned: ${apiResponse.data?.products?.length || 0}`);
      
      const apiProducts = apiResponse.data?.products || [];
      
      if (apiProducts.length > 0) {
        console.log(`\n   📦 API Products Analysis:\n`);
        
        apiProducts.forEach((product, index) => {
          console.log(`   Product ${index + 1}: ${product.title}`);
          console.log(`   - ID: ${product._id}`);
          console.log(`   - Approval Status: ${product.approvalStatus}`);
          
          if (!product.images || !Array.isArray(product.images) || product.images.length === 0) {
            console.log(`   - Images: ❌ No images in API response`);
          } else {
            console.log(`   - Images: ✅ ${product.images.length} image(s) in API response`);
            
            product.images.forEach((img, imgIndex) => {
              const isCloudinary = img && typeof img === 'string' && img.includes('res.cloudinary.com');
              const isPicsum = img && typeof img === 'string' && img.includes('picsum.photos');
              const isPlaceholder = img && typeof img === 'string' && img.includes('via.placeholder');
              
              console.log(`     Image ${imgIndex + 1}: ${img?.substring(0, 60)}...`);
              console.log(`       - Cloudinary: ${isCloudinary ? '✅' : '❌'}`);
              console.log(`       - Picsum: ${isPicsum ? '⚠️  YES (should be removed)' : '✅ NO'}`);
              console.log(`       - Placeholder: ${isPlaceholder ? '⚠️  YES (should be removed)' : '✅ NO'}`);
            });
          }
          console.log('');
        });
        
        // Compare database vs API
        console.log(`\n   🔍 Comparing Database vs API Response:\n`);
        const dbProduct = products.find(p => p._id.toString() === apiProducts[0]?._id);
        if (dbProduct && apiProducts[0]) {
          console.log(`   Product: ${dbProduct.title}`);
          console.log(`   - DB images count: ${dbProduct.images?.length || 0}`);
          console.log(`   - API images count: ${apiProducts[0].images?.length || 0}`);
          
          if ((dbProduct.images?.length || 0) !== (apiProducts[0].images?.length || 0)) {
            console.log(`   - ⚠️  WARNING: Image count mismatch between DB and API!`);
          } else {
            console.log(`   - ✅ Image counts match`);
          }
          
          // Check if images are being filtered
          const dbCloudinaryImages = (dbProduct.images || []).filter(img => 
            img && typeof img === 'string' && img.includes('res.cloudinary.com')
          );
          const apiCloudinaryImages = (apiProducts[0].images || []).filter(img => 
            img && typeof img === 'string' && img.includes('res.cloudinary.com')
          );
          
          console.log(`   - DB Cloudinary images: ${dbCloudinaryImages.length}`);
          console.log(`   - API Cloudinary images: ${apiCloudinaryImages.length}`);
        }
      } else {
        console.log(`   ⚠️  No products returned from API (might be filtered by approval status)`);
      }
      
    } catch (apiError) {
      console.error(`   ❌ API endpoint error:`, apiError.message);
      if (apiError.response) {
        console.error(`   - Status: ${apiError.response.status}`);
        console.error(`   - Data: ${JSON.stringify(apiError.response.data)}`);
      } else if (apiError.request) {
        console.error(`   - No response received. Is the server running?`);
        console.error(`   - Check if ${API_BASE_URL} is accessible`);
      }
    }

    // Test single product endpoint
    if (products.length > 0) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`\n🔍 Testing Single Product Endpoint:\n`);
      console.log(`   GET ${API_BASE_URL}/api/marketplace/:id\n`);
      
      try {
        const testProductId = products[0]._id;
        const singleProductResponse = await axios.get(`${API_BASE_URL}/api/marketplace/${testProductId}`);
        
        console.log(`   ✅ Single product endpoint accessible`);
        console.log(`   - Product title: ${singleProductResponse.data?.product?.title || 'N/A'}`);
        console.log(`   - Images count: ${singleProductResponse.data?.product?.images?.length || 0}`);
        
        if (singleProductResponse.data?.product?.images?.length > 0) {
          const firstImage = singleProductResponse.data.product.images[0];
          console.log(`   - First image: ${firstImage?.substring(0, 60)}...`);
          console.log(`   - Is Cloudinary: ${firstImage?.includes('res.cloudinary.com') ? '✅' : '❌'}`);
          console.log(`   - Is Picsum: ${firstImage?.includes('picsum.photos') ? '⚠️  YES' : '✅ NO'}`);
        }
      } catch (singleError) {
        console.error(`   ❌ Single product endpoint error:`, singleError.message);
        if (singleError.response) {
          console.error(`   - Status: ${singleError.response.status}`);
        }
      }
    }

    // Final recommendations
    console.log(`\n${'='.repeat(60)}`);
    console.log(`\n💡 Recommendations:\n`);
    
    if (productsWithPicsum > 0 || productsWithPlaceholder > 0) {
      console.log(`   ⚠️  Found products with placeholder images in database`);
      console.log(`   - Run a migration script to remove placeholder images`);
      console.log(`   - Or manually update products to have valid Cloudinary URLs`);
    }
    
    const productsWithoutCloudinary = products.filter(p => {
      if (!p.images || !Array.isArray(p.images) || p.images.length === 0) return true;
      return !p.images.some(img => 
        img && typeof img === 'string' && 
        img.includes('res.cloudinary.com') &&
        !img.includes('picsum.photos') &&
        !img.includes('via.placeholder')
      );
    });
    
    if (productsWithoutCloudinary.length > 0) {
      console.log(`   ⚠️  ${productsWithoutCloudinary.length} product(s) don't have valid Cloudinary images`);
      console.log(`   - Check image upload flow in PaymentSection component`);
      console.log(`   - Verify batchUploadImages is working correctly`);
      console.log(`   - Check if images are being uploaded before product creation`);
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`\n✅ Test completed!\n`);

  } catch (error) {
    console.error('❌ Error testing marketplace images:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the test
testMarketplaceImages();

