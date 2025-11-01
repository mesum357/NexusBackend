const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const Institute = require('../models/Institute');
const Hospital = require('../models/Hospital');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const PaymentRequest = require('../models/PaymentRequest');
const User = require('../models/User');
// const bcrypt = require('bcrypt'); // No longer needed

// Get all pending entities for approval (no authentication required for admin panel)
router.get('/pending-entities', async (req, res) => {
  try {
    const [pendingInstitutes, pendingHospitals, pendingShops, pendingProducts] = await Promise.all([
      Institute.find({ approvalStatus: 'pending' }).populate('owner', 'username email fullName'),
      Hospital.find({ approvalStatus: 'pending' }).populate('owner', 'username email fullName'),
      Shop.find({ approvalStatus: 'pending' }).populate('owner', 'username email fullName'),
      Product.find({ approvalStatus: 'pending' }).populate('owner', 'username email fullName')
    ]);

    res.json({
      institutes: pendingInstitutes,
      hospitals: pendingHospitals,
      shops: pendingShops,
      products: pendingProducts
    });
  } catch (error) {
    console.error('Error fetching pending entities:', error);
    res.status(500).json({ error: 'Failed to fetch pending entities' });
  }
});

// Public endpoint for pending entities (no authentication required)
router.get('/public/pending-entities', async (req, res) => {
  try {
    const [pendingInstitutes, pendingHospitals, pendingShops, pendingProducts] = await Promise.all([
      Institute.find({ approvalStatus: 'pending' }).populate('owner', 'username email fullName'),
      Hospital.find({ approvalStatus: 'pending' }).populate('owner', 'username email fullName'),
      Shop.find({ approvalStatus: 'pending' }).populate('owner', 'username email fullName'),
      Product.find({ approvalStatus: 'pending' }).populate('owner', 'username email fullName')
    ]);

    // Add entityType to each entity for frontend identification
    const institutes = pendingInstitutes.map(inst => ({ ...inst.toObject(), entityType: 'institute' }));
    const hospitals = pendingHospitals.map(hosp => ({ ...hosp.toObject(), entityType: 'hospital' }));
    const shops = pendingShops.map(shop => ({ ...shop.toObject(), entityType: 'shop' }));
    const products = pendingProducts.map(prod => ({ ...prod.toObject(), entityType: 'product' }));

    res.json({
      institutes,
      hospitals,
      shops,
      products
    });
  } catch (error) {
    console.error('Error fetching pending entities:', error);
    res.status(500).json({ error: 'Failed to fetch pending entities' });
  }
});

// Approve/Reject Institute (no authentication required for admin panel)
router.put('/institute/:id/approval', async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "approved" or "rejected"' });
    }

    const institute = await Institute.findById(req.params.id);
    if (!institute) {
      return res.status(404).json({ error: 'Institute not found' });
    }

    institute.approvalStatus = status;
    institute.approvalNotes = notes || '';
    institute.approvedBy = null; // No authentication required
    institute.approvedAt = new Date();
    
    // If approved, also set verified to true
    if (status === 'approved') {
      institute.verified = true;
    }

    await institute.save();

    res.json({ 
      success: true, 
      message: `Institute ${status} successfully`,
      institute 
    });
  } catch (error) {
    console.error('Error updating institute approval:', error);
    res.status(500).json({ error: 'Failed to update institute approval' });
  }
});

// Approve/Reject Shop (no authentication required for admin panel)
router.put('/shop/:id/approval', async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "approved" or "rejected"' });
    }

    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    shop.approvalStatus = status;
    shop.approvalNotes = notes || '';
    shop.approvedBy = null; // No authentication required
    shop.approvedAt = new Date();

    await shop.save();

    console.log(`✅ Shop "${shop.shopName}" manually ${status} by admin`);
    console.log(`📝 Approval status: ${shop.approvalStatus}`);
    console.log(`📝 Approval notes: ${shop.approvalNotes}`);

    res.json({ 
      success: true, 
      message: `Shop ${status} successfully`,
      shop 
    });
  } catch (error) {
    console.error('Error updating shop approval:', error);
    res.status(500).json({ error: 'Failed to update shop approval' });
  }
});

