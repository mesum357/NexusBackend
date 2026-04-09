const Notification = require('../models/Notification');
const { getIO } = require('./socket');
const { sendExpoPushToUser } = require('./expoPush');

/** Maps notification type to scope for filtering in the app. */
function scopeForType(type) {
  const store = new Set([
    'order_placed',
    'order_status_update',
    'shop_pending',
    'shop_approved',
    'shop_rejected',
    'product_approved',
    'product_rejected',
    'payment_verified',
    'payment_rejected',
    'payment_pending',
  ]);
  const education = new Set([
    'institute_pending',
    'institute_approved',
    'institute_rejected',
    'student_application_received',
    'student_application_status',
  ]);
  const health = new Set([
    'hospital_pending',
    'hospital_approved',
    'hospital_rejected',
    'patient_application_received',
    'patient_application_status',
  ]);
  const social = new Set(['like', 'comment', 'reply', 'follow']);
  if (store.has(type)) return 'store';
  if (education.has(type)) return 'education';
  if (health.has(type)) return 'health';
  if (social.has(type)) return 'social';
  if (type === 'welcome') return 'system';
  return 'system';
}

function titleForNotification(type) {
  const map = {
    order_placed: 'New order',
    order_status_update: 'Order update',
    shop_pending: 'Shop submitted',
    shop_approved: 'Shop approved',
    shop_rejected: 'Shop update',
    product_approved: 'Product approved',
    product_rejected: 'Product update',
    payment_verified: 'Payment verified',
    payment_rejected: 'Payment update',
    payment_pending: 'Payment',
    institute_approved: 'Institute approved',
    institute_rejected: 'Institute update',
    institute_pending: 'Institute submitted',
    student_application_received: 'New student application',
    student_application_status: 'Application update',
    hospital_approved: 'Hospital approved',
    hospital_rejected: 'Hospital update',
    hospital_pending: 'Hospital submitted',
    patient_application_received: 'New patient request',
    patient_application_status: 'Patient request update',
    welcome: 'Welcome',
  };
  return map[type] || 'Notification';
}

/**
 * Create a notification, emit Socket.IO to the user's room, and send Expo push.
 */
async function notifyUser({
  userId,
  type,
  message,
  fromUser,
  meta,
  scope: scopeOverride,
}) {
  const scope = scopeOverride || scopeForType(type);
  const payload = {
    user: userId,
    type,
    message: message || '',
    scope,
    meta: meta && typeof meta === 'object' ? meta : {},
  };
  if (fromUser) {
    payload.fromUser = fromUser;
  }

  const notification = await Notification.create(payload);
  const populated = await Notification.findById(notification._id)
    .populate('fromUser', 'username fullName profileImage')
    .lean();

  const io = getIO();
  if (io) {
    io.to(`user:${String(userId)}`).emit('notification', { notification: populated });
  }

  await sendExpoPushToUser(
    userId,
    titleForNotification(type),
    message || titleForNotification(type),
    {
      type,
      notificationId: String(notification._id),
      ...payload.meta,
    },
  );

  return populated;
}

module.exports = {
  notifyUser,
  scopeForType,
  titleForNotification,
};
