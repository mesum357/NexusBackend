const mongoose = require('mongoose');

const studentApplicationSchema = new mongoose.Schema({
  institute: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  studentName: { type: String, required: true },
  fatherName: { type: String, required: true },
  cnic: { type: String, required: true },
  city: { type: String, required: true },
  courseName: { type: String, required: true },
  courseDuration: { type: String },
  profileImage: { type: String }, // Cloudinary URL
  status: { type: String, enum: ['submitted', 'review', 'accepted', 'rejected'], default: 'submitted' },
}, { timestamps: true });

module.exports = mongoose.model('StudentApplication', studentApplicationSchema);


