const mongoose = require('mongoose');

const patientApplicationSchema = new mongoose.Schema({
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  patientName: { type: String, required: true },
  fatherName: { type: String, required: true },
  cnic: { type: String, required: true },
  city: { type: String, required: true },
  department: { type: String, required: true },
  profileImage: { type: String }, // Cloudinary URL
  status: { type: String, enum: ['submitted', 'review', 'accepted', 'rejected'], default: 'submitted' },
  notes: { type: String }, // Admin notes for approval/rejection
}, { timestamps: true });

module.exports = mongoose.model('PatientApplication', patientApplicationSchema);
