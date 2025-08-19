const mongoose = require('mongoose');

// Course sub-schema
const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  duration: { type: String },
  fee: { type: Number },
  category: { type: String },
});

// Faculty sub-schema
const facultySchema = new mongoose.Schema({
  name: { type: String, required: true },
  position: { type: String },
  qualification: { type: String },
  experience: { type: String },
  image: { type: String },
});

const instituteSchema = new mongoose.Schema({
  // Domain indicates whether this record represents an education institute or a healthcare hospital
  domain: { type: String, enum: ['education', 'healthcare'], default: 'education' },
  // Basic Information
  name: { type: String, required: true },
  type: { 
    type: String, 
    enum: [
      // Education types
      'University', 'College', 'School', 'Academy',
      // Healthcare types
      'Hospital', 'General', 'Specialized', 'Clinic', 'Medical Center'
    ], 
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
  
  // Social Media
  facebook: { type: String },
  instagram: { type: String },
  twitter: { type: String },
  linkedin: { type: String },
  
  // Academic Information
  courses: [courseSchema],
  faculty: [facultySchema],
  totalStudents: { type: String, default: '0' },
  totalCourses: { type: String, default: '0' },
  
  // Status and Verification
  admissionStatus: { type: String, enum: ['Open', 'Closed', 'Coming Soon'], default: 'Open' },
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
  
  // Owner Information
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerName: { type: String, default: '' },
  ownerEmail: { type: String, default: '' },
  ownerPhone: { type: String, default: '' },
  
}, { timestamps: true });

module.exports = mongoose.model('Institute', instituteSchema); 