// Manual shop approval by agentId (useful for troubleshooting)
router.put('/shop/approve-by-agent/:agentId', async (req, res) => {
  try {
    const { notes } = req.body;
    const { agentId } = req.params;
    
    console.log(`🔍 Looking for shop with agentId: ${agentId}`);
    
    const shop = await Shop.findOne({ agentId });
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found with this agent ID' });
    }

    console.log(`✅ Found shop: ${shop.shopName} (ID: ${shop._id})`);
    console.log(`📝 Current approval status: ${shop.approvalStatus}`);

    shop.approvalStatus = 'approved';
    shop.approvalNotes = notes || 'Manually approved by admin';
    shop.approvedBy = null; // No authentication required
    shop.approvedAt = new Date();

    await shop.save();

    console.log(`✅ Shop "${shop.shopName}" manually approved by agentId`);
    console.log(`📝 New approval status: ${shop.approvalStatus}`);

    res.json({ 
      success: true, 
      message: `Shop approved successfully by agent ID`,
      shop 
    });
  } catch (error) {
    console.error('Error approving shop by agent ID:', error);
    res.status(500).json({ error: 'Failed to approve shop' });
  }
});

// Debug endpoint to check shop approval status and payment requests
router.get('/debug/shop-approval/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    
    console.log(`🔍 Debug: Checking shop approval for agentId: ${agentId}`);
    
    // Find the shop
    const shop = await Shop.findOne({ agentId });
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found with this agent ID' });
    }
    
    // Find associated payment requests
    const paymentRequests = await PaymentRequest.find({ 
      $or: [
        { agentId: agentId },
        { entityId: shop._id },
        { entityType: 'shop', user: shop.owner }
      ]
    }).populate('user', 'username email');
    
    console.log(`✅ Debug: Shop found: ${shop.shopName}`);
    console.log(`📝 Debug: Shop approval status: ${shop.approvalStatus}`);
    console.log(`📝 Debug: Payment requests found: ${paymentRequests.length}`);
    
    const debugInfo = {
      shop: {
        id: shop._id,
        name: shop.shopName,
        agentId: shop.agentId,
        approvalStatus: shop.approvalStatus,
        approvalNotes: shop.approvalNotes,
        approvedAt: shop.approvedAt,
        createdAt: shop.createdAt,
        owner: shop.owner
      },
      paymentRequests: paymentRequests.map(pr => ({
        id: pr._id,
        status: pr.status,
        entityType: pr.entityType,
        entityId: pr.entityId,
        agentId: pr.agentId,
        amount: pr.amount,
        transactionId: pr.transactionId,
        verifiedAt: pr.verifiedAt,
        verificationNotes: pr.verificationNotes,
        user: pr.user
      })),
      summary: {
        shopApproved: shop.approvalStatus === 'approved',
        hasPaymentRequests: paymentRequests.length > 0,
        verifiedPayments: paymentRequests.filter(pr => pr.status === 'verified').length,
        pendingPayments: paymentRequests.filter(pr => pr.status === 'pending').length,
        rejectedPayments: paymentRequests.filter(pr => pr.status === 'rejected').length
      }
    };
    
    console.log(`📊 Debug: Summary:`, debugInfo.summary);
    
    res.json(debugInfo);
    
  } catch (error) {
    console.error('Error in shop approval debug:', error);
    res.status(500).json({ error: 'Failed to debug shop approval' });
  }
});

// Approve/Reject Hospital (no authentication required for admin panel)
router.put('/hospital/:id/approval', async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "approved" or "rejected"' });
    }

    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    hospital.approvalStatus = status;
    hospital.approvalNotes = notes || '';
    hospital.approvedBy = null; // No authentication required
    hospital.approvedAt = new Date();
    
    // If approved, also set verified to true
    if (status === 'approved') {
      hospital.verified = true;
    }

    await hospital.save();

    res.json({ 
      success: true, 
      message: `Hospital ${status} successfully`,
      hospital 
    });
  } catch (error) {
    console.error('Error updating hospital approval:', error);
    res.status(500).json({ error: 'Failed to update hospital approval' });
  }
});

