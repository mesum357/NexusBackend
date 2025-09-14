const nodemailer = require('nodemailer');

async function testEmailConfiguration() {
    console.log('🧪 Testing Email Configuration...\n');
    
    // Check environment variables
    console.log('📧 Environment Variables:');
    console.log('  EMAIL_USER:', process.env.EMAIL_USER ? 'SET' : 'NOT SET');
    console.log('  EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET' : 'NOT SET');
    console.log('  EMAIL_SERVICE:', process.env.EMAIL_SERVICE || 'gmail (default)');
    console.log('  SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? 'SET' : 'NOT SET');
    console.log('  MAILGUN_SMTP_LOGIN:', process.env.MAILGUN_SMTP_LOGIN ? 'SET' : 'NOT SET');
    console.log('  MAILGUN_SMTP_PASSWORD:', process.env.MAILGUN_SMTP_PASSWORD ? 'SET' : 'NOT SET');
    console.log('  SMTP_HOST:', process.env.SMTP_HOST ? 'SET' : 'NOT SET');
    console.log('  SMTP_USER:', process.env.SMTP_USER ? 'SET' : 'NOT SET');
    console.log('  SMTP_PASS:', process.env.SMTP_PASS ? 'SET' : 'NOT SET');
    
    const emailService = process.env.EMAIL_SERVICE || 'gmail';
    let emailConfigValid = false;
    
    // Check configuration based on service
    if (emailService === 'sendgrid') {
        emailConfigValid = !!process.env.SENDGRID_API_KEY;
        console.log('\n📧 SendGrid Configuration:', emailConfigValid ? 'VALID' : 'INVALID');
    } else if (emailService === 'mailgun') {
        emailConfigValid = !!(process.env.MAILGUN_SMTP_LOGIN && process.env.MAILGUN_SMTP_PASSWORD);
        console.log('\n📧 Mailgun Configuration:', emailConfigValid ? 'VALID' : 'INVALID');
    } else if (emailService === 'smtp') {
        emailConfigValid = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
        console.log('\n📧 SMTP Configuration:', emailConfigValid ? 'VALID' : 'INVALID');
    } else {
        // Gmail (default)
        emailConfigValid = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
        console.log('\n📧 Gmail Configuration:', emailConfigValid ? 'VALID' : 'INVALID');
    }
    
    console.log('\n📊 Email Configuration Status:', emailConfigValid ? '✅ READY' : '❌ NOT CONFIGURED');
    
    if (!emailConfigValid) {
        console.log('\n📝 To enable email verification, set the following environment variables:');
        console.log('   For Gmail:');
        console.log('     EMAIL_USER=your-email@gmail.com');
        console.log('     EMAIL_PASS=your-app-password');
        console.log('   For SendGrid:');
        console.log('     EMAIL_SERVICE=sendgrid');
        console.log('     SENDGRID_API_KEY=your-sendgrid-api-key');
        console.log('   For Mailgun:');
        console.log('     EMAIL_SERVICE=mailgun');
        console.log('     MAILGUN_SMTP_LOGIN=your-mailgun-smtp-login');
        console.log('     MAILGUN_SMTP_PASSWORD=your-mailgun-smtp-password');
        console.log('   For Custom SMTP:');
        console.log('     EMAIL_SERVICE=smtp');
        console.log('     SMTP_HOST=your-smtp-host');
        console.log('     SMTP_USER=your-smtp-user');
        console.log('     SMTP_PASS=your-smtp-password');
        
        console.log('\n⚠️ Without email configuration, users will be auto-verified');
        return false;
    }
    
    // Test transporter creation
    try {
        console.log('\n🔧 Creating email transporter...');
        
        let transporterConfig;
        
        if (emailService === 'sendgrid') {
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
            // Gmail configuration (default)
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
        
        const transporter = nodemailer.createTransporter({
            ...transporterConfig,
            debug: false,
            logger: false
        });
        
        console.log('✅ Email transporter created successfully');
        
        // Test connection
        console.log('🔌 Testing email connection...');
        await transporter.verify();
        console.log('✅ Email connection verified successfully');
        
        console.log('\n🎉 Email configuration is working!');
        console.log('📧 Email verification will be sent to users during registration');
        
        return true;
        
    } catch (error) {
        console.error('❌ Email configuration test failed:', error.message);
        console.log('\n⚠️ Email configuration has issues. Users will be auto-verified.');
        return false;
    }
}

// Run test
testEmailConfiguration().catch(console.error);
