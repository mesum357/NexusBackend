const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const findOrCreate = require('mongoose-findorcreate');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  fullName: { type: String },
  email: { type: String },
  mobile: { type: String },
  profileImage: { type: String },
  city: { type: String },
  bio: { type: String },
  website: { type: String },
  password: { type: String }, // for local auth
  googleId: { type: String }, // for Google OAuth
  verified: { type: Boolean, default: false },
  verificationToken: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isAdmin: { type: Boolean, default: false } // Admin role for entity approval
}, { timestamps: true });

// Add plugins
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
 