// Approve/Reject Product (no authentication required for admin panel)
router.put('/product/:id/approval', async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "approved" or "rejected"' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    product.approvalStatus = status;
    product.approvalNotes = notes || '';
    product.approvedBy = null; // No authentication required
    product.approvedAt = new Date();

    await product.save();

    res.json({ 
      success: true, 
      message: `Product ${status} successfully`,
      product 
    });
  } catch (error) {
    console.error('Error updating product approval:', error);
    res.status(500).json({ error: 'Failed to update product approval' });
  }
});

const mongoose = require('mongoose');

// Guard: ensure DB connection is ready for admin endpoints
router.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Database not connected. Please try again shortly.' });
  }
  next();
});

// Get all payment requests for admin review (no authentication required for admin panel)
router.get('/payment-requests', async (req, res) => {
  try {
    const { status, entityType, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (entityType) filter.entityType = entityType;

    const paymentRequests = await PaymentRequest.find(filter)
      .populate('user', 'username email fullName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await PaymentRequest.countDocuments(filter);

    res.json({
      paymentRequests,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching payment requests:', error);
    res.status(500).json({ error: 'Failed to fetch payment requests' });
  }
});

// Update payment request status (no authentication required for admin panel)
router.put('/payment-request/:id/status', async (req, res) => {
  try {
    const { status, verificationNotes } = req.body;
    
    if (!['verified', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const paymentRequest = await PaymentRequest.findById(req.params.id);
    if (!paymentRequest) {
      return res.status(404).json({ error: 'Payment request not found' });
    }

    paymentRequest.status = status;
    paymentRequest.verificationNotes = verificationNotes || '';
    paymentRequest.verifiedBy = null; // No authentication required
    paymentRequest.verifiedAt = new Date();

    await paymentRequest.save();

    // If payment is verified, automatically approve the associated entity
    if (status === 'verified') {
      try {
        let entity = null;
        let entityType = paymentRequest.entityType;
        
        // First try to find entity by agentId if available
        if (paymentRequest.agentId) {
          console.log(`🔍 Looking for ${entityType} with agentId: ${paymentRequest.agentId}`);
          
          switch (entityType) {
            case 'shop':
              entity = await Shop.findOne({ agentId: paymentRequest.agentId });
              break;
            case 'institute':
              entity = await Institute.findOne({ agentId: paymentRequest.agentId });
              break;
            case 'hospital':
              entity = await Hospital.findOne({ agentId: paymentRequest.agentId });
              break;
            case 'marketplace':
            case 'product':
              entity = await Product.findOne({ agentId: paymentRequest.agentId });
              break;
          }
          
          if (entity) {
            console.log(`✅ Found ${entityType} by agentId: ${entity.name || entity.shopName || entity.hospitalName || entity.title} (ID: ${entity._id})`);
          }
        }
        
        // If entity not found by agentId, try to find by entityId
        if (!entity && paymentRequest.entityId) {
          console.log(`🔍 Trying to find ${entityType} by entityId: ${paymentRequest.entityId}`);
          
          switch (entityType) {
            case 'shop':
              entity = await Shop.findById(paymentRequest.entityId);
              break;
            case 'institute':
              entity = await Institute.findById(paymentRequest.entityId);
              break;
            case 'hospital':
              entity = await Hospital.findById(paymentRequest.entityId);
              break;
            case 'marketplace':
            case 'product':
              entity = await Product.findById(paymentRequest.entityId);
              break;
          }
          
          if (entity) {
            console.log(`✅ Found ${entityType} by entityId: ${entity.name || entity.shopName || entity.hospitalName || entity.title} (ID: ${entity._id})`);
          }
        }
        
        // If still no entity found, try to find by user and entityType (for cases where neither agentId nor entityId is available)
        if (!entity) {
          console.log(`🔍 Trying to find ${entityType} by user: ${paymentRequest.user} and entityType: ${entityType}`);
          
          switch (entityType) {
            case 'shop':
              entity = await Shop.findOne({ owner: paymentRequest.user, approvalStatus: 'pending' });
              break;
            case 'institute':
              entity = await Institute.findOne({ owner: paymentRequest.user, approvalStatus: 'pending' });
              break;
            case 'hospital':
              entity = await Hospital.findOne({ owner: paymentRequest.user, approvalStatus: 'pending' });
              break;
            case 'marketplace':
            case 'product':
              entity = await Product.findOne({ owner: paymentRequest.user, approvalStatus: 'pending' });
              break;
          }
          
          if (entity) {
            console.log(`✅ Found ${entityType} by user: ${entity.name || entity.shopName || entity.hospitalName || entity.title} (ID: ${entity._id})`);
          }
        }
        
        // If entity is found, approve it
        if (entity) {
          console.log(`📝 Current approval status: ${entity.approvalStatus}`);
          
          // Update entity approval status
          entity.approvalStatus = 'approved';
          entity.approvalNotes = 'Payment verified - automatically approved';
          entity.approvedBy = null; // No authentication required
          entity.approvedAt = new Date();
          
          // Set verified field for entities that have it
          if (entity.verified !== undefined) {
            entity.verified = true;
          }
          
          await entity.save();
          
          const entityName = entity.name || entity.shopName || entity.hospitalName || entity.title;
          console.log(`✅ ${entityType} "${entityName}" automatically approved after payment verification`);
          console.log(`📝 New approval status: ${entity.approvalStatus}`);
        } else {
          console.log(`⚠️ No ${entityType} found to auto-approve for this payment request`);
          console.log(`   - Payment Request ID: ${paymentRequest._id}`);
          console.log(`   - Entity Type: ${paymentRequest.entityType}`);
          console.log(`   - Agent ID: ${paymentRequest.agentId || 'Not provided'}`);
          console.log(`   - Entity ID: ${paymentRequest.entityId || 'Not provided'}`);
          console.log(`   - User: ${paymentRequest.user}`);
        }
      } catch (entityUpdateError) {
        console.error(`❌ Error updating ${paymentRequest.entityType} approval status:`, entityUpdateError);
        console.error('Entity update error details:', {
          message: entityUpdateError.message,
          stack: entityUpdateError.stack
        });
        // Don't fail the payment verification if entity update fails
      }
    }

    res.json({ 
      success: true, 
      message: `Payment request ${status} successfully`,
      paymentRequest 
    });
  } catch (error) {
    console.error('Error updating payment request status:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      paymentRequestId: req.params.id,
      status: req.body.status
    });
    res.status(500).json({ 
      error: 'Failed to update payment request status',
      details: error.message 
    });
  }
});

// Get admin dashboard statistics (no authentication required for admin panel)
router.get('/stats', async (req, res) => {
  try {
    const [
      totalInstitutes,
      pendingInstitutes,
      totalShops,
      pendingShops,
      totalProducts,
      pendingProducts,
      totalPaymentRequests,
      pendingPaymentRequests
    ] = await Promise.all([
      Institute.countDocuments(),
      Institute.countDocuments({ approvalStatus: 'pending' }),
      Shop.countDocuments(),
      Shop.countDocuments({ approvalStatus: 'pending' }),
      Product.countDocuments(),
      Product.countDocuments({ approvalStatus: 'pending' }),
      PaymentRequest.countDocuments(),
      PaymentRequest.countDocuments({ status: 'pending' })
    ]);

    res.json({
      entities: {
        institutes: { total: totalInstitutes, pending: pendingInstitutes },
        shops: { total: totalShops, pending: pendingShops },
        products: { total: totalProducts, pending: pendingProducts }
      },
      payments: {
        total: totalPaymentRequests,
        pending: pendingPaymentRequests
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch admin statistics' });
  }
});

// Freeze a user (no authentication required for admin panel)
router.put('/user/:id/freeze', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isFrozen = true;
    await user.save();

    res.json({ 
      success: true, 
      message: 'User frozen successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isFrozen: user.isFrozen
      }
    });
  } catch (error) {
    console.error('Error freezing user:', error);
    res.status(500).json({ error: 'Failed to freeze user' });
  }
});

// Unfreeze a user (no authentication required for admin panel)
router.put('/user/:id/unfreeze', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isFrozen = false;
    await user.save();

    res.json({ 
      success: true, 
      message: 'User unfrozen successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isFrozen: user.isFrozen
      }
    });
  } catch (error) {
    console.error('Error unfreezing user:', error);
    res.status(500).json({ error: 'Failed to unfreeze user' });
  }
});

// Delete a user (no authentication required for admin panel)
router.delete('/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user and all associated data
    // Note: You may want to add cascading deletes for related entities
    await User.findByIdAndDelete(req.params.id);

    res.json({ 
      success: true, 
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get all shops for admin management (no authentication required for admin panel)
router.get('/shops', async (req, res) => {
  try {
    const shops = await Shop.find({}).sort({ createdAt: -1 }).populate('owner', 'username email fullName');
    res.json({ shops });
  } catch (error) {
    console.error('Error fetching shops:', error);
    res.status(500).json({ error: 'Failed to fetch shops' });
  }
});

// Get all hospitals for admin management (no authentication required for admin panel)
router.get('/hospitals', async (req, res) => {
  try {
    const hospitals = await Hospital.find({}).sort({ createdAt: -1 }).populate('owner', 'username email fullName');
    res.json({ hospitals });
  } catch (error) {
    console.error('Error fetching hospitals:', error);
    res.status(500).json({ error: 'Failed to fetch hospitals' });
  }
});

// Get all institutes for admin management (no authentication required for admin panel)
router.get('/institutes', async (req, res) => {
  try {
    const institutes = await Institute.find({}).sort({ createdAt: -1 }).populate('owner', 'username email fullName');
    res.json({ institutes });
  } catch (error) {
    console.error('Error fetching institutes:', error);
    res.status(500).json({ error: 'Failed to fetch institutes' });
  }
});

// Get all products for admin management (no authentication required for admin panel)
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 }).populate('owner', 'username email fullName');
    res.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Freeze a shop (no authentication required for admin panel)
router.put('/shop/:id/freeze', async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    shop.isFrozen = true;
    await shop.save();

    res.json({ 
      success: true, 
      message: 'Shop frozen successfully',
      shop: {
        id: shop._id,
        shopName: shop.shopName,
        isFrozen: shop.isFrozen
      }
    });
  } catch (error) {
    console.error('Error freezing shop:', error);
    res.status(500).json({ error: 'Failed to freeze shop' });
  }
});

// Unfreeze a shop (no authentication required for admin panel)
router.put('/shop/:id/unfreeze', async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    shop.isFrozen = false;
    await shop.save();

    res.json({ 
      success: true, 
      message: 'Shop unfrozen successfully',
      shop: {
        id: shop._id,
        shopName: shop.shopName,
        isFrozen: shop.isFrozen
      }
    });
  } catch (error) {
    console.error('Error unfreezing shop:', error);
    res.status(500).json({ error: 'Failed to unfreeze shop' });
  }
});

