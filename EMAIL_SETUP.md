# 📧 Email Configuration Setup for Pakistan Online

## Quick Setup Instructions

To enable email verification and password reset functionality, you need to create a `.env` file in the `NexusBackend` folder with your email configuration.

### Step 1: Create .env file
Create a new file called `.env` in the `NexusBackend` folder (same directory as this file).

### Step 2: Add Email Configuration
Add these lines to your `.env` file:

```env
# Database Configuration
MONGODB_URI=mongodb+srv://ahmed357:pDliM118811@cluster0.vtangzf.mongodb.net/

# Email Configuration (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=dksixrq8u
CLOUDINARY_API_KEY=259956669756146
CLOUDINARY_API_SECRET=_N1eELU5kKl3QcgfH5vpMHGI-do

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-here

# Server Configuration
PORT=3000
NODE_ENV=development
```

### Step 3: Get Gmail App Password

1. **Enable 2-Factor Authentication** on your Gmail account
2. Go to **Google Account Settings**: https://myaccount.google.com/
3. Navigate to **Security** → **2-Step Verification** → **App Passwords**
4. Generate a new **App Password** for "Mail"
5. Copy the generated password (16 characters, no spaces)
6. Use this password in `EMAIL_PASS` (NOT your regular Gmail password)

### Step 4: Update .env file
Replace the placeholder values:
- `your-email@gmail.com` → Your actual Gmail address
- `your-app-password` → The App Password from Step 3

### Example .env file:
```env
EMAIL_USER=youremail@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop
```

### Step 5: Restart Server
After creating the `.env` file, restart your backend server:
```bash
npm start
```

## 🎉 What This Enables

✅ **Email Verification**: New users receive verification emails
✅ **Password Reset**: Users can reset forgotten passwords  
✅ **Resend Verification**: Users can request new verification emails
✅ **Professional Emails**: Beautiful HTML formatted emails with Pakistan Online branding

## 🔍 Testing

1. Sign up with a real email address
2. Check your inbox for verification email
3. Click the verification link
4. Log in successfully

## 🚨 Security Notes

- ✅ `.env` files are automatically ignored by Git (secure)
- ✅ Never commit email passwords to version control
- ✅ Use App Passwords, not your regular Gmail password
- ✅ Keep your `.env` file private

## 💡 Without Email Setup

If you don't set up email configuration:
- Users can still register (accounts are created)
- No verification emails are sent
- Login will show "Email verification temporarily unavailable"
- All other features work normally
