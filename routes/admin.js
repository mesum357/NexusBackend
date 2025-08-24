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

// Update admin profile (disabled - no authentication system)
// router.put('/profile', async (req, res) => { ... });

// Change admin password (disabled - no authentication system)
// router.put('/change-password', async (req, res) => { ... });

module.exports = router;
