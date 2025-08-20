const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;
require('dotenv').config();
console.log('Loaded MONGODB_URI:', process.env.MONGODB_URI);
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');
const server = http.createServer(app);
const io = socketIo(server);
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const findOrCreate = require('mongoose-findorcreate');
const passportLocalMongoose = require('passport-local-mongoose');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const cors = require('cors');
const shopRoutes = require('./routes/shop');
const shopWizardRoutes = require('./routes/shop-wizard');
const instituteRoutes = require('./routes/institute');
const feedRoutes = require('./routes/feed');
const friendsRoutes = require('./routes/friends');
const followRoutes = require('./routes/follow');
const marketplaceRoutes = require('./routes/marketplace');
const categoryRoutes = require('./routes/categories');
const paymentRoutes = require('./routes/payment');
const adminRoutes = require('./routes/admin');
const fs = require('fs');
const { upload } = require('./middleware/cloudinary');

// mongodb+srv://mesum357:pDliM118811@cluster0.h3knh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local').Strategy;

// Email setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'massux357@gmail.com';

app.use(express.json());

// Trust Railway/Proxy so secure cookies work behind HTTPS proxies
app.set('trust proxy', 1);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL, /\.railway\.app$/]
    : ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:8083', 'http://localhost:8082', 'http://localhost:3001'],
  credentials: true,
}));

// Session configuration
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  proxy: isProduction,
  cookie: {
    httpOnly: true,
    secure: isProduction, // required for SameSite=None
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 60 * 60 * 24 * 7, // 7 days
  }),
}));

app.use(passport.initialize());
app.use(passport.session());

// MONGOOSE
// The mongfooos options are the
const mongooseOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true
};

if (process.env.NODE_ENV === 'production') {
    mongooseOptions.ssl = true;
    mongooseOptions.tls = true;
    mongooseOptions.tlsAllowInvalidCertificates = true;
    mongooseOptions.tlsAllowInvalidHostnames = true;
}

// Get MongoDB URI from environment or use default
const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
    console.error("MONGODB_URI is not defined in environment variables");
    process.exit(1);
}

mongoose.connect(mongoURI, mongooseOptions)
    .then(() => {
        console.log("Connected to MongoDB ");
    })
    .catch((err) => {
        console.error("Error connecting to MongoDB Atlas:", err);
        process.exit(1);
    });

const User = require('./models/User');
const Institute = require('./models/Institute');
const Shop = require('./models/Shop');
const Product = require('./models/Product');
const PaymentRequest = require('./models/PaymentRequest');

// Passport configuration
passport.use(new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password'
}, async function(username, password, done) {
    try {
        console.log('🔐 Passport authentication attempt for:', username);
        
        // Try to find user by username first, then by email
        let user = await User.findOne({ username: username });
        if (!user) {
            // If not found by username, try by email
            user = await User.findOne({ email: username });
            console.log('🔍 User not found by username, trying email:', username);
        }
        
        if (!user) {
            console.log('❌ User not found by username or email:', username);
            return done(null, false, { message: 'Invalid username or password' });
        }
        
        console.log('✅ User found:', user.username, 'Verifying password...');
        
        const isPasswordValid = await user.authenticate(password);
        if (!isPasswordValid) {
            console.log('❌ Password verification failed for user:', user.username);
            return done(null, false, { message: 'Invalid username or password' });
        }
        
        console.log('✅ Password verified successfully for user:', user.username);
        return done(null, user);
    } catch (err) {
        console.error('❌ Passport authentication error:', err);
        return done(err);
    }
}));

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(async function(id, done) {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.NODE_ENV === 'production' 
        ? `https://${process.env.RAILWAY_STATIC_URL}/auth/google/homepage`
        : "http://localhost:3000/auth/google/homepage",
    passReqToCallback: true
},
async function(req, accessToken, refreshToken, profile, done) {
    try {
        let user = await User.findOne({ googleId: profile.id });
        
        if (!user) {
            user = await User.create({
                googleId: profile.id,
                username: profile.emails[0].value,
                email: profile.emails[0].value
            });
        }
        
        return done(null, user);
    } catch (err) {
        return done(err, null);
    }
}));

// Set up layout


// Routes



function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login?error=Please login to access this page');
}

// Login page route
app.get('/login', function(req, res) {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    res.send({
        value: req.isAuthenticated() ? 1 : 0,
        data: req.user,
        error: req.query.error,
        success: req.query.success
    });
});

