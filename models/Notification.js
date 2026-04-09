const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    comment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
    isRead: { type: Boolean, default: false },
    message: { type: String },
    /** store | education | health | social | system — used for GET ?scope= */
    scope: { type: String, index: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Notification', notificationSchema);
