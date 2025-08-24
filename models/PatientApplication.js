const mongoose = require('mongoose');

const patientApplicationSchema = new mongoose.Schema({
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: { type: String, required: true },
  patientAge: { type: Number, required: true },
  patientGender: { type: String, enum: ['male', 'female', 'other'], required: true },
  contactNumber: { type: String, required: true },
  emergencyContact: { type: String },
  medicalHistory: { type: String },
  symptoms: { type: String },
  treatmentType: { type: String, required: true },
  preferredDate: { type: Date },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed'], default: 'pending' },
  notes: { type: String }, // Admin notes for approval/rejection
}, { timestamps: true });

module.exports = mongoose.model('PatientApplication', patientApplicationSchema);
