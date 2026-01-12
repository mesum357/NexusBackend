const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { ensureAuthenticated } = require('../middleware/auth');

// Create product from wizard data (JSON) - for use after payment
router.post('/create-from-wizard', ensureAuthenticated, async (req, res) => {
  try {
    console.log('📱 Product wizard creation from JSON request received');
    console.log('📱 Request body:', req.body);
    console.log('📱 Request headers:', req.headers);
    console.log('📱 User authenticated:', req.user._id);
    
    // Debug data types
    console.log('📱 Data type debugging:');
    console.log('  - images type:', typeof req.body.images);
    console.log('  - images value:', req.body.images);
    console.log('  - tags type:', typeof req.body.tags);
    console.log('  - tags value:', req.body.tags);
    console.log('  - specifications type:', typeof req.body.specifications);
    console.log('  - specifications value:', req.body.specifications);
    console.log('  - price type:', typeof req.body.price);
    console.log('  - price value:', req.body.price);
    
    // Debug user authentication
    console.log('📱 User authentication debugging:');
    console.log('  - req.user exists:', !!req.user);
    console.log('  - req.user._id:', req.user?._id);
    console.log('  - req.user._id type:', typeof req.user?._id);
    console.log('  - req.user.username:', req.user?.username);
    console.log('  - req.user.email:', req.user?.email);
    
    const {
      title,
      description,
      price,
      priceType,
      category,
      condition,
      location,
      city,
      images,
      tags,
      specifications,
      contactPreference,
      agentId,
      approvalStatus
    } = req.body;

    // Validate required fields
    if (!title || !description || !price || !category || !location || !city) {
      return res.status(400).json({ 
        error: 'Title, description, price, category, location, and city are required' 
      });
    }

    // Process image URLs - use provided URLs
    let productImages = [];
    if (images && Array.isArray(images) && images.length > 0) {
      productImages = images;
      console.log('📱 Using images array:', productImages.length, 'images');
      productImages.forEach((img, idx) => {
        console.log(`   Image ${idx + 1}: ${img.substring(0, 100)}...`);
      });
    } else if (images && typeof images === 'string') {
      try {
        const parsedImages = JSON.parse(images);
        productImages = Array.isArray(parsedImages) ? parsedImages : [];
        console.log('📱 Parsed images from JSON string:', productImages.length, 'images');
      } catch (parseError) {
        console.warn('📱 Could not parse images JSON, treating as string:', parseError.message);
        productImages = [images];
      }
    } else {
      console.log('📱 No images provided in request body');
    }
    
    // If no images provided, leave empty (no placeholder)
    if (productImages.length === 0) {
      console.log('📱 No images to process, setting empty array');
      productImages = [];
    }
    
    console.log('📱 Final product images array:', productImages);

    // Parse specifications if it's a string
    let parsedSpecifications = {};
    if (specifications && typeof specifications === 'string') {
      try {
        parsedSpecifications = JSON.parse(specifications);
      } catch (parseError) {
        console.warn('📱 Could not parse specifications JSON, treating as string:', parseError.message);
        parsedSpecifications = { note: specifications };
      }
    } else if (specifications && typeof specifications === 'object') {
      parsedSpecifications = specifications;
    }

    // Parse tags if it's a string
    let parsedTags = [];
    if (tags && typeof tags === 'string') {
      try {
        parsedTags = JSON.parse(tags);
      } catch (parseError) {
        console.warn('📱 Could not parse tags JSON, treating as string:', parseError.message);
        parsedTags = [tags];
      }
    } else if (Array.isArray(tags)) {
      parsedTags = tags;
    }
    
    console.log('📱 Parsed data:');
    console.log('  - images:', productImages);
    console.log('  - tags:', parsedTags);
    console.log('  - specifications:', parsedSpecifications);

    // Create product data
    const productData = {
      title,
      description,
      price: Number(price),
      priceType: priceType || 'fixed',
      category,
      condition: condition || 'used',
      location,
      city,
      images: productImages,
      tags: parsedTags,
      specifications: parsedSpecifications,
      contactPreference: contactPreference || 'both',
      featured: false,
      views: 0,
      likes: [],
      owner: req.user._id,
      ownerName: req.user.fullName || req.user.username || req.user.email || '',
      ownerPhone: req.user.phone || '',
      ownerEmail: req.user.email || '',
      status: 'active',
      agentId: agentId || `PROD_${Date.now()}`,
      approvalStatus: approvalStatus || 'pending' // Start with pending status
    };

    // Final validation check
    console.log('📱 Final validation check:');
    const requiredFields = ['title', 'description', 'price', 'category', 'location', 'city', 'owner'];
    const missingFields = requiredFields.filter(field => !productData[field]);
    
    if (missingFields.length > 0) {
      console.error('📱 Missing required fields:', missingFields);
      return res.status(400).json({
        error: 'Missing required fields',
        details: `Missing: ${missingFields.join(', ')}`
      });
    }
    
    console.log('📱 All required fields present ✓');

    console.log('📱 Creating product with data:', productData);
    console.log('📱 Generated Agent ID:', productData.agentId);
    console.log('📱 Required fields check:');
    console.log('  - title:', !!productData.title);
    console.log('  - description:', !!productData.description);
    console.log('  - price:', !!productData.price);
    console.log('  - category:', !!productData.category);
    console.log('  - location:', !!productData.location);
    console.log('  - city:', !!productData.city);
    console.log('  - owner:', !!productData.owner);
    
    // Debug the final data structure
    console.log('📱 Final productData structure:');
    console.log('  - images length:', productData.images?.length);
    console.log('  - tags length:', productData.tags?.length);
    console.log('  - specifications keys:', Object.keys(productData.specifications || {}));
    console.log('  - price:', productData.price);
    console.log('  - priceType:', productData.priceType);
    console.log('  - condition:', productData.condition);
    console.log('  - contactPreference:', productData.contactPreference);

    // Create and save the product
    console.log('📱 Attempting to save product to database...');
    
    // Test if the model can be created with this data
    try {
      const testProduct = new Product(productData);
      console.log('📱 Model validation passed, test product created successfully');
    } catch (validationError) {
      console.error('📱 Model validation failed:', validationError);
      console.error('📱 Validation error details:', validationError.errors);
      
      // Log each validation error in detail
      if (validationError.errors) {
        Object.keys(validationError.errors).forEach(field => {
          const error = validationError.errors[field];
          console.error(`📱 Field '${field}' validation error:`, {
            kind: error.kind,
            value: error.value,
            message: error.message,
            path: error.path
          });
        });
      }
      
      return res.status(400).json({
        error: 'Product data validation failed',
        details: validationError.message,
        validationErrors: validationError.errors
      });
    }
    
    // Check MongoDB connection status
    const mongoose = require('mongoose');
    const dbState = mongoose.connection.readyState;
    console.log('📱 MongoDB connection state:', dbState);
    console.log('📱 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting');

    if (dbState !== 1) {
      console.error('📱 MongoDB not connected, current state:', dbState);
      return res.status(500).json({
        error: 'Database connection not available',
        details: 'MongoDB connection state: ' + dbState
      });
    }

    const product = new Product(productData);
    const savedProduct = await product.save();

    console.log('📱 Product created successfully with ID:', savedProduct._id);
    console.log('📱 Initial approval status:', savedProduct.approvalStatus);
    console.log('📱 Images saved to database:', savedProduct.images?.length || 0);
    if (savedProduct.images && savedProduct.images.length > 0) {
      console.log('   First image:', savedProduct.images[0].substring(0, 100) + '...');
    }
    console.log('📱 Product will be visible after admin approval');

    res.status(201).json({
      success: true,
      message: 'Product created successfully and is pending admin approval',
      product: savedProduct
    });

  } catch (error) {
    console.error('📱 Error creating product from wizard:', error);
    res.status(500).json({
      error: 'Failed to create product',
      details: error.message
    });
  }
});

