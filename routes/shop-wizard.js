const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Shop = require('../models/Shop');
const { ensureAuthenticated } = require('../middleware/auth');
const { upload: cloudinaryUpload, cloudinary } = require('../middleware/cloudinary');
const { generateShopAgentId } = require('../utils/agentIdGenerator');

// File filter for image uploads
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

// Configure upload with cloudinary and file filter
const upload = multer({
  storage: cloudinaryUpload.storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Create shop from wizard data (JSON) - for use after payment
router.post('/create-from-wizard', ensureAuthenticated, async (req, res) => {
  try {
    console.log('Shop wizard creation from JSON request received');
    console.log('Body:', req.body);

    const {
      shopName,
      city,
      shopType,
      shopDescription,
      categories,
      websiteUrl,
      facebookUrl,
      instagramHandle,
      whatsappNumber,
      products,
      agentId,
      approvalStatus
    } = req.body;

    // Validate required fields
    if (!shopName || !city || !shopType) {
      return res.status(400).json({ error: 'Shop name, city, and shop type are required' });
    }

    // Parse categories and products if they're strings
    let parsedCategories = [];
    let parsedProducts = [];

    try {
      if (categories) {
        parsedCategories = typeof categories === 'string' ? JSON.parse(categories) : categories;
      }
      if (products) {
        parsedProducts = typeof products === 'string' ? JSON.parse(products) : products;
      }
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      return res.status(400).json({ error: 'Invalid JSON format for categories or products' });
    }

    // Use provided image URLs or fallback to default images
    const shopLogoPath = req.body.shopLogo || 'https://via.placeholder.com/200x200/cccccc/666666?text=Shop+Logo';
    const shopBannerPath = req.body.shopBanner || 'https://via.placeholder.com/800x400/cccccc/666666?text=Shop+Banner';
    const ownerProfilePath = req.body.ownerProfilePhoto || 'https://via.placeholder.com/100x100/cccccc/666666?text=Profile';

    console.log('🖼️ Image data received:');
    console.log('   - shopLogo:', req.body.shopLogo);
    console.log('   - shopBanner:', req.body.shopBanner);
    console.log('   - ownerProfilePhoto:', req.body.ownerProfilePhoto);
    console.log('   - Final shopLogoPath:', shopLogoPath);
    console.log('   - Final shopBannerPath:', shopBannerPath);
    console.log('   - Final ownerProfilePath:', ownerProfilePath);

    // Process products to ensure image field is properly set
    const processedProducts = parsedProducts.map(product => {
      // Handle both single imagePreview and array imagePreviews
      let finalImage = product.image;
      
      // Check if the image field contains a Cloudinary URL (from PaymentSection)
      if (finalImage && finalImage.startsWith('https://res.cloudinary.com')) {
        console.log(`📦 Product "${product.name}" has Cloudinary image:`, finalImage);
      } else if (!finalImage) {
        // Fallback to imagePreviews if image field is empty
        if (product.imagePreviews && Array.isArray(product.imagePreviews) && product.imagePreviews.length > 0) {
          finalImage = product.imagePreviews[0]; // Use first image from array
          console.log(`📦 Product "${product.name}" using imagePreviews[0]:`, finalImage);
        } else if (product.imagePreview) {
          finalImage = product.imagePreview; // Fallback to single imagePreview
          console.log(`📦 Product "${product.name}" using imagePreview:`, finalImage);
        } else {
          finalImage = 'https://via.placeholder.com/300x200/cccccc/666666?text=No+Image'; // Generic placeholder
          console.log(`📦 Product "${product.name}" using generic placeholder`);
        }
      }
      
      console.log(`📦 Processing product "${product.name}":`);
      console.log(`   - Original image: ${product.image || 'NOT SET'}`);
      console.log(`   - imagePreview: ${product.imagePreview || 'NOT SET'}`);
      console.log(`   - imagePreviews: ${product.imagePreviews ? JSON.stringify(product.imagePreviews) : 'NOT SET'}`);
      console.log(`   - Final image: ${finalImage}`);
      
      return {
        ...product,
        image: finalImage
      };
    });

    // Create shop data
    const shopData = {
      shopName,
      city,
      shopType,
      shopDescription: shopDescription || '',
      categories: parsedCategories,
      shopLogo: shopLogoPath,
      shopBanner: shopBannerPath,
      ownerProfilePhoto: ownerProfilePath,
      websiteUrl: websiteUrl || '',
      facebookUrl: facebookUrl || '',
      instagramHandle: instagramHandle || '',
      whatsappNumber: whatsappNumber || '',
      products: processedProducts, // Use processed products with correct image field
      rating: 4.5,
      totalReviews: 0,
      owner: req.user._id,
      ownerName: req.user.username || req.user.email || '',
      ownerDp: ownerProfilePath || req.user.profileImage || '',
      // Use user-provided Agent ID or generate one if not provided
      agentId: agentId || generateShopAgentId(shopName),
      approvalStatus: approvalStatus || 'pending'
    };

    console.log('Creating shop with data:', shopData);
    console.log('Generated Agent ID:', shopData.agentId);
    console.log('📝 Shop approval status will be: pending (requires payment verification)');
    console.log('📦 Products being saved:', shopData.products);
    console.log('📦 Number of products:', shopData.products ? shopData.products.length : 0);
    console.log('🖼️ Image data being saved:');
    console.log('   - shopLogo:', shopData.shopLogo);
    console.log('   - shopBanner:', shopData.shopBanner);
    console.log('   - ownerProfilePhoto:', shopData.ownerProfilePhoto);
    
    // Debug each product individually
    if (shopData.products && shopData.products.length > 0) {
      shopData.products.forEach((product, index) => {
        console.log(`   Product ${index + 1}:`, {
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          discountPercentage: product.discountPercentage,
          category: product.category,
          image: product.image
        });
      });
    } else {
      console.log('   ❌ No products found in shopData');
    }

    // Create and save the shop
    const shop = new Shop(shopData);
    const savedShop = await shop.save();

    console.log('Shop created successfully:', savedShop._id);
    console.log('✅ Shop created with approvalStatus: pending');
    console.log('   - Shop will appear on store page after admin approves payment');
    console.log('   - Payment verification automatically sets approvalStatus to approved');
    
    // Debug what was actually saved
    console.log('📦 Products saved in database:', savedShop.products);
    console.log('📦 Number of products saved:', savedShop.products ? savedShop.products.length : 0);

    res.status(201).json({
      success: true,
      message: 'Shop created successfully and is pending admin approval',
      shop: savedShop
    });

  } catch (error) {
    console.error('Error creating shop from wizard:', error);
    res.status(500).json({
      error: 'Failed to create shop',
      details: error.message
    });
  }
});

// Advanced shop creation with multiple files
router.post('/create', ensureAuthenticated, upload.fields([
  { name: 'shopLogo', maxCount: 1 },
  { name: 'shopBanner', maxCount: 1 },
  { name: 'ownerProfilePhoto', maxCount: 1 },
  { name: 'productImages', maxCount: 10 }
]), async (req, res) => {
  try {
    console.log('Shop wizard creation request received');
    console.log('Files:', req.files);
    console.log('Body:', req.body);

    const {
      shopName,
      city,
      shopType,
      shopDescription,
      categories,
      websiteUrl,
      facebookUrl,
      instagramHandle,
      whatsappNumber,
      products
    } = req.body;

    // Validate required fields
    if (!shopName || !city || !shopType) {
      return res.status(400).json({ error: 'Shop name, city, and shop type are required' });
    }

    // Parse categories and products
    let parsedCategories = [];
    let parsedProducts = [];

    try {
      if (categories) {
        parsedCategories = JSON.parse(categories);
      }
      if (products) {
        parsedProducts = JSON.parse(products);
      }
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      return res.status(400).json({ error: 'Invalid JSON format for categories or products' });
    }

    // Handle file uploads
    let shopLogoPath = '';
    let shopBannerPath = '';
    let ownerProfilePath = '';

    if (req.files.shopLogo) {
      shopLogoPath = req.files.shopLogo[0].path; // Cloudinary URL
    }

    if (req.files.shopBanner) {
      shopBannerPath = req.files.shopBanner[0].path; // Cloudinary URL
    }

    if (req.files.ownerProfilePhoto) {
      ownerProfilePath = req.files.ownerProfilePhoto[0].path; // Cloudinary URL
    }

    // Set default images if none provided
    if (!shopLogoPath) {
      shopLogoPath = 'https://via.placeholder.com/200x200/cccccc/666666?text=Shop+Logo';
    }
    if (!shopBannerPath) {
      shopBannerPath = 'https://via.placeholder.com/800x400/cccccc/666666?text=Shop+Banner';
    }
    if (!ownerProfilePath) {
      ownerProfilePath = 'https://via.placeholder.com/100x100/cccccc/666666?text=Profile';
    }

    // Process product images
    const productImages = req.files.productImages || [];
    const updatedProducts = parsedProducts.map((product, index) => {
      const productImage = productImages.find(img => 
        img.originalname === product.imageName || 
        img.fieldname === 'productImages'
      );
      
      return {
        ...product,
        image: productImage ? productImage.path : '', // Cloudinary URL
        imagePreview: product.imagePreview || ''
      };
    });

    // Create shop data
    const shopData = {
      shopName,
      city,
      shopType,
      shopDescription: shopDescription || '',
      categories: parsedCategories,
      shopLogo: shopLogoPath,
      shopBanner: shopBannerPath,
      ownerProfilePhoto: ownerProfilePath,
      websiteUrl: websiteUrl || '',
      facebookUrl: facebookUrl || '',
      instagramHandle: instagramHandle || '',
      whatsappNumber: whatsappNumber || '',
      products: updatedProducts,
      rating: 4.5,
      totalReviews: 0,
      owner: req.user._id,
      ownerName: req.user.username || req.user.email || '',
      ownerDp: ownerProfilePath || req.user.profileImage || '',
      // Use user-provided Agent ID or generate one if not provided
      agentId: req.body.agentId || generateShopAgentId(shopName)
    };

    console.log('Creating shop with data:', shopData);
    console.log('Generated Agent ID:', shopData.agentId);

    // Create and save the shop
    const shop = new Shop(shopData);
    const savedShop = await shop.save();

    console.log('Shop created successfully:', savedShop._id);

    res.status(201).json({
      success: true,
      message: 'Shop created successfully',
      shop: savedShop
    });

  } catch (error) {
    console.error('Error creating shop:', error);
    res.status(500).json({
      error: 'Failed to create shop',
      details: error.message
    });
  }
});

// Test endpoint to debug product creation
router.post('/test-products', ensureAuthenticated, async (req, res) => {
  try {
    console.log('🧪 TEST: Creating shop with test products...');
    
    const testShop = {
      shopName: 'Test Shop Products',
      city: 'Test City',
      shopType: 'Product Seller',
      shopDescription: 'Test shop for debugging products',
      categories: ['Electronics'],
      shopLogo: 'https://via.placeholder.com/200x200/cccccc/666666?text=Shop+Logo',
      shopBanner: 'https://via.placeholder.com/800x400/cccccc/666666?text=Shop+Banner',
      ownerProfilePhoto: 'https://via.placeholder.com/100x100/cccccc/666666?text=Profile',
      websiteUrl: '',
      facebookUrl: '',
      instagramHandle: '',
      whatsappNumber: '1234567890',
      products: [
        {
          id: 'test-1',
          name: 'Test Product 1',
          description: 'Test description 1',
          price: 100,
          discountPercentage: 10,
          category: 'Electronics',
          image: 'https://via.placeholder.com/300x200/cccccc/666666?text=Test+Product+1'
        },
        {
          id: 'test-2',
          name: 'Test Product 2',
          description: 'Test description 2',
          price: 200,
          discountPercentage: 20,
          category: 'Electronics',
          image: 'https://via.placeholder.com/300x200/cccccc/666666?text=Test+Product+2'
        }
      ],
      rating: 4.5,
      totalReviews: 0,
      owner: req.user._id,
      ownerName: req.user.username || req.user.email || '',
      ownerDp: 'https://via.placeholder.com/100x100/cccccc/666666?text=Profile',
      agentId: 'test-agent',
      approvalStatus: 'pending'
    };
    
    console.log('🧪 TEST: Test shop data:', testShop);
    console.log('🧪 TEST: Test products:', testShop.products);
    
    const shop = new Shop(testShop);
    const savedShop = await shop.save();
    
    console.log('🧪 TEST: Shop saved successfully:', savedShop._id);
    console.log('🧪 TEST: Products in saved shop:', savedShop.products);
    console.log('🧪 TEST: Number of products saved:', savedShop.products.length);
    
    res.status(201).json({
      success: true,
      message: 'Test shop created successfully',
      shop: savedShop
    });
    
  } catch (error) {
    console.error('🧪 TEST: Error creating test shop:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 