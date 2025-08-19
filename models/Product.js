const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  agentId: { type: String }, // Optional agent ID
  price: { type: Number, required: true },
  priceType: { type: String, enum: ['fixed', 'negotiable', 'free'], default: 'fixed' },
  category: { type: String, required: true },
  condition: { type: String, enum: ['new', 'used', 'refurbished'], default: 'used' },
  location: { type: String, required: true },
  city: { type: String, required: true },
  images: [{ type: String }], // Array of image URLs
  featured: { type: Boolean, default: false },
  views: { type: Number, default: 0 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerName: { type: String, required: true },
  ownerPhone: { type: String },
  ownerEmail: { type: String },
  status: { type: String, enum: ['active', 'sold', 'expired'], default: 'active' },
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvalNotes: { type: String }, // Admin notes for approval/rejection
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin who approved/rejected
  approvedAt: { type: Date }, // When it was approved/rejected
  tags: [{ type: String }],
  specifications: { type: Map, of: String }, // For additional product details
  contactPreference: { type: String, enum: ['phone', 'email', 'both'], default: 'both' }
}, { timestamps: true });

// Indexes for better search performance
productSchema.index({ title: 'text', description: 'text' });
productSchema.index({ category: 1, city: 1 });
productSchema.index({ owner: 1 });
productSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Product', productSchema); 