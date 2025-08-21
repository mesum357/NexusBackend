const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const findOrCreate = require('mongoose-findorcreate');

const UsersSchema = new mongoose.Schema({
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
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }],
  isAdmin: { type: Boolean, default: false } // Admin role for entity approval
}, { timestamps: true });

// Add plugins
UsersSchema.plugin(passportLocalMongoose);
UsersSchema.plugin(findOrCreate);

module.exports = mongoose.models.Users || mongoose.model('Users', UsersSchema, 'Users');
 