const mongoose = require('mongoose');

const instituteNotificationSchema = new mongoose.Schema({
  institute: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  title: { type: String, default: '' },
  message: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('InstituteNotification', instituteNotificationSchema);


