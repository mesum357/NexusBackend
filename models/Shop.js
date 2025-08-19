const mongoose = require('mongoose');

// Product sub-schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String },
  description: { type: String },
  price: { type: Number, required: true },
  discountPercentage: { type: Number, default: 0 },
  category: { type: String },
}, { _id: false });

const shopSchema = new mongoose.Schema({
  // Basic shop information
  shopName: { type: String, required: true },
  city: { type: String, required: true },
  shopType: { type: String, enum: ['Product Seller', 'Service Provider'], required: true },
  shopDescription: { type: String },
  agentId: { type: String }, // Optional agent ID
  categories: [{ type: String, required: true }],
  
  // Images
  shopLogo: { type: String },
  shopBanner: { type: String },
  ownerProfilePhoto: { type: String },
  gallery: [{ type: String }], // Array of gallery image paths
  
  // Social & Contact
  websiteUrl: { type: String },
  facebookUrl: { type: String },
  instagramHandle: { type: String },
  whatsappNumber: { type: String },
  
  // Products
  products: [productSchema],
  
  // Ratings and reviews
  rating: { type: Number, default: 4.5 },
  totalReviews: { type: Number, default: 0 },
  
  // Approval Status
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvalNotes: { type: String }, // Admin notes for approval/rejection
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin who approved/rejected
  approvedAt: { type: Date }, // When it was approved/rejected
  
  // Owner information
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerName: { type: String, default: '' },
  ownerDp: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  
  // Legacy fields for backward compatibility
  businessCategories: [{ type: String }],
  businessType: { type: String, enum: ['Product Seller', 'Service Provider'] },
  description: { type: String },
  socialLinks: {
    facebook: { type: String },
    instagram: { type: String },
    whatsapp: { type: String }
  }
}, { timestamps: true });

module.exports = mongoose.model('Shop', shopSchema); 