// Freeze a hospital (no authentication required for admin panel)
router.put('/hospital/:id/freeze', async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    hospital.isFrozen = true;
    await hospital.save();

    res.json({ 
      success: true, 
      message: 'Hospital frozen successfully',
      hospital: {
        id: hospital._id,
        name: hospital.name,
        isFrozen: hospital.isFrozen
      }
    });
  } catch (error) {
    console.error('Error freezing hospital:', error);
    res.status(500).json({ error: 'Failed to freeze hospital' });
  }
});

// Unfreeze a hospital (no authentication required for admin panel)
router.put('/hospital/:id/unfreeze', async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    hospital.isFrozen = false;
    await hospital.save();

    res.json({ 
      success: true, 
      message: 'Hospital unfrozen successfully',
      hospital: {
        id: hospital._id,
        name: hospital.name,
        isFrozen: hospital.isFrozen
      }
    });
  } catch (error) {
    console.error('Error unfreezing hospital:', error);
    res.status(500).json({ error: 'Failed to unfreeze hospital' });
  }
});

// Freeze an institute (no authentication required for admin panel)
router.put('/institute/:id/freeze', async (req, res) => {
  try {
    const institute = await Institute.findById(req.params.id);
    if (!institute) {
      return res.status(404).json({ error: 'Institute not found' });
    }

    institute.isFrozen = true;
    await institute.save();

    res.json({ 
      success: true, 
      message: 'Institute frozen successfully',
      institute: {
        id: institute._id,
        name: institute.name,
        isFrozen: institute.isFrozen
      }
    });
  } catch (error) {
    console.error('Error freezing institute:', error);
    res.status(500).json({ error: 'Failed to freeze institute' });
  }
});

