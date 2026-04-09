const mongoose = require('mongoose');

const instituteNotificationSchema = new mongoose.Schema({
  institute: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  title: { type: String, default: '' },
  message: { type: String, required: true },
  targetType: { type: String, enum: ['all', 'course', 'category', 'individual'], default: 'all' },
  targetId: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('InstituteNotification', instituteNotificationSchema);


