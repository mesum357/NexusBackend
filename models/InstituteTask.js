const mongoose = require('mongoose');

const instituteTaskSchema = new mongoose.Schema({
  institute: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  // Allowed: appointment, medication, test, followup
  type: { type: String, enum: ['appointment', 'medication', 'test', 'followup'], required: true },
  // Store normalized date (YYYY-MM-DD) for easy querying
  date: { type: String, required: true, index: true }
}, { timestamps: true });

module.exports = mongoose.model('InstituteTask', instituteTaskSchema);


