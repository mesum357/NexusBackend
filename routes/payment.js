const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const PaymentRequest = require('../models/PaymentRequest');
const Institute = require('../models/Institute');
const Hospital = require('../models/Hospital');
const Shop = require('../models/Shop');
const Product = require('../models/Product');
const upload = require('../middleware/upload');

// Create a new payment request
router.post('/create', ensureAuthenticated, upload.single('transactionScreenshot'), async (req, res) => {
  try {
    const {
      entityType,
      entityId,
      amount,
      transactionId,
      bankName,
      accountNumber,
      transactionDate,
      notes
    } = req.body;

    // For screenshot-only payments, we'll use default values for required fields
    const screenshotFile = req.file;
    
    if (!screenshotFile) {
      return res.status(400).json({ 
        error: 'Transaction screenshot is required' 
      });
    }

    // Validate entity type
    const validEntityTypes = ['shop', 'institute', 'hospital', 'marketplace'];
    if (!entityType || !validEntityTypes.includes(entityType)) {
      return res.status(400).json({ 
        error: 'Invalid entity type. Must be one of: shop, institute, hospital, marketplace' 
      });
    }

    // Generate a unique transaction ID if not provided
    const finalTransactionId = transactionId || `SCREENSHOT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Check if transaction ID already exists
    const existingPayment = await PaymentRequest.findOne({ transactionId: finalTransactionId });
    if (existingPayment) {
      return res.status(400).json({ 
        error: 'Transaction ID already exists. Please use a unique transaction ID.' 
      });
    }

    // Get Agent ID from request body or from associated entity if entityId is provided
    let agentId = req.body.agentId || null;
    
    // Handle empty string Agent ID - convert to null
    if (agentId === '' || agentId === 'null' || agentId === 'undefined') {
      agentId = null;
    }
    
    if (!agentId && entityId) {
      // Fetch Agent ID from the associated entity if entityId is provided
      try {
        let entity;
        switch (entityType) {
          case 'institute':
            entity = await Institute.findById(entityId);
            break;
          case 'hospital':
            entity = await Hospital.findById(entityId);
            break;
          case 'shop':
            entity = await Shop.findById(entityId);
            break;
          case 'marketplace':
            entity = await Product.findById(entityId);
            break;
        }
        if (entity && entity.agentId) {
          agentId = entity.agentId;
          console.log(`Found Agent ID: ${agentId} for ${entityType} ${entityId}`);
        } else {
          console.log(`No Agent ID found for ${entityType} ${entityId}`);
        }
      } catch (error) {
        console.log('Could not fetch entity for Agent ID:', error.message);
      }
    } else if (agentId) {
      console.log(`Using Agent ID from request body: ${agentId}`);
    } else {
      console.log('No Agent ID provided');
    }

    // Create payment request with screenshot
    const paymentRequest = new PaymentRequest({
      user: req.user._id,
      entityType,
      entityId: entityId || null,
      agentId, // Include the Agent ID if found
      amount: Number(amount) || 0, // Default to 0 if not provided
      transactionId: finalTransactionId,
      bankName: bankName || 'Screenshot Payment',
      accountNumber: accountNumber || 'N/A',
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      notes: notes ? notes.trim() : 'Payment via screenshot upload',
      processingFee: 0,
      totalAmount: Number(amount) || 0,
      screenshotFile: screenshotFile.filename // Store the uploaded file name
    });

    await paymentRequest.save();

    // Populate user details for response
    await paymentRequest.populate('user', 'username email');

    res.status(201).json({
      success: true,
      message: 'Payment request submitted successfully',
      paymentRequest
    });

  } catch (error) {
    console.error('Error creating payment request:', error);
    res.status(500).json({ 
      error: 'Failed to create payment request',
      details: error.message 
    });
  }
});

// Get user's payment requests
router.get('/my', ensureAuthenticated, async (req, res) => {
  try {
    const payments = await PaymentRequest.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      payments
    });

  } catch (error) {
    console.error('Error fetching user payments:', error);
    res.status(500).json({ 
      error: 'Failed to fetch payment requests' 
    });
  }
});

// Link payment request to any entity (generic)
router.put('/:transactionId/link-entity', ensureAuthenticated, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { entityId, entityType } = req.body;
    
    if (!entityId) {
      return res.status(400).json({ error: 'Entity ID is required' });
    }
    
    if (!entityType) {
      return res.status(400).json({ error: 'Entity type is required' });
    }
    
    // Find the payment request by transaction ID
    const paymentRequest = await PaymentRequest.findOne({ transactionId });
    if (!paymentRequest) {
      return res.status(404).json({ error: 'Payment request not found' });
    }
    
    // Update the payment request with the entity ID and type
    paymentRequest.entityId = entityId;
    paymentRequest.entityType = entityType;
    await paymentRequest.save();
    
    console.log(`✅ Payment request ${transactionId} linked to ${entityType} ${entityId}`);
    
    res.json({ 
      success: true, 
      message: `Payment request linked to ${entityType} successfully`,
      paymentRequest 
    });
    
  } catch (error) {
    console.error('Error linking payment to entity:', error);
    res.status(500).json({ error: 'Failed to link payment to entity' });
  }
});

// Link payment request to shop (legacy endpoint - kept for backward compatibility)
router.put('/:transactionId/link-shop', ensureAuthenticated, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { shopId } = req.body;
    
    if (!shopId) {
      return res.status(400).json({ error: 'Shop ID is required' });
    }
    
    // Find the payment request by transaction ID
    const paymentRequest = await PaymentRequest.findOne({ transactionId });
    if (!paymentRequest) {
      return res.status(404).json({ error: 'Payment request not found' });
    }
    
    // Update the payment request with the shop ID
    paymentRequest.entityId = shopId;
    paymentRequest.entityType = 'shop';
    await paymentRequest.save();
    
    console.log(`✅ Payment request ${transactionId} linked to shop ${shopId}`);
    
    res.json({ 
      success: true, 
      message: 'Payment request linked to shop successfully',
      paymentRequest 
    });
    
  } catch (error) {
    console.error('Error linking payment to shop:', error);
    res.status(500).json({ error: 'Failed to link payment to shop' });
  }
});

// Get payment request by ID
router.get('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const payment = await PaymentRequest.findById(req.params.id)
      .populate('user', 'username email')
      .populate('verifiedBy', 'username email');

    if (!payment) {
      return res.status(404).json({ 
        error: 'Payment request not found' 
      });
    }

    // Check if user owns this payment or is admin
    if (payment.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Access denied' 
      });
    }

    res.json({
      success: true,
      payment
    });

  } catch (error) {
    console.error('Error fetching payment request:', error);
    res.status(500).json({ 
      error: 'Failed to fetch payment request' 
    });
  }
});

// Admin: Get all payment requests (with pagination)
router.get('/admin/all', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const entityType = req.query.entityType;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (entityType) filter.entityType = entityType;

    // Get total count
    const total = await PaymentRequest.countDocuments(filter);

    // Get payments with pagination
    const payments = await PaymentRequest.find(filter)
      .populate('user', 'username email')
      .populate('verifiedBy', 'username email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching admin payments:', error);
    res.status(500).json({ 
      error: 'Failed to fetch payment requests' 
    });
  }
});

// Admin: Update payment status
router.put('/admin/:id/status', async (req, res) => {
  try {
    const { status, verificationNotes } = req.body;

    if (!status || !['verified', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be: verified, rejected, or completed' 
      });
    }

    const payment = await PaymentRequest.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ 
        error: 'Payment request not found' 
      });
    }

    // Update status based on action
    if (status === 'verified') {
      await payment.markAsVerified(req.user ? req.user._id : null, verificationNotes);
    } else if (status === 'completed') {
      await payment.markAsCompleted();
    } else if (status === 'rejected') {
      await payment.markAsRejected(req.user ? req.user._id : null, verificationNotes);
    }

    // Populate user details for response
    await payment.populate('user', 'username email');
    await payment.populate('verifiedBy', 'username email');

    res.json({
      success: true,
      message: `Payment ${status} successfully`,
      payment
    });

  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ 
      error: 'Failed to update payment status' 
    });
  }
});

// Admin: Get payment statistics
router.get('/admin/stats', async (req, res) => {
  try {
    const stats = await PaymentRequest.getPaymentStats();
    
    // Get total counts
    const totalPayments = await PaymentRequest.countDocuments();
    const totalAmount = await PaymentRequest.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      success: true,
      stats,
      summary: {
        totalPayments,
        totalAmount: totalAmount[0]?.total || 0
      }
    });

  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch payment statistics' 
    });
  }
});

// Delete payment request (only by owner or admin)
router.delete('/:id', ensureAuthenticated, async (req, res) => {
  try {
    const payment = await PaymentRequest.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({ 
        error: 'Payment request not found' 
      });
    }

    // Check if user owns this payment or is admin
    if (payment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Access denied' 
      });
    }

    // Only allow deletion if status is pending
    if (payment.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Cannot delete payment request that is not pending' 
      });
    }

    await PaymentRequest.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Payment request deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting payment request:', error);
    res.status(500).json({ 
      error: 'Failed to delete payment request' 
    });
  }
});

module.exports = router;
