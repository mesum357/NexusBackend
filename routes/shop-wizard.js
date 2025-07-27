const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Shop = require('../models/Shop');
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Not authenticated' });
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

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

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Advanced shop creation with multiple files
router.post('/create', ensureAuthenticated, upload.fields([
  { name: 'shopLogo', maxCount: 1 },
  { name: 'shopBanner', maxCount: 1 },
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

    if (req.files.shopLogo) {
      shopLogoPath = `/uploads/${req.files.shopLogo[0].filename}`;
    }

    if (req.files.shopBanner) {
      shopBannerPath = `/uploads/${req.files.shopBanner[0].filename}`;
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
        image: productImage ? `/uploads/${productImage.filename}` : '',
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
      websiteUrl: websiteUrl || '',
      facebookUrl: facebookUrl || '',
      instagramHandle: instagramHandle || '',
      whatsappNumber: whatsappNumber || '',
      products: updatedProducts,
      rating: 4.5,
      totalReviews: 0,
      owner: req.user._id,
      ownerName: req.user.username || req.user.email || '',
      ownerDp: req.user.profileImage || ''
    };

    console.log('Creating shop with data:', shopData);

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

module.exports = router; 