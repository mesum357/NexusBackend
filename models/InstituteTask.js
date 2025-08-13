const mongoose = require('mongoose');

const instituteTaskSchema = new mongoose.Schema({
  institute: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  // Allowed: theory, practical, listing, reading
  type: { type: String, enum: ['theory', 'practical', 'listing', 'reading'], required: true },
  // Store normalized date (YYYY-MM-DD) for easy querying
  date: { type: String, required: true, index: true }
}, { timestamps: true });

module.exports = mongoose.model('InstituteTask', instituteTaskSchema);


