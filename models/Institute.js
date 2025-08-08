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
  // Basic Information
  name: { type: String, required: true },
  type: { type: String, enum: ['University', 'College', 'School', 'Academy'], required: true },
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