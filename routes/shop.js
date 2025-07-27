const express = require('express');
const router = express.Router();
const Shop = require('../models/Shop');
const upload = require('../middleware/upload');

const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Not authenticated' });
};

// Create basic shop
router.post('/create', ensureAuthenticated, upload.single('shopLogo'), async (req, res) => {
  try {
    const {
      shopName,
      city,
      businessCategories,
      businessType,
      description,
      facebook,
      instagram,
      whatsapp
    } = req.body;

    const shop = new Shop({
      shopName,
      city,
      categories: Array.isArray(businessCategories) ? businessCategories : [businessCategories],
      shopType: businessType,
      shopDescription: description,
      shopLogo: req.file ? `/uploads/${req.file.filename}` : null,
      facebookUrl: facebook || '',
      instagramHandle: instagram || '',
      whatsappNumber: whatsapp || '',
      // Legacy fields for backward compatibility
      businessCategories: Array.isArray(businessCategories) ? businessCategories : [businessCategories],
      businessType,
      description,
      socialLinks: {
        facebook: facebook || '',
        instagram: instagram || '',
        whatsapp: whatsapp || ''
      },
      owner: req.user._id,
      ownerName: req.user.username || req.user.email || '',
      ownerDp: req.user.profileImage || ''
    });

    await shop.save();
    res.status(201).json({ message: 'Shop created successfully', shop });
  } catch (error) {
    console.error('Error creating shop:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all shops
router.get('/all', async (req, res) => {
  try {
    const shops = await Shop.find().sort({ createdAt: -1 });
    console.log('Found shops:', shops.length);
    res.json({ shops });
  } catch (error) {
    console.error('Error fetching shops:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all shops owned by the current user
router.get('/my-shops', ensureAuthenticated, async (req, res) => {
  try {
    console.log('Fetching shops for user:', req.user._id);
    const shops = await Shop.find({ owner: req.user._id });
    console.log('Shops found:', shops.length);
    res.json({ shops });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single shop by ID
router.get('/:id', async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    res.json({ shop });
  } catch (error) {
    console.error('Error fetching shop:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add product to existing shop
router.post('/:id/add-product', ensureAuthenticated, upload.single('productImage'), async (req, res) => {
  try {
    const shopId = req.params.id;
    const { name, description, price, discountPercentage, category } = req.body;
    if (!name || !price || !category) {
      return res.status(400).json({ error: 'Name, price, and category are required' });
    }
    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    if (!req.user || String(shop.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: 'You are not authorized to add products to this shop' });
    }
    const product = {
      name,
      description,
      price: Number(price),
      discountPercentage: Number(discountPercentage) || 0,
      category,
      image: req.file ? `/uploads/${req.file.filename}` : ''
    };
    shop.products.push(product);
    await shop.save();
    res.status(201).json({ message: 'Product added successfully', shop });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update product in existing shop
router.put('/:shopId/update-product/:productIndex', ensureAuthenticated, upload.single('productImage'), async (req, res) => {
  try {
    const { shopId, productIndex } = req.params;
    const { name, description, price, discountPercentage, category } = req.body;
    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    if (!req.user || String(shop.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: 'You are not authorized to update products in this shop' });
    }
    const idx = parseInt(productIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= shop.products.length) {
      return res.status(400).json({ error: 'Invalid product index' });
    }
    // Update product fields
    if (name) shop.products[idx].name = name;
    if (description) shop.products[idx].description = description;
    if (price) shop.products[idx].price = Number(price);
    if (discountPercentage !== undefined) shop.products[idx].discountPercentage = Number(discountPercentage) || 0;
    if (category) shop.products[idx].category = category;
    if (req.file) shop.products[idx].image = `/uploads/${req.file.filename}`;
    await shop.save();
    res.json({ message: 'Product updated successfully', shop });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete product from existing shop
router.delete('/:shopId/delete-product/:productIndex', ensureAuthenticated, async (req, res) => {
  try {
    const { shopId, productIndex } = req.params;
    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    if (!req.user || String(shop.owner) !== String(req.user._id)) {
      return res.status(403).json({ error: 'You are not authorized to delete products from this shop' });
    }
    const idx = parseInt(productIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= shop.products.length) {
      return res.status(400).json({ error: 'Invalid product index' });
    }
    // Remove the product at the specified index
    shop.products.splice(idx, 1);
    await shop.save();
    res.json({ message: 'Product deleted successfully', shop });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 