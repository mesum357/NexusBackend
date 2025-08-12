const mongoose = require('mongoose');

const instituteMessageSchema = new mongoose.Schema({
  institute: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  senderName: { type: String, required: true },
  message: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('InstituteMessage', instituteMessageSchema);


