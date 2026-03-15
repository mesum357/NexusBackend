const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  shop: { type: mongoose.Schema.Types.ObjectId, ref: 'Shop', required: true },
  products: [{
    productId: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1 },
    image: { type: String }
  }],
  totalAmount: { type: Number, required: true },
  personalInfo: {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true }
  },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String },
    zipCode: { type: String }
  },
  paymentDetails: {
    method: { type: String, default: 'bank_transfer' },
    transactionId: { type: String },
    screenshot: { type: String }
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected'], 
    default: 'pending' 
  },
  orderStatus: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected', 'shipped', 'delivered', 'cancelled'], 
    default: 'pending' 
  },
  notificationSent: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