// Register page route
app.get('/register', function(req, res) {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    res.send({
        value: req.isAuthenticated() ? 1 : 0,
        data: req.user,
        error: req.query.error,
        success: req.query.success
    });
});

// Register API route
app.post("/register", upload.single('profileImage'), async function(req, res) {
    const { password, confirmPassword, email, fullName, mobile } = req.body;
    console.log('Register request body:', req.body); // Log incoming data
    
    // Validation
    if (!password || !confirmPassword || !email || !fullName || !mobile) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match' });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Prepare user data
    const userData = {
        username: email, // Keep username as email for compatibility
        email: email,
        fullName: fullName,
        mobile: mobile,
        verified: false,
        verificationToken
    };
    
    // Add profile image if uploaded
    if (req.file) {
        userData.profileImage = req.file.path; // Cloudinary URL
    }
    
    User.register(userData, password, async function(err, user) {
        if (err) {
            console.error('Registration error:', err); // Log registration errors
            let errorMessage = 'Registration failed';
            if (err.name === 'UserExistsError') {
                errorMessage = 'User already exists with this email';
            }
            return res.status(400).json({ error: errorMessage });
        }
        // Send verification email
        const verifyUrl = `${req.protocol}://${req.get('host')}/verify-email?token=${verificationToken}`;
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.username,
            subject: 'Verify your email for Smart Travel',
            html: `<h2>Welcome, ${user.fullName || user.username}!</h2><p>Please verify your email by clicking the link below:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`
        });
        return res.status(201).json({ success: true, message: 'Registration successful! Please check your email to verify your account.' });
    });
});



app.get('/verify-email', async (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.redirect('/login?error=Invalid or missing verification token.');
    }
    const user = await User.findOne({ verificationToken: token });
    if (!user) {
        return res.redirect('/login?error=Invalid or expired verification token.');
    }
    user.verified = true;
    user.verificationToken = undefined;
    await user.save();
    res.redirect('/login?success=Email verified! You can now log in.');
});

// Login API route
app.post("/login", function(req, res, next) {
    passport.authenticate("local", function(err, user, info) {
        if (err) {
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        // In development, allow unverified users to login
        if (!user.verified && process.env.NODE_ENV !== 'development') {
            return res.status(401).json({ error: 'Please verify your email before logging in.' });
        }
        req.logIn(user, function(err) {
            if (err) {
                return res.status(500).json({ error: 'Internal server error' });
            }
            return res.status(200).json({ success: true, message: 'Login successful', user: { id: user._id, email: user.email, username: user.username } });
        });
    })(req, res, next);
});

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/homepage',
    passport.authenticate('google', { failureRedirect: '/' }),
    function(req, res) {
        res.redirect('/');
    });

