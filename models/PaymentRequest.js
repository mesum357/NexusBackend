const mongoose = require('mongoose');

const paymentRequestSchema = new mongoose.Schema({
  // User who made the payment request
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // Entity type for which payment is made
  entityType: { 
    type: String, 
    enum: ['shop', 'institute', 'hospital', 'marketplace'], 
    required: true 
  },
  
  // Entity ID (if editing existing entity)
  entityId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Institute', // Can reference Institute, Shop, or Product
    default: null 
  },
  
  // Payment details
  amount: { 
    type: Number, 
    required: true 
  },
  
  // Bank transaction details
  transactionId: { 
    type: String, 
    required: true 
  },
  
  bankName: { 
    type: String, 
    required: true 
  },
  
  accountNumber: { 
    type: String, 
    required: true 
  },
  
  transactionDate: { 
    type: Date, 
    required: true 
  },
  
  notes: { 
    type: String 
  },
  
  // Payment status
  status: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected', 'completed'], 
    default: 'pending' 
  },
  
  // Admin verification details
  verifiedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  
  verifiedAt: { 
    type: Date 
  },
  
  verificationNotes: { 
    type: String 
  },
  
  // Payment processing details
  processingFee: { 
    type: Number, 
    default: 0 
  },
  
  totalAmount: { 
    type: Number, 
    required: true 
  },
  
  // Timestamps
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  timestamps: true 
});

// Indexes for better query performance
paymentRequestSchema.index({ user: 1, entityType: 1 });
paymentRequestSchema.index({ status: 1 });
paymentRequestSchema.index({ createdAt: -1 });
paymentRequestSchema.index({ transactionId: 1 }, { unique: true });

// Pre-save middleware to calculate total amount
paymentRequestSchema.pre('save', function(next) {
  this.totalAmount = this.amount + this.processingFee;
  this.updatedAt = new Date();
  next();
});

// Virtual for formatted amount
paymentRequestSchema.virtual('formattedAmount').get(function() {
  return `PKR ${this.amount.toLocaleString()}`;
});

// Virtual for formatted total amount
paymentRequestSchema.virtual('formattedTotalAmount').get(function() {
  return `PKR ${this.totalAmount.toLocaleString()}`;
});

// Method to mark as verified
paymentRequestSchema.methods.markAsVerified = function(adminId, notes) {
  this.status = 'verified';
  this.verifiedBy = adminId;
  this.verifiedAt = new Date();
  this.verificationNotes = notes;
  return this.save();
};

// Method to mark as completed
paymentRequestSchema.methods.markAsCompleted = function() {
  this.status = 'completed';
  return this.save();
};

// Method to mark as rejected
paymentRequestSchema.methods.markAsRejected = function(adminId, notes) {
  this.status = 'rejected';
  this.verifiedBy = adminId;
  this.verifiedAt = new Date();
  this.verificationNotes = notes;
  return this.save();
};

// Static method to get payment statistics
paymentRequestSchema.statics.getPaymentStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
};

// Static method to get payments by entity type
paymentRequestSchema.statics.getPaymentsByEntityType = function(entityType) {
  return this.find({ entityType }).populate('user', 'username email').sort({ createdAt: -1 });
};

module.exports = mongoose.model('PaymentRequest', paymentRequestSchema);
