const axios = require('axios');
const User = require('../models/User');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send Expo push notifications to all tokens registered for a user.
 * Fails silently on network errors (logged).
 */
async function sendExpoPushToUser(userId, title, body, data = {}) {
  try {
    const user = await User.findById(userId).select('expoPushTokens').lean();
    if (!user || !Array.isArray(user.expoPushTokens) || user.expoPushTokens.length === 0) {
      return;
    }
    const tokens = [...new Set(user.expoPushTokens.filter(Boolean))];
    if (tokens.length === 0) return;

    const messages = tokens.map((to) => ({
      to,
      title: title || 'E-Dunia',
      body: body || '',
      sound: 'default',
      data: typeof data === 'object' && data !== null ? data : {},
    }));

    const res = await axios.post(EXPO_PUSH_URL, messages, {
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      validateStatus: () => true,
    });
    if (res.status >= 400) {
      console.warn('Expo push send non-OK:', res.status, res.data);
    }
  } catch (e) {
    console.warn('Expo push send failed:', e.message);
  }
}

module.exports = { sendExpoPushToUser };
