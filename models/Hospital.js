const mongoose = require('mongoose');

// Department sub-schema for hospitals
const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  headDoctor: { type: String },
  contactNumber: { type: String },
  image: { type: String },
});

// Doctor sub-schema for hospitals
const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  position: { type: String },
  qualification: { type: String },
  experience: { type: String },
  image: { type: String },
  contactNumber: { type: String },
  email: { type: String },
});

const hospitalSchema = new mongoose.Schema({
  // Basic Information
  name: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['Hospital', 'General', 'Specialized', 'Clinic', 'Medical Center'], 
    required: true 
  },
  agentId: { type: String }, // Optional agent ID
  location: { type: String, required: true },
  city: { type: String, required: true },
  province: { type: String, required: true },
  
  // Description
  description: { type: String },
  specialization: { type: String },
  
  // Images
  logo: { type: String },
  banner: { type: String },
  gallery: [{ type: String }],
  
  // Contact Information
  phone: { type: String },
  email: { type: String },
  website: { type: String },
  address: { type: String },
  emergencyContact: { type: String },
  
  // Social Media
  facebook: { type: String },
  instagram: { type: String },
  twitter: { type: String },
  linkedin: { type: String },
  
  // Hospital Information
  departments: [departmentSchema],
  doctors: [doctorSchema],
  totalPatients: { type: String, default: '0' },
  totalDoctors: { type: String, default: '0' },
  
  // Status and Verification
  admissionStatus: { type: String, enum: ['Open', 'Closed', 'Emergency Only'], default: 'Open' },
  verified: { type: Boolean, default: false },
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvalNotes: { type: String }, // Admin notes for approval/rejection
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin who approved/rejected
  approvedAt: { type: Date }, // When it was approved/rejected
  
  // Ratings and Reviews
  rating: { type: Number, default: 4.5 },
  totalReviews: { type: Number, default: 0 },
  
  // Additional Information
  establishedYear: { type: Number },
  accreditation: [{ type: String }],
  facilities: [{ type: String }],
  insuranceAccepted: [{ type: String }],
  emergencyServices: { type: Boolean, default: true },
  ambulanceService: { type: Boolean, default: false },
  
  // Owner Information
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerName: { type: String, default: '' },
  ownerEmail: { type: String, default: '' },
  ownerPhone: { type: String, default: '' },
  
}, { timestamps: true });

module.exports = mongoose.models.Hospital || mongoose.model('Hospital', hospitalSchema, 'Hospitals');
