const mongoose = require('mongoose');

const friendSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  friend: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected'], 
    default: 'pending' 
  },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestedAt: { type: Date, default: Date.now },
  acceptedAt: { type: Date },
  rejectedAt: { type: Date }
}, { timestamps: true });

// Ensure unique friend relationships
friendSchema.index({ user: 1, friend: 1 }, { unique: true });

module.exports = mongoose.model('Friend', friendSchema); 