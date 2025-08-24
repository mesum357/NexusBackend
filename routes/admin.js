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

    // If payment is verified, automatically approve the associated shop
    if (status === 'verified' && paymentRequest.entityType === 'shop' && paymentRequest.agentId) {
      try {
        console.log(`🔍 Looking for shop with agentId: ${paymentRequest.agentId}`);
        
        // Find the shop by agentId
        const shop = await Shop.findOne({ agentId: paymentRequest.agentId });
        
        if (shop) {
          console.log(`✅ Found shop: ${shop.shopName} (ID: ${shop._id})`);
          console.log(`📝 Current approval status: ${shop.approvalStatus}`);
          
          // Update shop approval status
          shop.approvalStatus = 'approved';
          shop.approvalNotes = 'Payment verified - automatically approved';
          shop.approvedBy = null; // No authentication required
          shop.approvedAt = new Date();
          
          await shop.save();
          
          console.log(`✅ Shop "${shop.shopName}" automatically approved after payment verification`);
          console.log(`📝 New approval status: ${shop.approvalStatus}`);
        } else {
          console.log(`⚠️ No shop found with agentId: ${paymentRequest.agentId}`);
          
          // Try to find by entityId if available
          if (paymentRequest.entityId) {
            console.log(`🔍 Trying to find shop by entityId: ${paymentRequest.entityId}`);
            const shopById = await Shop.findById(paymentRequest.entityId);
            
            if (shopById) {
              console.log(`✅ Found shop by ID: ${shopById.shopName} (ID: ${shopById._id})`);
              console.log(`📝 Current approval status: ${shopById.approvalStatus}`);
              
              // Update shop approval status
              shopById.approvalStatus = 'approved';
              shopById.approvalNotes = 'Payment verified - automatically approved';
              shopById.approvedBy = null;
              shopById.approvedAt = new Date();
              
              await shopById.save();
              
              console.log(`✅ Shop "${shopById.shopName}" automatically approved after payment verification`);
              console.log(`📝 New approval status: ${shopById.approvalStatus}`);
            } else {
              console.log(`⚠️ No shop found with entityId: ${paymentRequest.entityId}`);
            }
          }
        }
      } catch (shopUpdateError) {
        console.error('❌ Error updating shop approval status:', shopUpdateError);
        // Don't fail the payment verification if shop update fails
        console.error('Shop update error details:', {
          message: shopUpdateError.message,
          stack: shopUpdateError.stack
        });
      }
    }

    // If payment is verified, automatically approve the associated institute
    if (status === 'verified' && paymentRequest.entityType === 'institute' && paymentRequest.agentId) {
      try {
        console.log(`🔍 Looking for institute with agentId: ${paymentRequest.agentId}`);
        
        // Find the institute by agentId
        const institute = await Institute.findOne({ agentId: paymentRequest.agentId });
        
        if (institute) {
          console.log(`✅ Found institute: ${institute.instituteName} (ID: ${institute._id})`);
          console.log(`📝 Current approval status: ${institute.approvalStatus}`);
          
          // Update institute approval status
          institute.approvalStatus = 'approved';
          institute.approvalNotes = 'Payment verified - automatically approved';
          institute.approvedBy = null;
          institute.approvedAt = new Date();
          institute.verified = true;
          
          await institute.save();
          
          console.log(`✅ Institute "${institute.instituteName}" automatically approved after payment verification`);
          console.log(`📝 New approval status: ${institute.approvalStatus}`);
        } else if (paymentRequest.entityId) {
          console.log(`🔍 Trying to find institute by entityId: ${paymentRequest.entityId}`);
          const instituteById = await Institute.findById(paymentRequest.entityId);
          
          if (instituteById) {
            console.log(`✅ Found institute by ID: ${instituteById.instituteName} (ID: ${instituteById._id})`);
            console.log(`📝 Current approval status: ${instituteById.approvalStatus}`);
            
            // Update institute approval status
            instituteById.approvalStatus = 'approved';
            instituteById.approvalNotes = 'Payment verified - automatically approved';
            instituteById.approvedBy = null;
            instituteById.approvedAt = new Date();
            instituteById.verified = true;
            
            await instituteById.save();
            
            console.log(`✅ Institute "${instituteById.instituteName}" automatically approved after payment verification`);
            console.log(`📝 New approval status: ${instituteById.approvalStatus}`);
          }
        }
      } catch (instituteUpdateError) {
        console.error('❌ Error updating institute approval status:', instituteUpdateError);
        console.error('Institute update error details:', {
          message: instituteUpdateError.message,
          stack: instituteUpdateError.stack
        });
      }
    }

    // If payment is verified, automatically approve the associated hospital
    if (status === 'verified' && paymentRequest.entityType === 'hospital' && paymentRequest.agentId) {
      try {
        console.log(`🔍 Looking for hospital with agentId: ${paymentRequest.agentId}`);
        
        // Find the hospital by agentId
        const hospital = await Hospital.findOne({ agentId: paymentRequest.agentId });
        
        if (hospital) {
          console.log(`✅ Found hospital: ${hospital.hospitalName} (ID: ${hospital._id})`);
          console.log(`📝 Current approval status: ${hospital.approvalStatus}`);
          
          // Update hospital approval status
          hospital.approvalStatus = 'approved';
          hospital.approvalNotes = 'Payment verified - automatically approved';
          hospital.approvedBy = null;
          hospital.approvedAt = new Date();
          hospital.verified = true;
          
          await hospital.save();
          
          console.log(`✅ Hospital "${hospital.hospitalName}" automatically approved after payment verification`);
          console.log(`📝 New approval status: ${hospital.approvalStatus}`);
        } else if (paymentRequest.entityId) {
          console.log(`🔍 Trying to find hospital by entityId: ${paymentRequest.entityId}`);
          const hospitalById = await Hospital.findById(paymentRequest.entityId);
          
          if (hospitalById) {
            console.log(`✅ Found hospital by ID: ${hospitalById.hospitalName} (ID: ${hospitalById._id})`);
            console.log(`📝 Current approval status: ${hospitalById.approvalStatus}`);
            
            // Update hospital approval status
            hospitalById.approvalStatus = 'approved';
            hospitalById.approvalNotes = 'Payment verified - automatically approved';
            hospitalById.approvedBy = null;
            hospitalById.approvedAt = new Date();
            hospitalById.verified = true;
            
            await hospitalById.save();
            
            console.log(`✅ Hospital "${hospitalById.hospitalName}" automatically approved after payment verification`);
            console.log(`📝 New approval status: ${hospitalById.approvalStatus}`);
          }
        }
      } catch (hospitalUpdateError) {
        console.error('❌ Error updating hospital approval status:', hospitalUpdateError);
        console.error('Hospital update error details:', {
          message: hospitalUpdateError.message,
          stack: hospitalUpdateError.stack
        });
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

// Update admin profile (disabled - no authentication system)
// router.put('/profile', async (req, res) => { ... });

// Change admin password (disabled - no authentication system)
// router.put('/change-password', async (req, res) => { ... });

module.exports = router;
