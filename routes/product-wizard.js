const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { ensureAuthenticated } = require('../middleware/auth');

// Create product from wizard data (JSON) - for use after payment
router.post('/create-from-wizard', ensureAuthenticated, async (req, res) => {
  try {
    console.log('📱 Product wizard creation from JSON request received');
    console.log('📱 Request body:', req.body);
    
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

    // Process image URLs - use provided URLs or fallback to placeholders
    let productImages = [];
    if (images && Array.isArray(images) && images.length > 0) {
      productImages = images;
    } else if (images && typeof images === 'string') {
      try {
        const parsedImages = JSON.parse(images);
        productImages = Array.isArray(parsedImages) ? parsedImages : [];
      } catch (parseError) {
        console.error('📱 Error parsing images JSON:', parseError);
        productImages = [];
      }
    }
    
    // If no images provided, use placeholder
    if (productImages.length === 0) {
      productImages = ['https://picsum.photos/400/400?random=1'];
    }

    // Parse specifications if it's a string
    let parsedSpecifications = {};
    if (specifications && typeof specifications === 'string') {
      try {
        parsedSpecifications = JSON.parse(specifications);
      } catch (parseError) {
        console.error('📱 Error parsing specifications JSON:', parseError);
        parsedSpecifications = {};
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
        console.error('📱 Error parsing tags JSON:', parseError);
        parsedTags = [];
      }
    } else if (Array.isArray(tags)) {
      parsedTags = tags;
    }

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
      ownerName: req.user.username || req.user.email || '',
      ownerPhone: req.user.phone || '',
      ownerEmail: req.user.email || '',
      status: 'active',
      agentId: agentId || `PROD_${Date.now()}`,
      approvalStatus: approvalStatus || 'pending' // Start with pending status
    };

    console.log('📱 Creating product with data:', productData);
    console.log('📱 Generated Agent ID:', productData.agentId);

    // Create and save the product
    const product = new Product(productData);
    const savedProduct = await product.save();

    console.log('📱 Product created successfully with ID:', savedProduct._id);
    console.log('📱 Initial approval status:', savedProduct.approvalStatus);
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
      images: ['https://picsum.photos/400/400?random=1'],
      tags: ['test', 'debug', 'electronics'],
      specifications: {
        brand: 'Test Brand',
        model: 'Test Model',
        warranty: '1 year'
      },
      contactPreference: 'both',
      owner: req.user._id,
      ownerName: req.user.username || req.user.email || '',
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
