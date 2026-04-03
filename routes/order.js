const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Shop = require('../models/Shop');
const Notification = require('../models/Notification');
const { ensureAuthenticated, ensureAuthenticatedOrMobile } = require('../middleware/auth');
const { upload } = require('../middleware/cloudinary');

// Place an order
router.post('/', ensureAuthenticatedOrMobile, upload.single('screenshot'), async (req, res) => {
  try {
    const { shopId, products, totalAmount, personalInfo, address, transactionId } = req.body;
    
    // Parse products if they come as a string (FormData)
    const parsedProducts = typeof products === 'string' ? JSON.parse(products) : products;
    const parsedPersonalInfo = typeof personalInfo === 'string' ? JSON.parse(personalInfo) : personalInfo;
    const parsedAddress = typeof address === 'string' ? JSON.parse(address) : address;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    const order = new Order({
      user: req.user._id,
      shop: shopId,
      products: parsedProducts,
      totalAmount: Number(totalAmount),
      personalInfo: parsedPersonalInfo,
      address: parsedAddress,
      paymentDetails: {
        transactionId,
        screenshot: req.file ? req.file.path : null
      }
    });

    await order.save();

    // Notify the shop owner
    const notification = new Notification({
      user: shop.owner,
      type: 'order_placed',
      fromUser: req.user._id,
      message: `You have received a new order for ${shop.shopName}!`
    });
    await notification.save();

    res.status(201).json({ message: 'Order placed successfully', order });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's orders
router.get('/my-orders', ensureAuthenticated, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('shop', 'shopName shopLogo')
      .sort({ createdAt: -1 });
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get shop orders (Owner/Admin only)
router.get('/shop/:shopId', ensureAuthenticated, async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.shopId);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    if (shop.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized access to shop orders' });
    }

    const orders = await Order.find({ shop: req.params.shopId })
      .populate('user', 'fullName username email')
      .sort({ createdAt: -1 });
    
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order/payment status (Owner only)
router.put('/:orderId/status', ensureAuthenticated, async (req, res) => {
  try {
    const { orderStatus, paymentStatus } = req.body;
    const order = await Order.findById(req.params.orderId).populate('shop');
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.shop.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    if (orderStatus) order.orderStatus = orderStatus;
    if (paymentStatus) order.paymentStatus = paymentStatus;

    await order.save();

    // Notify the customer
    const notification = new Notification({
      user: order.user,
      type: 'order_status_update',
      fromUser: req.user._id,
      message: `Your order from ${order.shop.shopName} status has been updated to: ${orderStatus || order.orderStatus}`
    });
    await notification.save();

    res.json({ message: 'Order status updated', order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Shop stats (for dashboard)
router.get('/shop/:shopId/stats', ensureAuthenticated, async (req, res) => {
    try {
        const shop = await Shop.findById(req.params.shopId);
        if (!shop) {
            return res.status(404).json({ error: 'Shop not found' });
        }

        if (shop.owner.toString() !== req.user._id.toString() && !req.user.isAdmin) {
            return res.status(403).json({ error: 'Unauthorized access' });
        }

        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const orders = await Order.find({ 
            shop: req.params.shopId,
            createdAt: { $gte: lastMonth }
        });

        const totalRevenue = orders.reduce((sum, order) => sum + (order.paymentStatus === 'verified' ? order.totalAmount : 0), 0);
        const orderCount = orders.length;
        const pendingOrders = orders.filter(o => o.orderStatus === 'pending').length;

        res.json({
            stats: {
                totalRevenue,
                orderCount,
                pendingOrders
            },
            recentOrders: orders.slice(0, 5)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