// Test endpoint with minimal required fields only
router.post('/test-minimal', ensureAuthenticated, async (req, res) => {
  try {
    console.log('🧪 MINIMAL TEST: Creating product with minimal fields...');

    const minimalProduct = {
      title: 'Minimal Test Product',
      description: 'Minimal test product description',
      price: 1000,
      category: 'Test Category',
      location: 'Test Location',
      city: 'Test City',
      owner: req.user._id,
      ownerName: req.user.fullName || req.user.username || req.user.email || '',
      ownerPhone: req.user.phone || '',
      ownerEmail: req.user.email || '',
      agentId: `PROD_${Date.now()}`,
      approvalStatus: 'pending'
    };

    console.log('🧪 MINIMAL TEST: Minimal product data:', minimalProduct);

    const product = new Product(minimalProduct);
    const savedProduct = await product.save();

    console.log('🧪 MINIMAL TEST: Minimal product created successfully:', savedProduct._id);

    res.status(201).json({
      success: true,
      message: 'Minimal product created successfully',
      product: savedProduct
    });

  } catch (error) {
    console.error('🧪 MINIMAL TEST: Error creating minimal product:', error);
    console.error('🧪 MINIMAL TEST: Error stack:', error.stack);
    console.error('🧪 MINIMAL TEST: Error name:', error.name);
    console.error('🧪 MINIMAL TEST: Error message:', error.message);
    
    if (error.name === 'ValidationError') {
      console.error('🧪 MINIMAL TEST: Mongoose validation errors:', error.errors);
    }
    
    res.status(500).json({
      error: 'Failed to create minimal product',
      details: error.message
    });
  }
});

// Test endpoint to debug product creation
router.post('/test-product', ensureAuthenticated, async (req, res) => {
  try {
    console.log('🧪 TEST: Creating test product...');

    const testProduct = {
      title: 'Test Product',
      description: 'Test product description for debugging',
      price: 1000,
      priceType: 'fixed',
      category: 'Electronics',
      condition: 'new',
      location: 'Test Location',
      city: 'Test City',
      images: [],
      tags: ['test', 'debug', 'electronics'],
      specifications: {
        brand: 'Test Brand',
        model: 'Test Model',
        warranty: '1 year'
      },
      contactPreference: 'both',
      owner: req.user._id,
      ownerName: req.user.fullName || req.user.username || req.user.email || '',
      ownerPhone: req.user.phone || '',
      ownerEmail: req.user.email || '',
      agentId: `PROD_${Date.now()}`,
      approvalStatus: 'pending'
    };

    const product = new Product(testProduct);
    const savedProduct = await product.save();

    console.log('🧪 TEST: Product created successfully:', savedProduct._id);

    res.status(201).json({
      success: true,
      message: 'Test product created successfully',
      product: savedProduct
    });

  } catch (error) {
    console.error('🧪 TEST: Error creating test product:', error);
    res.status(500).json({
      error: 'Failed to create test product',
      details: error.message
    });
  }
});

module.exports = router;
