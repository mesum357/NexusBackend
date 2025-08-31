/**
 * Email Debug Test Script
 * Tests email functionality with comprehensive debugging
 */

const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmailConfiguration() {
    console.log('🧪 Starting Email Configuration Test...');
    console.log('=' .repeat(50));
    
    // Check environment variables
    console.log('📧 Environment Variables:');
    console.log('EMAIL_USER:', process.env.EMAIL_USER ? `${process.env.EMAIL_USER.substring(0, 5)}***` : 'NOT SET');
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? `[${process.env.EMAIL_PASS.length} chars]` : 'NOT SET');
    console.log('');
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('❌ Email configuration missing!');
        console.error('Please set EMAIL_USER and EMAIL_PASS environment variables');
        return;
    }
    
    try {
        console.log('🔧 Creating nodemailer transporter...');
        const transporter = nodemailer.createTransporter({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false
            },
            debug: true,
            logger: true
        });
        
        console.log('✅ Transporter created successfully');
        console.log('');
        
        console.log('🔍 Verifying transporter configuration...');
        const verifyStartTime = Date.now();
        
        await transporter.verify();
        const verifyEndTime = Date.now();
        
        console.log('✅ Transporter verified successfully in', verifyEndTime - verifyStartTime, 'ms');
        console.log('📧 Gmail connection is working!');
        console.log('');
        
        // Test sending an email
        console.log('📤 Sending test email...');
        const testEmail = process.env.EMAIL_USER; // Send to self for testing
        
        const emailData = {
            from: process.env.EMAIL_USER,
            to: testEmail,
            subject: 'Test Email - Pakistan Online Debug',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563eb;">Email Test Successful! 🎉</h2>
                    <p>This test email was sent from the Pakistan Online backend at:</p>
                    <p><strong>${new Date().toISOString()}</strong></p>
                    <p>If you're reading this, the email configuration is working correctly!</p>
                    <hr>
                    <h3>Configuration Details:</h3>
                    <ul>
                        <li>Service: Gmail</li>
                        <li>From: ${process.env.EMAIL_USER}</li>
                        <li>To: ${testEmail}</li>
                        <li>Test completed: ${new Date().toString()}</li>
                    </ul>
                    <p style="color: #666; font-size: 12px;">
                        This is an automated test email from Pakistan Online debugging system.
                    </p>
                </div>
            `
        };
        
        console.log('📤 Email data:', {
            from: emailData.from,
            to: emailData.to,
            subject: emailData.subject,
            htmlLength: emailData.html.length
        });
        
        const emailStartTime = Date.now();
        const result = await transporter.sendMail(emailData);
        const emailEndTime = Date.now();
        
        console.log('✅ Test email sent successfully in', emailEndTime - emailStartTime, 'ms');
        console.log('📮 Email result:', {
            messageId: result.messageId,
            response: result.response,
            accepted: result.accepted,
            rejected: result.rejected
        });
        
        console.log('');
        console.log('🎉 Email test completed successfully!');
        console.log('Check your inbox at:', testEmail);
        
    } catch (error) {
        console.error('❌ Email test failed!');
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            command: error.command,
            response: error.response,
            responseCode: error.responseCode
        });
        
        if (error.code === 'EAUTH') {
            console.error('');
            console.error('🔑 Authentication Error Solutions:');
            console.error('1. Make sure you\'re using an App Password, not your regular Gmail password');
            console.error('2. Enable 2-Factor Authentication on your Gmail account');
            console.error('3. Generate an App Password: https://myaccount.google.com/apppasswords');
            console.error('4. Use the App Password as EMAIL_PASS environment variable');
        } else if (error.code === 'ENOTFOUND') {
            console.error('');
            console.error('🌐 Network Error Solutions:');
            console.error('1. Check your internet connection');
            console.error('2. Make sure Gmail SMTP is not blocked by firewall');
            console.error('3. Try using a different network');
        }
    }
}

// Run the test
testEmailConfiguration().then(() => {
    console.log('Test script completed');
    process.exit(0);
}).catch((error) => {
    console.error('Test script failed:', error);
    process.exit(1);
});