// Unfreeze an institute (no authentication required for admin panel)
router.put('/institute/:id/unfreeze', async (req, res) => {
  try {
    const institute = await Institute.findById(req.params.id);
    if (!institute) {
      return res.status(404).json({ error: 'Institute not found' });
    }

    institute.isFrozen = false;
    await institute.save();

    res.json({ 
      success: true, 
      message: 'Institute unfrozen successfully',
      institute: {
        id: institute._id,
        name: institute.name,
        isFrozen: institute.isFrozen
      }
    });
  } catch (error) {
    console.error('Error unfreezing institute:', error);
    res.status(500).json({ error: 'Failed to unfreeze institute' });
  }
});

// Freeze a product (no authentication required for admin panel)
router.put('/product/:id/freeze', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    product.isFrozen = true;
    await product.save();

    res.json({ 
      success: true, 
      message: 'Product frozen successfully',
      product: {
        id: product._id,
        title: product.title,
        isFrozen: product.isFrozen
      }
    });
  } catch (error) {
    console.error('Error freezing product:', error);
    res.status(500).json({ error: 'Failed to freeze product' });
  }
});

// Unfreeze a product (no authentication required for admin panel)
router.put('/product/:id/unfreeze', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    product.isFrozen = false;
    await product.save();

    res.json({ 
      success: true, 
      message: 'Product unfrozen successfully',
      product: {
        id: product._id,
        title: product.title,
        isFrozen: product.isFrozen
      }
    });
  } catch (error) {
    console.error('Error unfreezing product:', error);
    res.status(500).json({ error: 'Failed to unfreeze product' });
  }
});