app.get('/logout', function(req, res, next) {
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});
const abcv = 45
app.get('/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Add the /api/auth/me endpoint that the frontend expects
app.get('/api/auth/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Add /api/auth/register endpoint for admin panel
app.post('/api/auth/register', upload.single('profileImage'), async function(req, res) {
    const { password, confirmPassword, email, fullName, mobile, city, username, isAdmin } = req.body;
    console.log('🚀 Admin Register request received');
    console.log('📝 Request body:', req.body);
    console.log('🔍 Individual fields:', { 
        password: !!password, 
        confirmPassword: !!confirmPassword, 
        email: !!email, 
        fullName: !!fullName, 
        mobile: !!mobile, 
        city: !!city, 
        username: !!username 
    });
    
    // Validation - make city optional for now
    if (!password || !confirmPassword || !email || !fullName || !mobile || !username) {
        console.log('❌ Validation failed for fields:', { 
            password: !!password, 
            confirmPassword: !!confirmPassword, 
            email: !!email, 
            fullName: !!fullName, 
            mobile: !!mobile, 
            city: !!city, 
            username: !!username 
        });
        return res.status(400).json({ error: 'All fields are required' });
    }
    if (password !== confirmPassword) {
        console.log('❌ Password mismatch');
        return res.status(400).json({ error: 'Passwords do not match' });
    }
    if (password.length < 6) {
        console.log('❌ Password too short');
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    console.log('✅ Validation passed, creating user...');
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Prepare user data
    const userData = {
        username: username,
        email: email,
        fullName: fullName,
        mobile: mobile,
        city: city || '', // Make city optional
        verified: true, // Admin users are auto-verified
        verificationToken,
        isAdmin: isAdmin || false
    };
    
    console.log('👤 User data prepared:', userData);
    
    // Add profile image if uploaded
    if (req.file) {
        userData.profileImage = req.file.path;
        console.log('📸 Profile image added:', req.file.path);
    }
    
    User.register(userData, password, async function(err, user) {
        if (err) {
            console.error('❌ Admin Registration error:', err);
            let errorMessage = 'Registration failed';
            if (err.name === 'UserExistsError') {
                errorMessage = 'User already exists with this email or username';
            }
            return res.status(400).json({ error: errorMessage });
        }
        
        console.log('✅ User registered successfully:', user._id);
        
        // Admin users don't need email verification
        user.verified = true;
        user.verificationToken = undefined;
        await user.save();
        
        console.log('✅ User saved and verified');
        
        return res.status(201).json({ 
            success: true, 
            message: 'Admin user registered successfully!',
            user: { 
                id: user._id, 
                email: user.email, 
                username: user.username,
                isAdmin: user.isAdmin 
            }
        });
    });
});



// Add /api/auth/login endpoint for admin panel
app.post('/api/auth/login', function(req, res, next) {
    console.log('🔐 Admin Login request received');
    console.log('📝 Login request body:', req.body);
    console.log('🔍 Login attempt for username/email:', req.body.username);
    
    passport.authenticate("local", function(err, user, info) {
        if (err) {
            console.error('❌ Passport authentication error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!user) {
            console.log('❌ Passport authentication failed - no user returned');
            console.log('ℹ️ Passport info:', info);
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        console.log('✅ Passport authentication successful for user:', user.username);
        
        // In development, allow unverified users to login
        if (!user.verified && process.env.NODE_ENV !== 'development') {
            console.log('❌ User not verified:', user.username);
            return res.status(401).json({ error: 'Please verify your email before logging in.' });
        }
        
        console.log('✅ User verified, logging in...');
        
        req.logIn(user, function(err) {
            if (err) {
                console.error('❌ Login error:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            
            console.log('✅ User logged in successfully:', user.username);
            console.log('🔐 Session created for user:', user._id);
            
            return res.status(200).json({ 
                success: true, 
                message: 'Login successful', 
                user: { 
                    id: user._id, 
                    email: user.email, 
                    username: user.username,
                    isAdmin: user.isAdmin || false
                } 
            });
        });
    })(req, res, next);
});

// Add /api/auth/logout endpoint for admin panel
app.post('/api/auth/logout', function(req, res, next) {
    req.logout(function(err) {
        if (err) { 
            return next(err); 
        }
        res.status(200).json({ success: true, message: 'Logout successful' });
    });
});

// Payment Settings endpoints
app.get('/api/admin/payment-settings', async function(req, res) {
    try {
        // Check if user is admin
        if (!req.isAuthenticated() || !req.user.isAdmin) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Check if we have stored settings (from admin panel updates)
        if (global.paymentSettings) {
            return res.json({ settings: global.paymentSettings });
        }
        
        // Return default settings if none stored
        const defaultSettings = {
            bankName: 'HBL Bank',
            accountTitle: 'Pak Nexus Services',
            accountNumber: '1234-5678-9012-3456',
            iban: 'PK36HABB0000001234567890',
            branchCode: '1234',
            swiftCode: 'HABBPKKA',
            qrCodeImage: '',
            paymentAmounts: {
                shop: 5000,
                institute: 10000,
                hospital: 15000,
                marketplace: 2000
            }
        };

        res.json({ settings: defaultSettings });
    } catch (error) {
        console.error('Error fetching payment settings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/admin/payment-settings', upload.single('qrCodeImage'), async function(req, res) {
    try {
        // Check if user is admin
        if (!req.isAuthenticated() || !req.user.isAdmin) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { bankName, accountTitle, accountNumber, iban, branchCode, swiftCode, paymentAmounts } = req.body;
        
        // Validate required fields
        if (!bankName || !accountTitle || !accountNumber || !iban) {
            return res.status(400).json({ error: 'Required fields are missing' });
        }

        // Parse payment amounts
        let parsedPaymentAmounts;
        try {
            parsedPaymentAmounts = JSON.parse(paymentAmounts);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid payment amounts format' });
        }

        // Handle QR code image upload
        let qrCodeImageUrl = '';
        if (req.file) {
            qrCodeImageUrl = req.file.path; // Cloudinary URL
        }

        // Store settings in global variable for frontend access
        // In production, you'd save these to a database
        const updatedSettings = {
            bankName,
            accountTitle,
            accountNumber,
            iban,
            branchCode: branchCode || '',
            swiftCode: swiftCode || '',
            qrCodeImage: qrCodeImageUrl,
            paymentAmounts: parsedPaymentAmounts
        };
        
        // Store in global variable for frontend access
        global.paymentSettings = updatedSettings;

        res.json({ 
            success: true, 
            message: 'Payment settings updated successfully',
            settings: updatedSettings
        });
    } catch (error) {
        console.error('Error updating payment settings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Public endpoint to get payment settings for frontend
app.get('/api/payment/settings', async function(req, res) {
    try {
        // In a real application, you'd store these in a database
        // For now, we'll use a simple in-memory storage that gets updated by admin
        // You can replace this with database storage later
        
        // Check if we have stored settings (from admin panel updates)
        if (global.paymentSettings) {
            return res.json({ settings: global.paymentSettings });
        }
        
        // Return default settings if none stored
        const defaultSettings = {
            bankName: 'HBL Bank',
            accountTitle: 'Pak Nexus Services',
            accountNumber: '1234-5678-9012-3456',
            iban: 'PK36HABB0000001234567890',
            branchCode: '1234',
            swiftCode: 'HABBPKKA',
            qrCodeImage: '',
            paymentAmounts: {
                shop: 5000,
                institute: 10000,
                hospital: 15000,
                marketplace: 2000
            }
        };

        res.json({ settings: defaultSettings });
    } catch (error) {
        console.error('Error fetching payment settings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Add public admin stats endpoint (no authentication required)
app.get('/api/admin/public/stats', async function(req, res) {
  try {
    const [
      totalInstitutes,
      pendingInstitutes,
      totalShops,
      pendingShops,
      totalProducts,
      pendingProducts,
      totalPaymentRequests,
      pendingPaymentRequests
    ] = await Promise.all([
      Institute.countDocuments(),
      Institute.countDocuments({ approvalStatus: 'pending' }),
      Shop.countDocuments(),
      Shop.countDocuments({ approvalStatus: 'pending' }),
      Product.countDocuments(),
      Product.countDocuments({ approvalStatus: 'pending' }),
      PaymentRequest.countDocuments(),
      PaymentRequest.countDocuments({ status: 'pending' })
    ]);

    res.json({
      entities: {
        institutes: { total: totalInstitutes, pending: pendingInstitutes },
        shops: { total: totalShops, pending: pendingShops },
        products: { total: totalProducts, pending: pendingProducts }
      },
      payments: {
        total: totalPaymentRequests,
        pending: pendingPaymentRequests
      }
    });
  } catch (error) {
    console.error('Error fetching public admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch admin statistics' });
  }
});

// Add public pending entities endpoint (no authentication required)
app.get('/api/admin/public/pending-entities', async function(req, res) {
  try {
    const [pendingInstitutes, pendingShops, pendingProducts] = await Promise.all([
      Institute.find({ approvalStatus: 'pending' }).populate('owner', 'username email fullName'),
      Shop.find({ approvalStatus: 'pending' }).populate('owner', 'username email fullName'),
      Product.find({ approvalStatus: 'pending' }).populate('owner', 'username email fullName')
    ]);

    // Add entityType field to each entity
    const institutesWithType = pendingInstitutes.map(inst => ({
      ...inst.toObject(),
      entityType: 'institute'
    }));
    
    const shopsWithType = pendingShops.map(shop => ({
      ...shop.toObject(),
      entityType: 'shop'
    }));
    
    const productsWithType = pendingProducts.map(product => ({
      ...product.toObject(),
      entityType: 'product'
    }));

    res.json({
      institutes: institutesWithType,
      shops: shopsWithType,
      products: productsWithType
    });
  } catch (error) {
    console.error('Error fetching pending entities:', error);
    res.status(500).json({ error: 'Failed to fetch pending entities' });
  }
});

// Add public approval endpoints (no authentication required for testing)
app.put('/api/admin/public/institute/:id/approval', async function(req, res) {
  try {
    const { status, notes } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "approved" or "rejected"' });
    }

    const institute = await Institute.findById(req.params.id);
    if (!institute) {
      return res.status(404).json({ error: 'Institute not found' });
    }

    institute.approvalStatus = status;
    institute.approvalNotes = notes || '';
    institute.approvedAt = new Date();
    
    // If approved, also set verified to true
    if (status === 'approved') {
      institute.verified = true;
    }

    await institute.save();

    res.json({ 
      success: true, 
      message: `Institute ${status} successfully`,
      institute 
    });
  } catch (error) {
    console.error('Error updating institute approval:', error);
    res.status(500).json({ error: 'Failed to update institute approval' });
  }
});

app.put('/api/admin/public/shop/:id/approval', async function(req, res) {
  try {
    const { status, notes } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "approved" or "rejected"' });
    }

    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    shop.approvalStatus = status;
    shop.approvalNotes = notes || '';
    shop.approvedAt = new Date();

    await shop.save();

    res.json({ 
      success: true, 
      message: `Shop ${status} successfully`,
      shop 
    });
  } catch (error) {
    console.error('Error updating shop approval:', error);
    res.status(500).json({ error: 'Failed to update shop approval' });
  }
});

app.put('/api/admin/public/product/:id/approval', async function(req, res) {
  try {
    const { status, notes } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "approved" or "rejected"' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    product.approvalStatus = status;
    product.approvalNotes = notes || '';
    product.approvedAt = new Date();

    await product.save();

    res.json({ 
      success: true, 
      message: `Product ${status} successfully`,
      product 
    });
  } catch (error) {
    console.error('Error updating product approval:', error);
    res.status(500).json({ error: 'Failed to update product approval' });
  }
});

// Add public payment requests endpoint (no authentication required)
app.get('/api/admin/public/payment-requests', async function(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const entityType = req.query.entityType;
    
    const skip = (page - 1) * limit;
    
    // Build query
    const query = {};
    if (status) query.status = status;
    if (entityType) query.entityType = entityType;
    
    const [paymentRequests, total] = await Promise.all([
      PaymentRequest.find(query)
        .populate('user', 'username email fullName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PaymentRequest.countDocuments(query)
    ]);
    
    // Populate Agent IDs from associated entities for payment requests that don't have them
    const enhancedPaymentRequests = await Promise.all(
      paymentRequests.map(async (payment) => {
        console.log(`\n🔍 Processing payment ${payment._id}:`);
        console.log(`   Current agentId: ${payment.agentId}`);
        console.log(`   Entity Type: ${payment.entityType}`);
        console.log(`   Entity ID: ${payment.entityId}`);
        
        // If payment already has agentId, use it
        if (payment.agentId) {
          console.log(`   ✅ Payment already has agentId: ${payment.agentId}`);
          return payment;
        }
        
        // Try to fetch agentId from associated entity
        if (payment.entityId) {
          try {
            let entity;
            switch (payment.entityType) {
              case 'institute':
              case 'hospital':
                entity = await Institute.findById(payment.entityId);
                break;
              case 'shop':
                entity = await Shop.findById(payment.entityId);
                break;
              case 'marketplace':
                entity = await Product.findById(payment.entityId);
                break;
            }
            if (entity && entity.agentId) {
              payment.agentId = entity.agentId;
              console.log(`   ✅ Found Agent ID ${entity.agentId} for payment ${payment._id} from ${payment.entityType} ${payment.entityId}`);
            } else if (entity) {
              console.log(`   ⚠️ Entity found for payment ${payment._id} but no Agent ID set: ${entity.name || entity.shopName || entity.title}`);
            } else {
              console.log(`   ❌ No entity found for payment ${payment._id} with entityId: ${payment.entityId}`);
            }
          } catch (error) {
            console.log(`   ❌ Error fetching entity for payment ${payment._id}:`, error.message);
          }
        } else {
          console.log(`   ⚠️ Payment ${payment._id} has no entityId, skipping Agent ID lookup`);
        }
        
        console.log(`   Final agentId: ${payment.agentId}`);
        return payment;
      })
    );
    
    console.log('\n📊 Final enhanced payment requests:');
    enhancedPaymentRequests.forEach((payment, index) => {
      console.log(`   ${index + 1}. Payment ${payment._id}: agentId = ${payment.agentId || 'N/A'}`);
    });
    
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      paymentRequests: enhancedPaymentRequests,
      totalPages,
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching payment requests:', error);
    res.status(500).json({ error: 'Failed to fetch payment requests' });
  }
});

// Add public users endpoint (no authentication required)
app.get('/api/admin/public/users', async function(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search;
    const role = req.query.role;
    const verified = req.query.verified;
    
    const skip = (page - 1) * limit;
    
    // Build query
    const query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } }
      ];
    }
    if (role === 'admin') query.isAdmin = true;
    if (role === 'user') query.isAdmin = false;
    if (verified === 'true') query.verified = true;
    if (verified === 'false') query.verified = false;
    
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query)
    ]);
    
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      users,
      totalPages,
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});


app.get('/', (req, res) => {
    res.send('Hello World');
});

// Forgot Password: Send reset link
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  const user = await User.findOne({ email });
  if (!user) {
    // For security, always respond with success
    return res.status(200).json({ message: 'If your email is registered, you’ll receive a reset link shortly.' });
  }
  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = Date.now() + 1000 * 60 * 60; // 1 hour
  await user.save();
  // Send email
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: 'Password Reset Request',
    html: `<p>You requested a password reset. Click the link below to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, you can ignore this email.</p>`
  });
  res.status(200).json({ message: 'If your email is registered, you’ll receive a reset link shortly.' });
});

// Reset Password: Update password
app.post('/reset-password', async (req, res) => {
  const { token, password, confirmPassword } = req.body;
  if (!token || !password || !confirmPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }
  const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }
  user.setPassword(password, async (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to reset password' });
    }
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.status(200).json({ message: 'Password has been reset successfully' });
  });
});

// Endpoint to automatically approve entity when payment is verified
app.post('/api/admin/approve-entity', async function(req, res) {
    try {
        // Check if user is admin
        if (!req.isAuthenticated() || !req.user.isAdmin) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { userId, entityType, paymentRequestId } = req.body;
        
        if (!userId || !entityType || !paymentRequestId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        console.log(`Approving ${entityType} for user ${userId} after payment verification`);

        // Import models based on entity type
        let EntityModel;
        let entityCollection;
        
        switch (entityType) {
            case 'shop':
                EntityModel = require('./models/Shop');
                entityCollection = 'shops';
                break;
            case 'institute':
                EntityModel = require('./models/Institute');
                entityCollection = 'institutes';
                break;
            case 'hospital':
                // For now, use Institute model for hospitals since they share the same schema
                EntityModel = require('./models/Institute');
                entityCollection = 'institutes';
                break;
            case 'marketplace':
                // For now, use Shop model for marketplace since they share similar structure
                EntityModel = require('./models/Shop');
                entityCollection = 'shops';
                break;
            default:
                return res.status(400).json({ error: 'Invalid entity type' });
        }

        // Find the pending entity for this user
        let pendingEntity;
        
        if (entityType === 'shop') {
            pendingEntity = await EntityModel.findOne({ 
                owner: userId, 
                approvalStatus: 'pending' 
            });
        } else if (entityType === 'institute') {
            pendingEntity = await EntityModel.findOne({ 
                owner: userId, 
                approvalStatus: 'pending' 
            });
        } else {
            // For other entity types, try to find by userId or owner field
            pendingEntity = await EntityModel.findOne({ 
                $or: [
                    { userId: userId, approvalStatus: 'pending' },
                    { owner: userId, approvalStatus: 'pending' }
                ]
            });
        }

        if (!pendingEntity) {
            console.log(`No pending ${entityType} found for user ${userId}`);
            return res.status(404).json({ error: `No pending ${entityType} found for this user` });
        }

        // Update entity approval status to approved
        pendingEntity.approvalStatus = 'approved';
        pendingEntity.approvedAt = new Date();
        pendingEntity.approvedBy = req.user._id;
        pendingEntity.paymentVerified = true;
        pendingEntity.paymentRequestId = paymentRequestId;
        
        await pendingEntity.save();

        console.log(`${entityType} ${pendingEntity._id} approved successfully for user ${userId}`);

        res.json({ 
            success: true, 
            message: `${entityType} approved successfully`,
            entityId: pendingEntity._id
        });

    } catch (error) {
        console.error('Error approving entity:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.use('/api/shop', shopRoutes);
app.use('/api/shop-wizard', shopWizardRoutes);
app.use('/api/institute', instituteRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});