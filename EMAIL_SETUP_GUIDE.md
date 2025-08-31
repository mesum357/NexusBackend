# Email Configuration Guide for Pakistan Online

This guide will help you set up email functionality for your Pakistan Online application.

## Current Issue
The nodemailer is failing because email environment variables are not configured on Railway. The application needs email credentials to send verification emails.

## Solution Options

### Option 1: Gmail Setup (Recommended for Development)

1. **Enable 2-Factor Authentication**
   - Go to your Google Account settings
   - Security → 2-Step Verification
   - Follow the setup process if not already enabled

2. **Generate App Password**
   - Go to Google Account → Security → 2-Step Verification
   - Click on "App passwords" at the bottom
   - Select "Mail" and generate password
   - Copy the 16-character password (no spaces)

3. **Set Environment Variables on Railway**
   ```bash
   EMAIL_USER=your-gmail-address@gmail.com
   EMAIL_PASS=your-16-character-app-password
   ```

### Option 2: SendGrid (Recommended for Production)

1. **Create SendGrid Account**
   - Go to https://sendgrid.com
   - Sign up for free account (100 emails/day free)

2. **Generate API Key**
   - Go to Settings → API Keys
   - Create new API key with "Full Access"
   - Copy the API key

3. **Set Environment Variables on Railway**
   ```bash
   EMAIL_SERVICE=sendgrid
   SENDGRID_API_KEY=your-sendgrid-api-key
   SMTP_USER=your-verified-sender-email@yourdomain.com
   ```

### Option 3: Mailgun

1. **Create Mailgun Account**
   - Go to https://mailgun.com
   - Sign up for free account

2. **Get SMTP Credentials**
   - Go to Sending → Domain settings
   - Find SMTP credentials

3. **Set Environment Variables on Railway**
   ```bash
   EMAIL_SERVICE=mailgun
   MAILGUN_SMTP_LOGIN=your-mailgun-smtp-login
   MAILGUN_SMTP_PASSWORD=your-mailgun-smtp-password
   ```

### Option 4: Custom SMTP

For any custom SMTP provider:

```bash
EMAIL_SERVICE=smtp
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
```

## How to Set Environment Variables on Railway

1. Go to your Railway project dashboard
2. Click on your backend service
3. Go to "Variables" tab
4. Add the environment variables listed above
5. Deploy the changes

## Testing Email Configuration

After setting up the environment variables, you can test the email configuration using the built-in test endpoint:

```bash
# Test email sending
curl -X POST https://your-backend-url.railway.app/debug/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "your-test-email@example.com"}'
```

## Troubleshooting

### Gmail Issues
- Make sure 2FA is enabled
- Use App Password, not regular password
- Check if "Less secure app access" is disabled (it should be)

### SendGrid Issues
- Verify your sender email address
- Check API key permissions
- Monitor your sending quota

### General Issues
- Check Railway logs for detailed error messages
- Verify all required environment variables are set
- Test with a simple email first

## Environment Variables Summary

Choose one of these sets:

**Gmail:**
```
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password
```

**SendGrid:**
```
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-api-key
SMTP_USER=your-verified-email@domain.com
```

**Mailgun:**
```
EMAIL_SERVICE=mailgun
MAILGUN_SMTP_LOGIN=your-login
MAILGUN_SMTP_PASSWORD=your-password
```

**Custom SMTP:**
```
EMAIL_SERVICE=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-username
SMTP_PASS=your-password
```
