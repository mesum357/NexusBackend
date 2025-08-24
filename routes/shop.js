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

    // Set default images if none provided
    const shopLogo = req.file ? req.file.path : 'https://picsum.photos/200/200?random=1';
    const ownerDp = req.user.profileImage || 'https://picsum.photos/100/100?random=3';
    const shopBanner = 'https://picsum.photos/800/400?random=2';

    const shop = new Shop({
      shopName,
      city,
      categories: Array.isArray(businessCategories) ? businessCategories : [businessCategories],
      shopType: businessType,
      shopDescription: description,
      shopLogo: shopLogo, // Cloudinary URL or default
      shopBanner: shopBanner, // Default banner
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
      ownerDp: ownerDp, // User profile or default
      // Use user-provided Agent ID or generate one if not provided
      agentId: req.body.agentId || generateShopAgentId(shopName)
    });

    console.log('Creating shop with Agent ID:', shop.agentId);

    await shop.save();
    res.status(201).json({ 
      message: 'Shop created successfully and is pending admin approval', 
      shop 
    });
  } catch (error) {
    console.error('Error creating shop:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all shops
router.get('/all', async (req, res) => {
  try {
    const shops = await Shop.find({ approvalStatus: 'approved' }).sort({ createdAt: -1 }); // Only show approved shops
    console.log('Found shops:', shops.length);
    
    // Process each shop's products to ensure image fields are properly populated
    const processedShops = shops.map(shop => {
      const processedShop = shop.toObject();
      
      if (processedShop.products && processedShop.products.length > 0) {
        console.log(`🖼️ Processing products for shop "${processedShop.shopName}" (${processedShop.products.length} products)`);
        
        processedShop.products = processedShop.products.map((product, index) => {
          // Create a new product object to avoid modifying the original
          const processedProduct = { ...product };
          
          console.log(`   📦 Product ${index + 1} "${processedProduct.name}":`);
          console.log(`     - Original image: ${processedProduct.image || 'NOT SET'}`);
          console.log(`     - imagePreviews: ${processedProduct.imagePreviews ? JSON.stringify(processedProduct.imagePreviews) : 'NOT SET'}`);
          console.log(`     - imagePreview: ${processedProduct.imagePreview || 'NOT SET'}`);
          
          // If product has no image field or empty image, check for alternatives
          if (!processedProduct.image || processedProduct.image === '') {
            // Check if there's an imagePreviews array (from new data)
            if (processedProduct.imagePreviews && Array.isArray(processedProduct.imagePreviews) && processedProduct.imagePreviews.length > 0) {
              processedProduct.image = processedProduct.imagePreviews[0];
              console.log(`     - ✅ Using imagePreviews[0]: ${processedProduct.image}`);
            }
            // Check if there's an imagePreview field (from old data)
            else if (processedProduct.imagePreview && processedProduct.imagePreview !== '') {
              processedProduct.image = processedProduct.imagePreview;
              console.log(`     - ✅ Using imagePreview: ${processedProduct.image}`);
            } else {
              // Use placeholder if no image is available
              processedProduct.image = 'https://picsum.photos/150/150?random=4';
              console.log(`     - ⚠️ Using placeholder image: ${processedProduct.image}`);
            }
          } else {
            console.log(`     - ✅ Image already set: ${processedProduct.image}`);
          }
          
          // Ensure the image field is not undefined or null
          if (!processedProduct.image) {
            processedProduct.image = 'https://picsum.photos/150/150?random=4';
            console.log(`     - 🔄 Final fallback to placeholder: ${processedProduct.image}`);
          }
          
          console.log(`     - Final image: ${processedProduct.image}`);
          return processedProduct;
        });
      }
      
      return processedShop;
    });
    
    res.json({ shops: processedShops });
  } catch (error) {
    console.error('Error fetching shops:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint to get all shops including pending ones
router.get('/all-debug', async (req, res) => {
  try {
    const allShops = await Shop.find({}).sort({ createdAt: -1 });
    const approvedShops = allShops.filter(shop => shop.approvalStatus === 'approved');
    const pendingShops = allShops.filter(shop => shop.approvalStatus === 'pending');
    const rejectedShops = allShops.filter(shop => shop.approvalStatus === 'rejected');
    
    console.log('Debug - All shops found:', allShops.length);
    console.log('Debug - Approved shops:', approvedShops.length);
    console.log('Debug - Pending shops:', pendingShops.length);
    console.log('Debug - Rejected shops:', rejectedShops.length);
    
    res.json({ 
      allShops,
      approvedShops,
      pendingShops,
      rejectedShops,
      counts: {
        total: allShops.length,
        approved: approvedShops.length,
        pending: pendingShops.length,
        rejected: rejectedShops.length
      }
    });
  } catch (error) {
    console.error('Error fetching all shops for debug:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint to get a specific shop's data for debugging
router.get('/debug/:shopId', async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.shopId);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    
    console.log('Debug - Shop data for:', shop.shopName);
    console.log('   - ID:', shop._id);
    console.log('   - Approval Status:', shop.approvalStatus);
    console.log('   - shopLogo:', shop.shopLogo);
    console.log('   - shopBanner:', shop.shopBanner);
    console.log('   - ownerProfilePhoto:', shop.ownerProfilePhoto);
    console.log('   - Products count:', shop.products ? shop.products.length : 0);
    
    if (shop.products && shop.products.length > 0) {
      shop.products.forEach((product, index) => {
        console.log(`   - Product ${index + 1}:`, {
          name: product.name,
          image: product.image
        });
      });
    }
    
    res.json({ 
      shop,
      debug: {
        id: shop._id,
        name: shop.shopName,
        approvalStatus: shop.approvalStatus,
        images: {
          logo: shop.shopLogo,
          banner: shop.shopBanner,
          ownerProfile: shop.ownerProfilePhoto
        },
        productsCount: shop.products ? shop.products.length : 0
      }
    });
  } catch (error) {
    console.error('Error fetching shop for debug:', error);
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

// Get pending shops for current user
router.get('/my-pending-shops', ensureAuthenticated, async (req, res) => {
  try {
    console.log('Fetching pending shops for user:', req.user._id);
    const pendingShops = await Shop.find({ 
      owner: req.user._id, 
      approvalStatus: 'pending' 
    });
    console.log('Pending shops found:', pendingShops.length);
    res.json({ pendingShops });
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
    
    // Check if user is owner or admin, or if shop is approved
    const isOwner = req.isAuthenticated() && shop.owner.toString() === req.user._id.toString();
    const isAdmin = req.isAuthenticated() && req.user.isAdmin;
    
    if (!isOwner && !isAdmin && shop.approvalStatus !== 'approved') {
      return res.status(404).json({ error: 'Shop not found' });
    }
    
    // Process products to ensure image field is properly populated
    if (shop.products && shop.products.length > 0) {
      shop.products = shop.products.map(product => {
        // Create a new product object to avoid modifying the original
        const processedProduct = { ...product };
        
        // If product has no image field or empty image, check for alternatives
        if (!processedProduct.image || processedProduct.image === '') {
          // Check if there's an imagePreviews array (from new data)
          if (processedProduct.imagePreviews && Array.isArray(processedProduct.imagePreviews) && processedProduct.imagePreviews.length > 0) {
            processedProduct.image = processedProduct.imagePreviews[0];
          }
          // Check if there's an imagePreview field (from old data)
          else if (processedProduct.imagePreview && processedProduct.imagePreview !== '') {
            processedProduct.image = processedProduct.imagePreview;
          } else {
            // Use placeholder if no image is available
            processedProduct.image = 'https://picsum.photos/150/150?random=4';
          }
        }
        
        // Ensure the image field is not undefined or null
        if (!processedProduct.image) {
          processedProduct.image = 'https://picsum.photos/150/150?random=4';
        }
        
        return processedProduct;
      });
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
        shop.shopLogo = req.files.shopLogo[0].path; // Cloudinary URL
      }
      if (req.files.shopBanner) {
        shop.shopBanner = req.files.shopBanner[0].path; // Cloudinary URL
      }
      if (req.files.ownerProfilePhoto) {
        shop.ownerProfilePhoto = req.files.ownerProfilePhoto[0].path; // Cloudinary URL
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
    const newGalleryImages = req.files.map(file => file.path); // Cloudinary URLs
    
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
    
    console.log('📦 Adding product to shop:', shopId);
    console.log('📦 Product data:', { name, description, price, discountPercentage, category });
    console.log('📦 Uploaded file:', req.file);
    
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
    
    // Generate a unique ID for the product (matching wizard flow)
    const productId = Date.now().toString();
    
    // Process the image - use Cloudinary URL if uploaded, otherwise placeholder
    let productImage = 'https://picsum.photos/150/150?random=4'; // Default placeholder
    
    if (req.file && req.file.path) {
      productImage = req.file.path; // Cloudinary URL
      console.log('📦 Using uploaded image:', productImage);
    } else {
      console.log('📦 No image uploaded, using placeholder:', productImage);
    }
    
    const product = {
      id: productId, // Add ID field to match wizard schema
      name,
      description: description || '',
      price: Number(price),
      discountPercentage: Number(discountPercentage) || 0,
      category,
      image: productImage // Always set a valid image URL
    };
    
    console.log('📦 Final product object:', product);
    
    shop.products.push(product);
    await shop.save();
    
    console.log('📦 Product added successfully. Total products in shop:', shop.products.length);
    
    res.status(201).json({ 
      message: 'Product added successfully', 
      product: product,
      shop: shop 
    });
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
    
    console.log('📦 Updating product in shop:', shopId, 'at index:', productIndex);
    console.log('📦 Update data:', { name, description, price, discountPercentage, category });
    console.log('📦 Uploaded file:', req.file);
    
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
    if (description !== undefined) shop.products[idx].description = description || '';
    if (price) shop.products[idx].price = Number(price);
    if (discountPercentage !== undefined) shop.products[idx].discountPercentage = Number(discountPercentage) || 0;
    if (category) shop.products[idx].category = category;
    
    // Handle image update - only update if new image is uploaded
    if (req.file && req.file.path) {
      shop.products[idx].image = req.file.path; // Cloudinary URL
      console.log('📦 Updated product image to:', req.file.path);
    } else {
      console.log('📦 No new image uploaded, keeping existing image:', shop.products[idx].image);
    }
    
    // Ensure product has an ID (for backward compatibility)
    if (!shop.products[idx].id) {
      shop.products[idx].id = Date.now().toString();
      console.log('📦 Added missing ID to product:', shop.products[idx].id);
    }
    
    await shop.save();
    
    console.log('📦 Product updated successfully:', shop.products[idx]);
    
    res.json({ 
      message: 'Product updated successfully', 
      product: shop.products[idx],
      shop: shop 
    });
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