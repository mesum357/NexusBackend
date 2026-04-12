const nodemailer = require('nodemailer');

/**
 * @returns {boolean} True if we can send transactional email (Resend API or Nodemailer SMTP/Gmail).
 */
function isTransactionalEmailConfigured() {
  if (process.env.RESEND_API_KEY) return true;
  const emailService = process.env.EMAIL_SERVICE || 'gmail';
  if (emailService === 'smtp') {
    return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  }
  return !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
}

function getDefaultFrom() {
  return (
    process.env.RESEND_FROM_EMAIL ||
    process.env.EMAIL_FROM ||
    process.env.SMTP_USER ||
    process.env.EMAIL_USER ||
    'onboarding@resend.dev'
  );
}

function createNodemailerTransport() {
  const emailService = process.env.EMAIL_SERVICE || 'gmail';
  if (emailService === 'smtp' && process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

/**
 * Send via Resend HTTP API or Nodemailer.
 * @param {{ to: string; subject: string; html: string; from?: string }} opts
 */
async function sendTransactionalMail(opts) {
  const from = opts.from || getDefaultFrom();
  const { to, subject, html } = opts;

  if (process.env.RESEND_API_KEY) {
    const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
    const toList = Array.isArray(to) ? to : [to].filter(Boolean);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: toList.length === 1 ? toList[0] : toList,
        subject,
        html,
      }),
    });
    const text = await res.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }
    if (!res.ok) {
      const msg =
        (data && (data.message || data.name || data.error)) || text || res.statusText || 'Resend send failed';
      console.error('Resend API error:', res.status, typeof msg === 'string' ? msg : JSON.stringify(msg));
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
    return data;
  }

  const transport = createNodemailerTransport();
  return transport.sendMail({ from, to, subject, html });
}

function verificationEmailHtml(fullName, verifyUrl) {
  const name = fullName || 'there';
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Welcome to E-Dunia, ${name}!</h2>
      <p>Please verify your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email Address</a>
      </div>
      <p>Or copy and paste this link in your browser:</p>
      <p style="color: #666; word-break: break-all;">${verifyUrl}</p>
      <p>If you did not create an account, you can ignore this email.</p>
    </div>
  `;
}

function passwordResetEmailHtml(fullName, resetUrl) {
  const name = fullName || 'there';
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Reset your password</h2>
      <p>Hi ${name},</p>
      <p>We received a request to reset your password. Click the button below to choose a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset password</a>
      </div>
      <p>Or copy and paste this link:</p>
      <p style="color: #666; word-break: break-all;">${resetUrl}</p>
      <p>If you did not request this, you can ignore this email.</p>
    </div>
  `;
}

module.exports = {
  isTransactionalEmailConfigured,
  getDefaultFrom,
  sendTransactionalMail,
  verificationEmailHtml,
  passwordResetEmailHtml,
};
