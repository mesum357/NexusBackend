#!/usr/bin/env node

/**
 * Email Configuration Test Script for Pakistan Online
 * 
 * This script tests the email configuration independently of the main application.
 * Run this to verify your email setup before deploying.
 * 
 * Usage:
 *   node test-email.js your-test-email@example.com
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmailConfiguration(testEmail) {
    console.log('🚀 Starting email configuration test...');
    console.log('');
    
    // Check environment variables
    console.log('🔍 Checking environment variables:');
    const emailService = process.env.EMAIL_SERVICE || 'gmail';
    console.log('📧 Email service:', emailService);
    
    let transporterConfig;
    let configValid = false;
    
    if (emailService === 'sendgrid') {
        configValid = !!process.env.SENDGRID_API_KEY;
        console.log('✅ SENDGRID_API_KEY:', configValid ? 'SET' : '❌ MISSING');
        console.log('✅ SMTP_USER:', process.env.SMTP_USER ? 'SET' : '⚠️ MISSING (will use default)');
        
        transporterConfig = {
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false,
            auth: {
                user: 'apikey',
                pass: process.env.SENDGRID_API_KEY
            }
        };
    } else if (emailService === 'mailgun') {
        configValid = !!(process.env.MAILGUN_SMTP_LOGIN && process.env.MAILGUN_SMTP_PASSWORD);
        console.log('✅ MAILGUN_SMTP_LOGIN:', process.env.MAILGUN_SMTP_LOGIN ? 'SET' : '❌ MISSING');
        console.log('✅ MAILGUN_SMTP_PASSWORD:', process.env.MAILGUN_SMTP_PASSWORD ? 'SET' : '❌ MISSING');
        
        transporterConfig = {
            host: 'smtp.mailgun.org',
            port: 587,
            secure: false,
            auth: {
                user: process.env.MAILGUN_SMTP_LOGIN,
                pass: process.env.MAILGUN_SMTP_PASSWORD
            }
        };
    } else if (emailService === 'smtp') {
        configValid = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
        console.log('✅ SMTP_HOST:', process.env.SMTP_HOST ? 'SET' : '❌ MISSING');
        console.log('✅ SMTP_USER:', process.env.SMTP_USER ? 'SET' : '❌ MISSING');
        console.log('✅ SMTP_PASS:', process.env.SMTP_PASS ? 'SET' : '❌ MISSING');
        console.log('✅ SMTP_PORT:', process.env.SMTP_PORT || '587 (default)');
        console.log('✅ SMTP_SECURE:', process.env.SMTP_SECURE || 'false (default)');
        
        transporterConfig = {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        };
    } else {
        // Gmail (default)
        configValid = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
        console.log('✅ EMAIL_USER:', process.env.EMAIL_USER ? `SET (${process.env.EMAIL_USER.substring(0, 3)}***)` : '❌ MISSING');
        console.log('✅ EMAIL_PASS:', process.env.EMAIL_PASS ? `SET (${process.env.EMAIL_PASS.length} chars)` : '❌ MISSING');
        
        transporterConfig = {
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false
            }
        };
    }
    
    console.log('');
    
    if (!configValid) {
        console.log('❌ Email configuration is invalid!');
        console.log('Please check the EMAIL_SETUP_GUIDE.md for configuration instructions.');
        process.exit(1);
    }
    
    console.log('✅ Email configuration appears valid');
    console.log('');
    
    // Create transporter
    console.log('🔧 Creating nodemailer transporter...');
    const transporter = nodemailer.createTransporter({
        ...transporterConfig,
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 15000
    });
    
    try {
        // Test connection
        console.log('🔌 Testing SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection successful!');
        console.log('');
        
        // Determine from email
        let fromEmail = process.env.EMAIL_USER;
        if (emailService === 'sendgrid' || emailService === 'smtp') {
            fromEmail = process.env.SMTP_USER || process.env.EMAIL_USER;
        } else if (emailService === 'mailgun') {
            fromEmail = process.env.MAILGUN_SMTP_LOGIN || process.env.EMAIL_USER;
        }
        
        // Send test email
        console.log(`📤 Sending test email to: ${testEmail}`);
        console.log(`📤 From: ${fromEmail || 'noreply@pakistanonlines.com'}`);
        
        const testEmailData = {
            from: fromEmail || 'noreply@pakistanonlines.com',
            to: testEmail,
            subject: 'Test Email - Pakistan Online Configuration',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2563eb;">🎉 Email Configuration Test Successful!</h2>
                    <p>Congratulations! Your email configuration for Pakistan Online is working correctly.</p>
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Configuration Details:</h3>
                        <ul>
                            <li><strong>Email Service:</strong> ${emailService}</li>
                            <li><strong>From Address:</strong> ${fromEmail || 'noreply@pakistanonlines.com'}</li>
                            <li><strong>Test Time:</strong> ${new Date().toISOString()}</li>
                        </ul>
                    </div>
                    <p>Your users will now be able to receive verification emails when they register.</p>
                    <p style="color: #666; font-size: 14px;">
                        This is a test email from Pakistan Online email configuration testing.
                    </p>
                </div>
            `
        };
        
        const result = await transporter.sendMail(testEmailData);
        console.log('✅ Test email sent successfully!');
        console.log('📧 Message ID:', result.messageId);
        console.log('');
        console.log('🎉 Email configuration test completed successfully!');
        console.log('You can now proceed with your application deployment.');
        
    } catch (error) {
        console.error('❌ Email test failed!');
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            command: error.command,
            response: error.response
        });
        console.log('');
        console.log('💡 Troubleshooting tips:');
        
        if (emailService === 'gmail') {
            console.log('- Make sure 2-Factor Authentication is enabled');
            console.log('- Use App Password, not your regular Gmail password');
            console.log('- Check if the App Password is 16 characters without spaces');
        } else if (emailService === 'sendgrid') {
            console.log('- Verify your SendGrid API key has full access permissions');
            console.log('- Make sure your sender email is verified in SendGrid');
            console.log('- Check your SendGrid account status and limits');
        } else if (emailService === 'mailgun') {
            console.log('- Verify your Mailgun domain is active');
            console.log('- Check SMTP credentials in Mailgun dashboard');
            console.log('- Ensure your account is verified');
        }
        
        console.log('- Check your internet connection');
        console.log('- Review the EMAIL_SETUP_GUIDE.md for detailed instructions');
        
        process.exit(1);
    }
}

// Main execution
const testEmail = process.argv[2];
if (!testEmail) {
    console.log('❌ Please provide a test email address');
    console.log('Usage: node test-email.js your-test-email@example.com');
    process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(testEmail)) {
    console.log('❌ Please provide a valid email address');
    process.exit(1);
}

testEmailConfiguration(testEmail).catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
});
