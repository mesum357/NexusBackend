const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const findOrCreate = require('mongoose-findorcreate');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  fullName: { type: String },
  email: { type: String, unique: true },
  mobile: { type: String },
  profileImage: { type: String },
  city: { type: String },
  bio: { type: String },
  website: { type: String },
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
userSchema.plugin(passportLocalMongoose, {
  usernameField: 'username',
  passwordField: 'password'
});
userSchema.plugin(findOrCreate);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
 