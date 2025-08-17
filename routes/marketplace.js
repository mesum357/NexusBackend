const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Product = require('../models/Product');
const { ensureAuthenticated } = require('../middleware/auth');
const { upload: cloudinaryUpload, cloudinary } = require('../middleware/cloudinary');

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
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

// Get all products with filters
router.get('/', async (req, res) => {
  try {
    const {
      search,
      category,
      city,
      condition,
      priceMin,
      priceMax,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    // Build filter object
    const filter = { status: 'active' };
    
    if (search) {
      filter.$text = { $search: search };
    }
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (city && city !== 'all') {
      filter.city = city;
    }
    
    if (condition) {
      filter.condition = condition;
    }
    
    if (priceMin || priceMax) {
      filter.price = {};
      if (priceMin) filter.price.$gte = Number(priceMin);
      if (priceMax) filter.price.$lte = Number(priceMax);
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    const products = await Product.find({ ...filter, approvalStatus: 'approved' }) // Only show approved products
      .populate('owner', 'username fullName email profileImage city')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    const total = await Product.countDocuments(filter);

    res.json({
      products,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / limit),
        totalProducts: total,
        hasNext: skip + products.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('owner', 'username fullName email profileImage city');

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Check if user is owner or admin, or if product is approved
    const isOwner = req.isAuthenticated() && product.owner.toString() === req.user._id.toString();
    const isAdmin = req.isAuthenticated() && req.user.isAdmin;
    
    if (!isOwner && !isAdmin && product.approvalStatus !== 'approved') {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Increment views
    product.views += 1;
    await product.save();

    res.json({ product });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create new product (authenticated)
router.post('/', ensureAuthenticated, upload.array('images', 10), async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      priceType,
      category,
      condition,
      location,
      city,
      tags,
      specifications,
      contactPreference,
      ownerPhone,
      ownerEmail
    } = req.body;

    // Validate required fields
    if (!title || !description || !price || !category || !location || !city) {
      return res.status(400).json({ 
        error: 'Title, description, price, category, location, and city are required' 
      });
    }

    // Handle image uploads
    const images = req.files ? req.files.map(file => file.path) : []; // Cloudinary URLs

    // Parse specifications if provided
    let parsedSpecifications = {};
    if (specifications) {
      try {
        parsedSpecifications = JSON.parse(specifications);
      } catch (e) {
        console.error('Error parsing specifications:', e);
      }
    }

    // Parse tags if provided
    let parsedTags = [];
    if (tags) {
      try {
        parsedTags = JSON.parse(tags);
      } catch (e) {
        console.error('Error parsing tags:', e);
      }
    }

    const product = new Product({
      title,
      description,
      price: Number(price),
      priceType: priceType || 'fixed',
      category,
      condition: condition || 'used',
      location,
      city,
      images,
      tags: parsedTags,
      specifications: parsedSpecifications,
      contactPreference: contactPreference || 'both',
      owner: req.user._id,
      ownerName: req.user.fullName || req.user.username || req.user.email,
      ownerPhone: ownerPhone || req.user.phone || '',
      ownerEmail: ownerEmail || req.user.email || ''
    });

    await product.save();
    res.status(201).json({ 
      message: 'Product created successfully and is pending admin approval',
      product 
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product (owner only)
router.put('/:id', ensureAuthenticated, upload.array('images', 10), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check ownership
    if (product.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to update this product' });
    }

    const updateData = { ...req.body };
    
    // Handle existing images
    let finalImages = [];
    if (updateData.existingImages) {
      try {
        const existingImages = JSON.parse(updateData.existingImages);
        finalImages = existingImages;
      } catch (e) {
        console.error('Error parsing existing images:', e);
      }
    }

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => file.path); // Cloudinary URLs
      finalImages = [...finalImages, ...newImages];
    }

    // Update images array
    if (finalImages.length > 0) {
      updateData.images = finalImages;
    }

    // Parse specifications and tags if provided
    if (updateData.specifications) {
      try {
        updateData.specifications = JSON.parse(updateData.specifications);
      } catch (e) {
        console.error('Error parsing specifications:', e);
      }
    }

    if (updateData.tags) {
      try {
        updateData.tags = JSON.parse(updateData.tags);
      } catch (e) {
        console.error('Error parsing tags:', e);
      }
    }

    // Convert price to number if provided
    if (updateData.price) {
      updateData.price = Number(updateData.price);
    }

    // Remove fields that shouldn't be updated
    delete updateData.existingImages;

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('owner', 'username fullName email profileImage city');

    res.json({ product: updatedProduct });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product (owner only)
router.delete('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check ownership
    if (product.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this product' });
    }

    // Delete associated images
    if (product.images && product.images.length > 0) {
      product.images.forEach(imagePath => {
        const fullPath = path.join(__dirname, '..', imagePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Like/unlike product
router.post('/:id/like', ensureAuthenticated, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const userId = req.user._id;
    const index = product.likes.indexOf(userId);
    
    if (index === -1) {
      product.likes.push(userId);
    } else {
      product.likes.splice(index, 1);
    }

    await product.save();
    res.json({ liked: index === -1, likesCount: product.likes.length });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// Get user's products
router.get('/user/my-products', ensureAuthenticated, async (req, res) => {
  try {
    const products = await Product.find({ owner: req.user._id })
      .sort({ createdAt: -1 });
    
    res.json({ products });
  } catch (error) {
    console.error('Error fetching user products:', error);
    res.status(500).json({ error: 'Failed to fetch user products' });
  }
});

// Get pending products for current user
router.get('/user/my-pending-products', ensureAuthenticated, async (req, res) => {
  try {
    const pendingProducts = await Product.find({ 
      owner: req.user._id, 
      approvalStatus: 'pending' 
    }).sort({ createdAt: -1 });
    
    res.json({ pendingProducts });
  } catch (error) {
    console.error('Error fetching pending products:', error);
    res.status(500).json({ error: 'Failed to fetch pending products' });
  }
});

// Get categories with counts
router.get('/categories/stats', async (req, res) => {
  try {
    const stats = await Product.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({ categories: stats });
  } catch (error) {
    console.error('Error fetching category stats:', error);
    res.status(500).json({ error: 'Failed to fetch category stats' });
  }
});

module.exports = router; 