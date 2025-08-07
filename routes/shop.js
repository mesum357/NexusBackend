const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Shop = require('../models/Shop');
const { ensureAuthenticated } = require('../middleware/auth');

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

// Get shop by ID
router.get('/:shopId', async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.shopId);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    res.json({ shop });
  } catch (error) {
    console.error('Error fetching shop:', error);
    res.status(500).json({ error: 'Failed to fetch shop' });
  }
});

// Update shop
router.put('/:shopId', ensureAuthenticated, upload.fields([
  { name: 'shopLogo', maxCount: 1 },
  { name: 'shopBanner', maxCount: 1 },
  { name: 'ownerProfilePhoto', maxCount: 1 }
]), async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.shopId);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Check if user is the shop owner
    if (shop.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only shop owner can update shop' });
    }

    const {
      shopName,
      city,
      shopType,
      shopDescription,
      categories,
      whatsappNumber,
      facebookUrl,
      instagramHandle,
      websiteUrl
    } = req.body;

    // Update shop fields
    if (shopName) shop.shopName = shopName;
    if (city) shop.city = city;
    if (shopType) shop.shopType = shopType;
    if (shopDescription) shop.shopDescription = shopDescription;
    if (categories) {
      try {
        const parsedCategories = JSON.parse(categories);
        shop.categories = Array.isArray(parsedCategories) ? parsedCategories : [parsedCategories];
      } catch (error) {
        shop.categories = Array.isArray(categories) ? categories : [categories];
      }
    }
    if (whatsappNumber) shop.whatsappNumber = whatsappNumber;
    if (facebookUrl) shop.facebookUrl = facebookUrl;
    if (instagramHandle) shop.instagramHandle = instagramHandle;
    if (websiteUrl) shop.websiteUrl = websiteUrl;

    // Handle file uploads
    if (req.files) {
      if (req.files.shopLogo) {
        // Delete old logo if exists
        if (shop.shopLogo) {
          const oldLogoPath = path.join(__dirname, '..', shop.shopLogo);
          if (fs.existsSync(oldLogoPath)) {
            fs.unlinkSync(oldLogoPath);
          }
        }
        shop.shopLogo = `/uploads/${req.files.shopLogo[0].filename}`;
      }
      if (req.files.shopBanner) {
        // Delete old banner if exists
        if (shop.shopBanner) {
          const oldBannerPath = path.join(__dirname, '..', shop.shopBanner);
          if (fs.existsSync(oldBannerPath)) {
            fs.unlinkSync(oldBannerPath);
          }
        }
        shop.shopBanner = `/uploads/${req.files.shopBanner[0].filename}`;
      }
      if (req.files.ownerProfilePhoto) {
        // Delete old profile photo if exists
        if (shop.ownerProfilePhoto) {
          const oldProfilePath = path.join(__dirname, '..', shop.ownerProfilePhoto);
          if (fs.existsSync(oldProfilePath)) {
            fs.unlinkSync(oldProfilePath);
          }
        }
        shop.ownerProfilePhoto = `/uploads/${req.files.ownerProfilePhoto[0].filename}`;
      }
    }

    await shop.save();
    res.json({ message: 'Shop updated successfully', shop });
  } catch (error) {
    console.error('Error updating shop:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete shop
router.delete('/:shopId', ensureAuthenticated, async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.shopId);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Check if user is the shop owner
    if (shop.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only shop owner can delete shop' });
    }

    // Delete associated files
    const filesToDelete = [
      shop.shopLogo,
      shop.shopBanner,
      shop.ownerProfilePhoto,
      ...(shop.gallery || [])
    ].filter(Boolean);

    filesToDelete.forEach(filePath => {
      const fullPath = path.join(__dirname, '..', filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    });

    // Delete shop products images
    if (shop.products && shop.products.length > 0) {
      shop.products.forEach(product => {
        if (product.image) {
          const productImagePath = path.join(__dirname, '..', product.image);
          if (fs.existsSync(productImagePath)) {
            fs.unlinkSync(productImagePath);
          }
        }
      });
    }

    await Shop.findByIdAndDelete(req.params.shopId);
    res.json({ message: 'Shop deleted successfully' });
  } catch (error) {
    console.error('Error deleting shop:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload gallery images
router.post('/:shopId/gallery', ensureAuthenticated, upload.array('galleryImages', 10), async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.shopId);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Check if user is the shop owner
    if (shop.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only shop owner can upload gallery images' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    // Process uploaded images
    const newGalleryImages = req.files.map(file => `/uploads/${file.filename}`);
    
    // Add new images to existing gallery
    const updatedGallery = [...(shop.gallery || []), ...newGalleryImages];
    
    // Update shop with new gallery
    shop.gallery = updatedGallery;
    await shop.save();

    res.json({ 
      success: true, 
      message: 'Gallery images uploaded successfully',
      gallery: updatedGallery
    });

  } catch (error) {
    console.error('Error uploading gallery images:', error);
    res.status(500).json({ error: 'Failed to upload gallery images' });
  }
});

// Delete gallery image
router.delete('/:shopId/gallery/:imageIndex', ensureAuthenticated, async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.shopId);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // Check if user is the shop owner
    if (shop.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only shop owner can delete gallery images' });
    }

    const imageIndex = parseInt(req.params.imageIndex);
    if (imageIndex < 0 || imageIndex >= (shop.gallery || []).length) {
      return res.status(400).json({ error: 'Invalid image index' });
    }

    // Get the image path to delete the file
    const imagePath = shop.gallery[imageIndex];
    if (imagePath) {
      const fullPath = path.join(__dirname, '..', imagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    // Remove image from gallery array
    shop.gallery.splice(imageIndex, 1);
    await shop.save();

    res.json({ 
      success: true, 
      message: 'Gallery image deleted successfully',
      gallery: shop.gallery
    });

  } catch (error) {
    console.error('Error deleting gallery image:', error);
    res.status(500).json({ error: 'Failed to delete gallery image' });
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