// Delete a shop (no authentication required for admin panel)
router.delete('/shop/:id', async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    await Shop.findByIdAndDelete(req.params.id);

    res.json({ 
      success: true, 
      message: 'Shop deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting shop:', error);
    res.status(500).json({ error: 'Failed to delete shop' });
  }
});

// Delete a hospital (no authentication required for admin panel)
router.delete('/hospital/:id', async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }

    await Hospital.findByIdAndDelete(req.params.id);

    res.json({ 
      success: true, 
      message: 'Hospital deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting hospital:', error);
    res.status(500).json({ error: 'Failed to delete hospital' });
  }
});

// Delete an institute (no authentication required for admin panel)
router.delete('/institute/:id', async (req, res) => {
  try {
    const institute = await Institute.findById(req.params.id);
    if (!institute) {
      return res.status(404).json({ error: 'Institute not found' });
    }

    await Institute.findByIdAndDelete(req.params.id);

    res.json({ 
      success: true, 
      message: 'Institute deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting institute:', error);
    res.status(500).json({ error: 'Failed to delete institute' });
  }
});

// Delete a product (no authentication required for admin panel)
router.delete('/product/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({ 
      success: true, 
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Update admin profile (disabled - no authentication system)
// router.put('/profile', async (req, res) => { ... });

// Change admin password (disabled - no authentication system)
// router.put('/change-password', async (req, res) => { ... });

module.exports = router;
