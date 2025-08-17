const express = require('express');
const router = express.Router();
const { ensureAuthenticated, ensureAdmin } = require('../middleware/auth');
const Institute = require('../models/Institute');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const PaymentRequest = require('../models/PaymentRequest');

// Get all pending entities for approval
router.get('/pending-entities', ensureAdmin, async (req, res) => {
  try {
    const [pendingInstitutes, pendingShops, pendingProducts] = await Promise.all([
      Institute.find({ approvalStatus: 'pending' }).populate('owner', 'username email fullName'),
      Shop.find({ approvalStatus: 'pending' }).populate('owner', 'username email fullName'),
      Product.find({ approvalStatus: 'pending' }).populate('owner', 'username email fullName')
    ]);

    res.json({
      institutes: pendingInstitutes,
      shops: pendingShops,
      products: pendingProducts
    });
  } catch (error) {
    console.error('Error fetching pending entities:', error);
    res.status(500).json({ error: 'Failed to fetch pending entities' });
  }
});

// Approve/Reject Institute
router.put('/institute/:id/approval', ensureAdmin, async (req, res) => {
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
    institute.approvedBy = req.user._id;
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

// Approve/Reject Shop
router.put('/shop/:id/approval', ensureAdmin, async (req, res) => {
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
    shop.approvedBy = req.user._id;
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

// Approve/Reject Product
router.put('/product/:id/approval', ensureAdmin, async (req, res) => {
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
    product.approvedBy = req.user._id;
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

// Get all payment requests for admin review
router.get('/payment-requests', ensureAdmin, async (req, res) => {
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

// Update payment request status
router.put('/payment-request/:id/status', ensureAdmin, async (req, res) => {
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
    paymentRequest.verifiedBy = req.user._id;
    paymentRequest.verifiedAt = new Date();

    await paymentRequest.save();

    res.json({ 
      success: true, 
      message: `Payment request ${status} successfully`,
      paymentRequest 
    });
  } catch (error) {
    console.error('Error updating payment request status:', error);
    res.status(500).json({ error: 'Failed to update payment request status' });
  }
});

// Get admin dashboard statistics
router.get('/stats', ensureAdmin, async (req, res) => {
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

module.exports = router;
