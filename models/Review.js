const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // Support both old (institute-only) and new (generic entity) structure
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute'
  },
  // Generic entity support for hospitals, shops, products, etc.
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'entityType'
  },
  entityType: {
    type: String,
    enum: ['hospital', 'institute', 'shop', 'product']
  },
  // Support both old (reviewer) and new (user) field names
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Ensure one review per user per entity (supports both old and new structures)
reviewSchema.index({ institute: 1, reviewer: 1 }, { unique: true, sparse: true });
reviewSchema.index({ entityId: 1, entityType: 1, user: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Review', reviewSchema); 