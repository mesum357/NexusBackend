#!/usr/bin/env node

/**
 * Test Email Verification Script for Pakistan Online
 * 
 * This script tests the current email configuration and sends a test verification email
 * to massux357@gmail.com to verify the setup is working.
 */

require('dotenv').config();
const nodemailer = require('nodemailer');
const crypto = require('crypto');

async function testCurrentEmailSetup() {
    console.log('🚀 Testing current email configuration for Pakistan Online...');
    console.log('📧 Target email: massux357@gmail.com');
    console.log('⏰ Test started at:', new Date().toISOString());
    console.log('');
    
    // Check environment variables
    console.log('🔍 Checking current environment variables:');
    const emailService = process.env.EMAIL_SERVICE || 'gmail';
    console.log('📧 Email service:', emailService);
    
    let transporterConfig;
    let emailConfigValid = false;
    let fromEmail = 'noreply@pakistanonlines.com';
    
    if (emailService === 'sendgrid') {
        emailConfigValid = !!process.env.SENDGRID_API_KEY;
        console.log('✅ SENDGRID_API_KEY:', emailConfigValid ? 'SET ✓' : '❌ MISSING');
        console.log('✅ SMTP_USER:', process.env.SMTP_USER ? 'SET ✓' : '⚠️ MISSING (will use default)');
        
        fromEmail = process.env.SMTP_USER || 'noreply@pakistanonlines.com';
        
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
        emailConfigValid = !!(process.env.MAILGUN_SMTP_LOGIN && process.env.MAILGUN_SMTP_PASSWORD);
        console.log('✅ MAILGUN_SMTP_LOGIN:', process.env.MAILGUN_SMTP_LOGIN ? 'SET ✓' : '❌ MISSING');
        console.log('✅ MAILGUN_SMTP_PASSWORD:', process.env.MAILGUN_SMTP_PASSWORD ? 'SET ✓' : '❌ MISSING');
        
        fromEmail = process.env.MAILGUN_SMTP_LOGIN || 'noreply@pakistanonlines.com';
        
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
        emailConfigValid = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
        console.log('✅ SMTP_HOST:', process.env.SMTP_HOST ? `SET (${process.env.SMTP_HOST}) ✓` : '❌ MISSING');
        console.log('✅ SMTP_USER:', process.env.SMTP_USER ? 'SET ✓' : '❌ MISSING');
        console.log('✅ SMTP_PASS:', process.env.SMTP_PASS ? 'SET ✓' : '❌ MISSING');
        console.log('✅ SMTP_PORT:', process.env.SMTP_PORT || '587 (default)');
        console.log('✅ SMTP_SECURE:', process.env.SMTP_SECURE || 'false (default)');
        
        fromEmail = process.env.SMTP_USER;
        
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
        emailConfigValid = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
        console.log('✅ EMAIL_USER:', process.env.EMAIL_USER ? `SET (${process.env.EMAIL_USER.substring(0, 3)}***) ✓` : '❌ MISSING');
        console.log('✅ EMAIL_PASS:', process.env.EMAIL_PASS ? `SET (${process.env.EMAIL_PASS.length} chars) ✓` : '❌ MISSING');
        
        fromEmail = process.env.EMAIL_USER;
        
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
    
    console.log('📤 From email will be:', fromEmail || 'noreply@pakistanonlines.com');
    console.log('');
    
    if (!emailConfigValid) {
        console.log('❌ Email configuration is INVALID!');
        console.log('');
        console.log('🔧 Required environment variables for', emailService + ':');
        
        if (emailService === 'sendgrid') {
            console.log('   - SENDGRID_API_KEY (your SendGrid API key)');
            console.log('   - SMTP_USER (optional: your verified sender email)');
        } else if (emailService === 'mailgun') {
            console.log('   - MAILGUN_SMTP_LOGIN (your Mailgun SMTP login)');
            console.log('   - MAILGUN_SMTP_PASSWORD (your Mailgun SMTP password)');
        } else if (emailService === 'smtp') {
            console.log('   - SMTP_HOST (your SMTP server host)');
            console.log('   - SMTP_USER (your SMTP username)');
            console.log('   - SMTP_PASS (your SMTP password)');
        } else {
            console.log('   - EMAIL_USER (your Gmail address)');
            console.log('   - EMAIL_PASS (your Gmail App Password)');
        }
        
        console.log('');
        console.log('📋 See EMAIL_SETUP_GUIDE.md for detailed setup instructions.');
        process.exit(1);
    }
    
    console.log('✅ Email configuration appears VALID!');
    console.log('');
    
    // Create transporter
    console.log('🔧 Creating nodemailer transporter...');
    const transporter = nodemailer.createTransport({
        ...transporterConfig,
        debug: true,
        logger: true,
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 15000
    });
    
    try {
        // Test connection
        console.log('🔌 Testing SMTP connection...');
        console.log('📧 Connection timeout: 10 seconds');
        await transporter.verify();
        console.log('✅ SMTP connection successful!');
        console.log('');
        
        // Generate test verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        console.log('🔑 Generated test verification token:', verificationToken.substring(0, 10) + '...');
        
        // Create test verification URL (simulating production)
        const testVerifyUrl = `https://nexusbackend-production.up.railway.app/verify-email?token=${verificationToken}`;
        console.log('🔗 Test verification URL:', testVerifyUrl);
        console.log('');
        
        // Send test verification email (matching the production format)
        console.log('📤 Sending test verification email to massux357@gmail.com...');
        
        const testEmailData = {
            from: fromEmail || 'noreply@pakistanonlines.com',
            to: 'massux357@gmail.com',
            subject: 'Test Email Verification - Pakistan Online',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
                    <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h2 style="color: #2563eb; text-align: center; margin-bottom: 30px;">
                            🎉 Email Test Successful - Pakistan Online
                        </h2>
                        
                        <div style="background-color: #dcfce7; border: 1px solid #16a34a; border-radius: 8px; padding: 15px; margin: 20px 0;">
                            <h3 style="color: #166534; margin-top: 0;">✅ Email Configuration Working!</h3>
                            <p style="color: #166534; margin-bottom: 0;">
                                Your Pakistan Online email system is properly configured and working correctly.
                            </p>
                        </div>
                        
                        <p>Hi there,</p>
                        <p>This is a test email to verify that the email verification system for Pakistan Online is working correctly.</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${testVerifyUrl}" 
                               style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                                🔗 Test Verification Link
                            </a>
                        </div>
                        
                        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h4 style="margin-top: 0; color: #374151;">Test Configuration Details:</h4>
                            <ul style="color: #6b7280; margin-bottom: 0;">
                                <li><strong>Email Service:</strong> ${emailService}</li>
                                <li><strong>From Address:</strong> ${fromEmail || 'noreply@pakistanonlines.com'}</li>
                                <li><strong>Test Time:</strong> ${new Date().toISOString()}</li>
                                <li><strong>Verification Token:</strong> ${verificationToken.substring(0, 16)}...</li>
                                <li><strong>Test Environment:</strong> ${process.env.NODE_ENV || 'development'}</li>
                            </ul>
                        </div>
                        
                        <p>Or copy and paste this verification link in your browser:</p>
                        <p style="color: #666; word-break: break-all; font-family: monospace; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
                            ${testVerifyUrl}
                        </p>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                            <p style="color: #9ca3af; font-size: 14px; margin-bottom: 0;">
                                This is a test email from Pakistan Online email verification system.<br>
                                If you received this email, your email configuration is working correctly!
                            </p>
                        </div>
                    </div>
                </div>
            `
        };
        
        const startTime = Date.now();
        const result = await transporter.sendMail(testEmailData);
        const sendTime = Date.now() - startTime;
        
        console.log('✅ Test email sent successfully!');
        console.log('📧 Message ID:', result.messageId);
        console.log('⏱️ Send time:', sendTime + 'ms');
        console.log('📮 Sent to: massux357@gmail.com');
        console.log('📤 From:', fromEmail || 'noreply@pakistanonlines.com');
        console.log('');
        
        // Log verification token for testing
        console.log('🔑 Verification token for testing:', verificationToken);
        console.log('🔗 Test verification URL:', testVerifyUrl);
        console.log('');
        
        console.log('🎉 EMAIL TEST COMPLETED SUCCESSFULLY!');
        console.log('');
        console.log('📋 What to check next:');
        console.log('1. Check massux357@gmail.com inbox for the test email');
        console.log('2. Click the verification link to test the verification endpoint');
        console.log('3. Check spam/junk folder if email not in inbox');
        console.log('4. If successful, your users will now receive verification emails!');
        
        return {
            success: true,
            messageId: result.messageId,
            verificationToken: verificationToken,
            verifyUrl: testVerifyUrl,
            sendTime: sendTime,
            emailService: emailService,
            fromEmail: fromEmail
        };
        
    } catch (error) {
        console.error('❌ Email test FAILED!');
        console.error('');
        console.error('❌ Error name:', error.name);
        console.error('❌ Error message:', error.message);
        if (error.code) console.error('❌ Error code:', error.code);
        if (error.command) console.error('❌ Command:', error.command);
        if (error.response) console.error('❌ Response:', error.response);
        if (error.responseCode) console.error('❌ Response code:', error.responseCode);
        if (error.errno) console.error('❌ Error number:', error.errno);
        if (error.syscall) console.error('❌ System call:', error.syscall);
        if (error.hostname) console.error('❌ Hostname:', error.hostname);
        if (error.stack) {
            console.error('❌ Stack trace (first 5 lines):');
            console.error(error.stack.split('\n').slice(0, 5).join('\n'));
        }
        console.error('');
        
        console.log('💡 Troubleshooting tips for', emailService + ':');
        
        if (emailService === 'gmail') {
            console.log('- Verify 2-Factor Authentication is enabled on your Gmail account');
            console.log('- Use App Password (16 chars), not your regular Gmail password');
            console.log('- Check if the App Password is typed correctly (no spaces)');
            console.log('- Try generating a new App Password');
        } else if (emailService === 'sendgrid') {
            console.log('- Verify your SendGrid API key has "Full Access" permissions');
            console.log('- Check if your sender email is verified in SendGrid');
            console.log('- Verify your SendGrid account is active and not suspended');
            console.log('- Check SendGrid activity dashboard for bounces/blocks');
        } else if (emailService === 'mailgun') {
            console.log('- Verify your Mailgun domain is active and verified');
            console.log('- Check SMTP credentials in your Mailgun dashboard');
            console.log('- Ensure your Mailgun account is verified');
            console.log('- Check if you\'re using the correct region endpoint');
        } else if (emailService === 'smtp') {
            console.log('- Verify SMTP host, port, and security settings');
            console.log('- Check if your SMTP provider requires specific authentication');
            console.log('- Test credentials with your SMTP provider directly');
        }
        
        console.log('- Check your internet connection');
        console.log('- Review environment variables are set correctly');
        console.log('- Check Railway logs for more detailed error information');
        
        throw error;
    }
}

// Main execution
console.log('===============================================');
console.log('🧪 Pakistan Online Email Verification Test');
console.log('===============================================');
console.log('');

testCurrentEmailSetup()
    .then(result => {
        console.log('');
        console.log('===============================================');
        console.log('✅ TEST SUCCESSFUL - Email system is working!');
        console.log('===============================================');
        process.exit(0);
    })
    .catch(error => {
        console.log('');
        console.log('===============================================');
        console.log('❌ TEST FAILED - Please fix email configuration');
        console.log('===============================================');
        process.exit(1);
    });
