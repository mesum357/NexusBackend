const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
require('dotenv').config();
console.log('🚀 Server starting with environment:', process.env.NODE_ENV || 'development');
console.log('🌐 FRONTEND_URL:', process.env.FRONTEND_URL || 'not set');
console.log('🔗 Loaded MONGODB_URI:', process.env.MONGODB_URI ? 'set' : 'not set');
console.log('📍 PORT:', PORT);
console.log('🚂 Railway Environment:', process.env.RAILWAY_ENVIRONMENT || 'not set');
console.log('🚂 Railway Static URL:', process.env.RAILWAY_STATIC_URL || 'not set');
console.log('🚂 Railway Service Name:', process.env.RAILWAY_SERVICE_NAME || 'not set');

// Debug environment variables on startup
console.log('');
console.log('🔍 Environment Variables Debug:');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('PORT:', process.env.PORT || 'not set');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET (mongodb+srv://...)' : 'NOT SET');
console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? 'SET' : 'NOT SET');
// Email disabled: skip printing EMAIL_* secrets
console.log('FRONTEND_URL:', process.env.FRONTEND_URL || 'not set');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'SET' : 'NOT SET');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'SET' : 'NOT SET');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET');
console.log('');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');
const server = http.createServer(app);
const io = socketIo(server);

const jwtSocket = require('jsonwebtoken');
const UserModel = require('./models/User');
const { getJwtSecret } = require('./middleware/auth');
const { setIO } = require('./services/socket');

io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token ||
      (typeof socket.handshake.headers?.authorization === 'string'
        ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
        : '');
    if (!token) return next(new Error('Unauthorized'));
    const payload = jwtSocket.verify(token, getJwtSecret());
    if (!payload.sub) return next(new Error('Unauthorized'));
    const user = await UserModel.findById(payload.sub);
    if (!user || user.isFrozen) return next(new Error('Unauthorized'));
    socket.userId = user._id.toString();
    next();
  } catch (e) {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.userId}`);
});

setIO(io);

const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const findOrCreate = require('mongoose-findorcreate');
const passportLocalMongoose = require('passport-local-mongoose');
const mongoose = require('mongoose');
const crypto = require('crypto');
const mailUtil = require('./utils/mail');
const cors = require('cors');
const shopRoutes = require('./routes/shop');
const shopWizardRoutes = require('./routes/shop-wizard');
const instituteRoutes = require('./routes/institute');
const instituteWizardRoutes = require('./routes/institute-wizard');
const hospitalRoutes = require('./routes/hospital');
const hospitalWizardRoutes = require('./routes/hospital-wizard');
const productWizardRoutes = require('./routes/product-wizard');
const feedRoutes = require('./routes/feed');
const mobileRoutes = require('./routes/mobile');
const friendsRoutes = require('./routes/friends');
const followRoutes = require('./routes/follow');
const marketplaceRoutes = require('./routes/marketplace');
const categoryRoutes = require('./routes/categories');
const paymentRoutes = require('./routes/payment');
const adminRoutes = require('./routes/admin');
const orderRoutes = require('./routes/order');
const notificationRoutes = require('./routes/notifications');
const fs = require('fs');
const { upload } = require('./middleware/cloudinary');

// mongodb+srv://mesum357:pDliM118811@cluster0.h3knh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local').Strategy;

// Transactional email: Resend (RESEND_API_KEY) or Nodemailer (Gmail/SMTP)
const transporter = {
  sendMail: async (opts) => {
    await mailUtil.sendTransactionalMail({
      from: opts.from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    return { messageId: 'sent', accepted: [opts.to], rejected: [] };
  },
};

function publicApiBase(req) {
  return (process.env.PUBLIC_API_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'massux357@gmail.com';

app.use(express.json());

// Trust Railway/Proxy so secure cookies work behind HTTPS proxies
app.set('trust proxy', 1);

// Add request timeout middleware
app.use((req, res, next) => {
    const timeout = 60000; // 60 seconds timeout
    const timer = setTimeout(() => {
        if (!res.headersSent) {
            console.error('⏰ Request timeout for:', req.method, req.url);
            res.status(408).json({ 
                error: 'Request timeout',
                message: 'The request took too long to process'
            });
        }
    }, timeout);
    
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));
    
    next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3001', // Admin panel
      'http://localhost:5173', // Frontend dev
      'http://localhost:8080', // Frontend dev
      'http://localhost:8083', // Frontend dev
      'http://localhost:8082', // Frontend dev
      'https://pakistanonlines.com',
      'http://pakistanonlines.com',
      'https://www.pakistanonlines.com', // Production frontend with www
      'http://www.pakistanonlines.com', // Production frontend with www (HTTP)
      'https://nexus-frontend-4sr8.onrender.com', // Nexus Frontend on Render
      'https://nexus-frontend-3dcx.onrender.com', // Nexus Frontend on Render (current)
      'https://nexus-frontend-production-5300.up.railway.app', // Nexus Frontend on Railway
      'https://nexusadminpanel-production.up.railway.app', // Admin Panel on Railway
      'https://edunia.org', // Edunia website
      'https://www.edunia.org', // Edunia website with www
      'https://edunia-pilot-panel-xnch.onrender.com' // Control Panel on Render
    ];
    
    // Add environment-specific origins
    if (process.env.FRONTEND_URL) {
      allowedOrigins.push(process.env.FRONTEND_URL);
    }
    
    // Add Control Panel URL from environment
    if (process.env.CONTROL_PANEL_URL) {
      allowedOrigins.push(process.env.CONTROL_PANEL_URL);
    }
    
    // Check if origin is allowed - be more permissive for Render/Railway deployments
    const isAllowed = allowedOrigins.includes(origin) || 
        origin.endsWith('.railway.app') || 
        origin.endsWith('.up.railway.app') ||
        origin.endsWith('.onrender.com') || // Allow all Render URLs
        origin.includes('.onrender.com'); // Additional check for any Render URL
    
    if (isAllowed) {
      console.log('✅ CORS allowed for origin:', origin);
      return callback(null, true);
    }
    
    console.log('🚫 CORS blocked origin:', origin);
    console.log('⚠️ Allowed origins:', allowedOrigins);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Origin', 
    'Accept',
    'Cache-Control',
    'Pragma',
    'Expires',
    'If-Modified-Since',
    'If-None-Match',
    'Cookie',
    'Set-Cookie'
  ],
  exposedHeaders: ['Content-Length', 'X-Requested-With', 'Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Handle preflight requests with the same CORS configuration
app.options('*', cors(corsOptions));

// Add CORS headers to all responses
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log('🌐 Request origin:', origin);
  
  // Allow specific origins
  const allowedOrigins = [
    'http://localhost:3001',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:8083',
    'http://localhost:8082',
    'https://pakistanonlines.com',
    'http://pakistanonlines.com',
    'https://nexus-frontend-3dcx.onrender.com', // Nexus Frontend on Render (current)
    'https://nexus-frontend-4sr8.onrender.com', // Nexus Frontend on Render
    'https://edunia.org', // Edunia website
    'https://www.edunia.org', // Edunia website with www
    'https://edunia-pilot-panel-xnch.onrender.com' // Control Panel on Render
  ];
  
  // Add environment-specific origins
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }
  
  // Add Control Panel URL from environment
  if (process.env.CONTROL_PANEL_URL) {
    allowedOrigins.push(process.env.CONTROL_PANEL_URL);
  }
  
  // For Railway deployment, be more permissive with localhost origins
  const isRailway = process.env.RAILWAY_STATIC_URL || process.env.RAILWAY_ENVIRONMENT;
  const isLocalhost = origin && origin.startsWith('http://localhost:');
  
  // Check if origin is allowed - be more permissive for Render/Railway
  const isAllowed = origin && (
    allowedOrigins.includes(origin) || 
    origin.endsWith('.railway.app') || 
    origin.endsWith('.up.railway.app') ||
    origin.endsWith('.onrender.com') || // Allow all Render URLs
    origin.includes('.onrender.com') || // Additional check for any Render URL
    (isRailway && isLocalhost)
  );
  
  if (isAllowed) {
    res.header('Access-Control-Allow-Origin', origin);
    console.log('✅ CORS allowed for origin:', origin);
  } else {
    console.log('🚫 CORS blocked for origin:', origin);
    // For Railway, allow localhost origins even if not in allowed list
    if (isRailway && isLocalhost) {
      res.header('Access-Control-Allow-Origin', origin);
      console.log('✅ CORS allowed for localhost on Railway:', origin);
    } else if (origin && origin.includes('.onrender.com')) {
      // Fallback: always allow Render URLs
      res.header('Access-Control-Allow-Origin', origin);
      console.log('✅ CORS allowed for Render URL:', origin);
    }
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

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
    domain: isProduction ? undefined : undefined, // Let browser handle domain for cross-origin
  },
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb+srv://ahmed357:pDliM118811@cluster0.vtangzf.mongodb.net/',
    collectionName: 'sessions',
    ttl: 60 * 60 * 24 * 7, // 7 days
  }),
}));

app.use(passport.initialize());
app.use(passport.session());

// MONGOOSE
// MongoDB connection options
const mongooseOptions = {
    serverSelectionTimeoutMS: 10000, // 10 seconds
    socketTimeoutMS: 30000, // 30 seconds
    connectTimeoutMS: 10000, // 10 seconds
    maxPoolSize: 10,
    minPoolSize: 1,
    maxIdleTimeMS: 30000,
    heartbeatFrequencyMS: 10000, // Keep connection alive
    retryWrites: true
};

if (process.env.NODE_ENV === 'production') {
    mongooseOptions.ssl = true;
    mongooseOptions.tls = true;
    mongooseOptions.tlsAllowInvalidCertificates = true;
    mongooseOptions.tlsAllowInvalidHostnames = true;
}

// Get MongoDB URI from environment or use default
const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://ahmed357:pDliM118811@cluster0.vtangzf.mongodb.net/';
if (!mongoURI) {
    console.error("MONGODB_URI is not defined in environment variables");
    process.exit(1);
}

console.log('🔍 MongoDB URI check:');
console.log('URI starts with mongodb:', mongoURI.startsWith('mongodb'));
console.log('URI length:', mongoURI.length);
console.log('URI format:', mongoURI.substring(0, 20) + '...' + mongoURI.substring(mongoURI.length - 20));

console.log('🔌 Connecting to MongoDB with options:', mongooseOptions);

mongoose.connect(mongoURI, mongooseOptions)
    .then(() => {
        console.log("✅ Connected to MongoDB successfully");
        console.log("📊 MongoDB connection state:", mongoose.connection.readyState);
        console.log("🏗️ Database name:", mongoose.connection.name);
    })
    .catch((err) => {
        console.error("❌ Error connecting to MongoDB Atlas:");
        console.error("Error details:", {
            name: err.name,
            message: err.message,
            code: err.code,
            codeName: err.codeName
        });
        console.error("Full error:", err);
        
        // Do not exit; keep server running and let routes guard against missing DB
        console.warn("⚠️ Continuing without database connection; API will return 503 until DB connects");
    });

// Configure Mongoose settings
mongoose.set('bufferCommands', true); // Enable buffering to avoid early query errors during startup

// Add connection event listeners
mongoose.connection.on('connected', () => {
    console.log('🔗 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('💔 Mongoose disconnected from MongoDB');
});

mongoose.connection.on('reconnected', () => {
    console.log('🔄 Mongoose reconnected to MongoDB');
});

mongoose.connection.on('timeout', () => {
    console.log('⏰ Mongoose connection timeout');
});

const User = require('./models/User');
const Institute = require('./models/Institute');
const Shop = require('./models/Shop');
const Product = require('./models/Product');
const PaymentRequest = require('./models/PaymentRequest');
const PaymentSettings = require('./models/PaymentSettings');

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
        console.log('🔍 User object keys:', Object.keys(user.toObject()));
        console.log('🔍 User has authenticate method:', typeof user.authenticate);
        
        // Try the authenticate method
        try {
            const isPasswordValid = await user.authenticate(password);
            console.log('🔍 Password validation result:', isPasswordValid);
            
            if (!isPasswordValid) {
                console.log('❌ Password verification failed for user:', user.username);
                return done(null, false, { message: 'Invalid username or password' });
            }
            
            console.log('✅ Password verified successfully for user:', user.username);
            return done(null, user);
        } catch (authError) {
            console.error('❌ Authentication method error:', authError);
            return done(null, false, { message: 'Invalid username or password' });
        }
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
    const startTime = Date.now();
    console.log('🔥 REGISTRATION REQUEST RECEIVED AT:', new Date().toISOString());
    console.log('📝 Request headers:', JSON.stringify(req.headers, null, 2));
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
    console.log('📁 Request file:', req.file ? {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
    } : 'No file uploaded');
    
    const { password, confirmPassword, email, fullName, mobile } = req.body;
    console.log('🧩 Extracted fields:', { 
        password: password ? `[${password.length} chars]` : 'missing', 
        confirmPassword: confirmPassword ? `[${confirmPassword.length} chars]` : 'missing', 
        email, 
        fullName, 
        mobile 
    });
    
    console.log('⏱️ Step 1: Validation started at', Date.now() - startTime, 'ms');
    
    // Validation
    if (!password || !confirmPassword || !email || !fullName || !mobile) {
        console.log('❌ Validation failed: Missing required fields');
        return res.status(400).json({ error: 'All fields are required' });
    }
    if (password !== confirmPassword) {
        console.log('❌ Validation failed: Passwords do not match');
        return res.status(400).json({ error: 'Passwords do not match' });
    }
    if (password.length < 6) {
        console.log('❌ Validation failed: Password too short');
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    console.log('✅ Validation passed at', Date.now() - startTime, 'ms');

    const emailConfigured = mailUtil.isTransactionalEmailConfigured();
    const verificationToken = emailConfigured ? crypto.randomBytes(32).toString('hex') : undefined;

    // Prepare user data
    console.log('⏱️ Step 3: Preparing user data...');
    const userData = {
        username: email, // Keep username as email for compatibility
        email: email,
        fullName: fullName,
        mobile: mobile,
        verified: !emailConfigured,
        verificationToken: emailConfigured ? verificationToken : undefined,
    };
    
    // Add profile image if uploaded
    if (req.file) {
        console.log('📸 Profile image detected, processing completed at', Date.now() - startTime, 'ms');
        console.log('📸 Cloudinary details:', {
            originalName: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            cloudinaryUrl: req.file.path,
            uploadDuration: 'processed by middleware'
        });
        userData.profileImage = req.file.path; // Cloudinary URL
    } else {
        console.log('📸 No profile image uploaded');
    }
    
    console.log('✅ User data prepared at', Date.now() - startTime, 'ms:', {
        username: userData.username,
        email: userData.email,
        fullName: userData.fullName,
        mobile: userData.mobile,
        verified: userData.verified,
        hasProfileImage: !!userData.profileImage,
        tokenLength: 0
    });
    
    console.log('⏱️ Step 4: Starting User.register() at', Date.now() - startTime, 'ms');
    
    const userRegisterStartTime = Date.now();
    User.register(userData, password, async function(err, user) {
        const registerTime = Date.now() - startTime;
        const userRegisterDuration = Date.now() - userRegisterStartTime;
        
        if (err) {
            console.error('❌ User.register() failed at', registerTime, 'ms');
            console.error('📝 Registration error details:', {
                name: err.name,
                message: err.message,
                code: err.code,
                stack: err.stack?.split('\n').slice(0, 5).join('\n')
            });
            
            let errorMessage = 'Registration failed';
            if (err.name === 'UserExistsError') {
                errorMessage = 'User already exists with this email';
                console.log('🔍 User already exists error for email:', email);
            }
            return res.status(400).json({ error: errorMessage });
        }
        
        console.log('✅ User.register() completed successfully at', registerTime, 'ms');
        console.log('📊 User.register() duration:', userRegisterDuration, 'ms');
        console.log('👤 Created user details:', {
            id: user._id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            verified: user.verified,
            hasVerificationToken: !!user.verificationToken
        });
        
        const totalTime = Date.now() - startTime;

        if (emailConfigured && user && !user.verified && verificationToken) {
            const verifyUrl = `${publicApiBase(req)}/verify-email?token=${verificationToken}`;
            try {
                await transporter.sendMail({
                    from: mailUtil.getDefaultFrom(),
                    to: user.email,
                    subject: 'Verify your email for E-Dunia',
                    html: mailUtil.verificationEmailHtml(user.fullName, verifyUrl),
                });
                console.log('✅ Verification email sent at', totalTime, 'ms');
            } catch (emailErr) {
                console.error('❌ Verification email failed:', emailErr?.message || emailErr);
            }
        }

        console.log('🎉 Registration completed at', totalTime, 'ms');
        return res.status(201).json({
            success: true,
            message: emailConfigured
                ? 'Registration successful! Please check your email to verify your account.'
                : 'Registration successful!',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                verified: !!user.verified,
            },
        });
    });
});



/** Public web app URL (verification redirect, magic links). Required in production on Render. */
function frontendPublicUrl() {
  const raw = process.env.FRONTEND_URL || process.env.CLIENT_URL || '';
  const u = String(raw).trim().replace(/\/$/, '');
  if (u) return u;
  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:5173';
  }
  return '';
}

app.get('/verify-email', async (req, res) => {
    const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';
    const base = frontendPublicUrl();
    if (process.env.NODE_ENV === 'production' && !base) {
        console.error('verify-email: FRONTEND_URL (or CLIENT_URL) is not set — cannot redirect to your site.');
        return res
            .status(500)
            .type('html')
            .send(
                '<h1>Server configuration</h1><p>Add environment variable <code>FRONTEND_URL</code> on Render (e.g. <code>https://www.edunia.org</code>), then redeploy.</p>',
            );
    }
    const redirectBase = base || 'http://localhost:5173';
    if (!token) {
        return res.redirect(`${redirectBase}/login?error=${encodeURIComponent('Invalid verification link.')}`);
    }
    try {
        const u = await User.findOne({ verificationToken: token });
        if (!u) {
            return res.redirect(
                `${redirectBase}/login?error=${encodeURIComponent('This verification link is invalid or has already been used.')}`,
            );
        }
        u.verified = true;
        u.verificationToken = undefined;
        await u.save();
        return res.redirect(
            `${redirectBase}/login?success=${encodeURIComponent('Your email is verified. You can sign in now.')}`,
        );
    } catch (e) {
        console.error('verify-email error:', e);
        return res.redirect(
            `${redirectBase}/login?error=${encodeURIComponent('Verification failed. Please try again or request a new email.')}`,
        );
    }
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
        // Check if user is frozen
        if (user.isFrozen) {
            return res.status(403).json({ error: 'This account is frozen. Please contact support.' });
        }
        if (!user.verified) {
            return res.status(403).json({
                error: 'Please verify your email before signing in.',
                needsVerification: true,
            });
        }
        req.logIn(user, function(err) {
            if (err) {
                return res.status(500).json({ error: 'Internal server error' });
            }
            return res.status(200).json({ success: true, message: 'Login successful', user: { id: user._id, email: user.email, username: user.username } });
        });
    })(req, res, next);
});

app.post('/resend-verification', async (req, res) => {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Email is required' });
    }
    const trimmed = email.trim();
    try {
        const user = await User.findOne({ email: trimmed });
        if (!user) {
            return res.status(404).json({ error: 'No account found for this email.' });
        }
        if (user.verified) {
            return res.status(400).json({ error: 'This email is already verified.' });
        }
        if (!mailUtil.isTransactionalEmailConfigured()) {
            user.verified = true;
            user.verificationToken = undefined;
            await user.save();
            return res.status(200).json({
                success: true,
                message: 'Email delivery is not configured; your account has been verified.',
                verified: true,
            });
        }
        const verificationToken = crypto.randomBytes(32).toString('hex');
        user.verificationToken = verificationToken;
        await user.save();
        const verifyUrl = `${publicApiBase(req)}/verify-email?token=${verificationToken}`;
        await transporter.sendMail({
            from: mailUtil.getDefaultFrom(),
            to: user.email,
            subject: 'Verify your email for E-Dunia',
            html: mailUtil.verificationEmailHtml(user.fullName, verifyUrl),
        });
        return res.status(200).json({
            success: true,
            message: 'Verification email sent. Please check your inbox.',
        });
    } catch (error) {
        console.error('resend-verification:', error);
        return res.status(500).json({ error: 'Failed to send verification email. Please try again later.' });
    }
});

// Fast registration endpoint (without file upload for testing)
app.post("/register-fast", async function(req, res) {
    const startTime = Date.now();
    console.log('🚀 FAST REGISTRATION REQUEST RECEIVED AT:', new Date().toISOString());
    
    const { password, confirmPassword, email, fullName, mobile } = req.body;
    console.log('📝 Fast registration fields:', { email, fullName, mobile, passwordLength: password?.length });
    
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
    
    const emailConfigured = mailUtil.isTransactionalEmailConfigured();
    const verificationToken = emailConfigured ? crypto.randomBytes(32).toString('hex') : undefined;

    const userData = {
        username: email,
        email: email,
        fullName: fullName,
        mobile: mobile,
        verified: !emailConfigured,
        verificationToken: emailConfigured ? verificationToken : undefined,
    };
    
    console.log('⏱️ Starting fast User.register() at', Date.now() - startTime, 'ms');
    
    User.register(userData, password, async function(err, user) {
        if (err) {
            console.error('❌ Fast registration failed:', err);
            let errorMessage = 'Registration failed';
            if (err.name === 'UserExistsError') {
                errorMessage = 'User already exists with this email';
            }
            return res.status(400).json({ error: errorMessage });
        }
        
        console.log('✅ Fast User.register() completed successfully');
        console.log('👤 Created user details:', {
            id: user._id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            verified: user.verified,
            hasVerificationToken: !!user.verificationToken
        });
        
        try {
            if (emailConfigured && verificationToken) {
                const verifyUrl = `${publicApiBase(req)}/verify-email?token=${verificationToken}`;
                const emailPromise = transporter.sendMail({
                    from: mailUtil.getDefaultFrom(),
                    to: user.email,
                    subject: 'Verify your email for E-Dunia',
                    html: mailUtil.verificationEmailHtml(user.fullName, verifyUrl),
                });
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Email timeout after 30 seconds')), 30000);
                });
                await Promise.race([emailPromise, timeoutPromise]);
            }

            const totalTime = Date.now() - startTime;
            const responseMessage = emailConfigured
                ? 'Registration successful! Please check your email to verify your account.'
                : 'Registration successful! Your account has been auto-verified (email configuration missing).';

            return res.status(201).json({
                success: true,
                message: responseMessage,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    fullName: user.fullName,
                    verified: user.verified,
                },
                debug:
                    process.env.NODE_ENV === 'development'
                        ? {
                              processingTime: totalTime,
                              emailSent: emailConfigured,
                              autoVerified: !emailConfigured,
                          }
                        : undefined,
            });
        } catch (emailError) {
            const errorTime = Date.now() - startTime;
            console.error('❌ Email sending error at', errorTime, 'ms');
            console.error('📧 Email error details:', {
                name: emailError.name,
                message: emailError.message,
                code: emailError.code,
                command: emailError.command,
                response: emailError.response,
                responseCode: emailError.responseCode
            });
            
            // Still return success since user was created, just email failed
            return res.status(201).json({ 
                success: true, 
                message: 'Registration successful! Email verification temporarily unavailable.',
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    fullName: user.fullName,
                    verified: user.verified
                },
                debug: process.env.NODE_ENV === 'development' ? {
                    processingTime: errorTime,
                    emailError: emailError.message
                } : undefined
            });
        }
    });
});

// Email configuration debug endpoint
app.get('/debug-email', (req, res) => {
    console.log('🔍 EMAIL DEBUG REQUEST');
    
    // Check all environment variables
    const allEnvVars = Object.keys(process.env);
    const emailRelatedVars = allEnvVars.filter(key => 
        key.toLowerCase().includes('email') || 
        key.toLowerCase().includes('mail') ||
        key.toLowerCase().includes('smtp')
    );
    
    const debugInfo = {
        timestamp: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV,
        emailUser: {
            exists: !!process.env.EMAIL_USER,
            value: process.env.EMAIL_USER ? `${process.env.EMAIL_USER.substring(0, 5)}***` : null,
            length: process.env.EMAIL_USER ? process.env.EMAIL_USER.length : 0
        },
        emailPass: {
            exists: !!process.env.EMAIL_PASS,
            value: process.env.EMAIL_PASS ? `[${process.env.EMAIL_PASS.length} chars]` : null,
            length: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0
        },
        emailRelatedVars,
        totalEnvVars: allEnvVars.length,
        firstTenVars: allEnvVars.slice(0, 10),
        transporterReady: !!transporter
    };
    
    console.log('📧 Email debug info:', debugInfo);
    
    res.json(debugInfo);
});

// Health check endpoint
app.get('/health', async (req, res) => {
    const startTime = Date.now();
    console.log('🩺 Health check requested at', new Date().toISOString());
    
    try {
        // Check database connection
        const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
        
        // Check email configuration
        const emailConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
        
        const healthData = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: dbStatus,
            emailConfigured,
            environment: process.env.NODE_ENV || 'development',
            responseTime: Date.now() - startTime
        };
        
        console.log('✅ Health check completed:', healthData);
        res.status(200).json(healthData);
        
    } catch (error) {
        console.error('❌ Health check failed:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString(),
            responseTime: Date.now() - startTime
        });
    }
});

// Simple email test endpoint
// Email tests disabled
app.post('/test-email-simple', async (req, res) => {
    return res.status(200).json({ message: 'Email is disabled.' });
});
/*
app.post('/test-email-simple', async (req, res) => {
    const { email } = req.body;
    console.log('🧪 SIMPLE EMAIL TEST for:', email);
    
    if (!email) {
        return res.status(400).json({ error: 'Email address required' });
    }
    
    try {
        // Check configuration first
        console.log('📧 Checking email config...');
        console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'SET' : 'NOT SET');
        console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET' : 'NOT SET');
        
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            return res.status(500).json({ 
                error: 'Email configuration missing',
                details: {
                    EMAIL_USER: !!process.env.EMAIL_USER,
                    EMAIL_PASS: !!process.env.EMAIL_PASS
                }
            });
        }
        
        // Create a simple transporter for testing
        const testTransporter = require('nodemailer').createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        
        // Test connection
        console.log('🔌 Testing transporter connection...');
        await testTransporter.verify();
        console.log('✅ Transporter verified successfully');
        
        // Send test email
        console.log('📤 Sending test email...');
        const result = await testTransporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Test Email - Pakistan Online',
            text: 'This is a test email from Pakistan Online. Email configuration is working!'
        });
        
        console.log('✅ Test email sent:', result.messageId);
        
        res.json({
            success: true,
            message: 'Test email sent successfully',
            messageId: result.messageId,
            to: email
        });
        
    } catch (error) {
        console.error('❌ Email test failed:', error);
        res.status(500).json({
            error: 'Email test failed',
            details: error.message,
            code: error.code
        });
    }
});
*/

// Test email endpoint for debugging
app.post('/test-email', async (req, res) => {
    return res.status(200).json({ message: 'Email is disabled.' });
});
/*
app.post('/test-email', async (req, res) => {
    const startTime = Date.now();
    console.log('🧪 EMAIL TEST REQUEST RECEIVED AT:', new Date().toISOString());
    
    const { email, subject, message } = req.body;
    console.log('📧 Test email requested for:', email);
    console.log('📧 Subject:', subject);
    console.log('📧 Message length:', message?.length || 0);
    
    if (!email) {
        console.log('❌ Test email failed: Email is required');
        return res.status(400).json({ error: 'Email is required' });
    }
    
    try {
        console.log('📧 Checking email configuration...');
        console.log('EMAIL_USER exists:', !!process.env.EMAIL_USER);
        console.log('EMAIL_PASS exists:', !!process.env.EMAIL_PASS);
        console.log('EMAIL_USER value:', process.env.EMAIL_USER ? `${process.env.EMAIL_USER.substring(0, 5)}***` : 'not set');
        
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log('❌ Email configuration missing');
            return res.status(500).json({ 
                error: 'Email configuration not found',
                debug: {
                    EMAIL_USER: !!process.env.EMAIL_USER,
                    EMAIL_PASS: !!process.env.EMAIL_PASS
                }
            });
        }
        
        console.log('✅ Email configuration found, preparing test email...');
        
        const emailData = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: subject || 'Test Email from Pakistan Online',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563eb;">Test Email - Pakistan Online</h2>
                    <p>This is a test email sent at ${new Date().toISOString()}</p>
                    <p>${message || 'This is a test message to verify email functionality.'}</p>
                    <p>If you received this email, the email service is working correctly!</p>
                    <hr>
                    <p style="font-size: 12px; color: #666;">
                        Sent from Pakistan Online Backend<br>
                        Server time: ${new Date().toString()}
                    </p>
                </div>
            `
        };
        
        console.log('📤 Sending test email with data:', {
            from: emailData.from,
            to: emailData.to,
            subject: emailData.subject,
            htmlLength: emailData.html.length
        });
        
        const emailStartTime = Date.now();
        const result = await transporter.sendMail(emailData);
        const emailEndTime = Date.now();
        
        console.log('✅ Test email sent successfully at', Date.now() - startTime, 'ms');
        console.log('📧 Email send duration:', emailEndTime - emailStartTime, 'ms');
        console.log('📮 Email result:', {
            messageId: result.messageId,
            response: result.response,
            accepted: result.accepted,
            rejected: result.rejected
        });
        
        const totalTime = Date.now() - startTime;
        console.log('🎉 Test email process completed successfully at', totalTime, 'ms');
        
        return res.status(200).json({ 
            success: true, 
            message: 'Test email sent successfully!',
            result: {
                messageId: result.messageId,
                response: result.response,
                accepted: result.accepted,
                rejected: result.rejected,
                processingTime: totalTime,
                emailSendTime: emailEndTime - emailStartTime
            }
        });
        
    } catch (error) {
        const errorTime = Date.now() - startTime;
        console.error('❌ Test email error at', errorTime, 'ms');
        console.error('📧 Test email error details:', {
            name: error.name,
            message: error.message,
            code: error.code,
            command: error.command,
            response: error.response,
            responseCode: error.responseCode,
            stack: error.stack?.split('\n').slice(0, 10).join('\n')
        });
        
        return res.status(500).json({ 
            error: 'Failed to send test email',
            details: {
                errorMessage: error.message,
                errorCode: error.code,
                response: error.response,
                processingTime: errorTime
            }
        });
    }
});
*/

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
  console.log('🔍 /me endpoint called');
  console.log('🔍 Request headers:', req.headers);
  console.log('🔍 Session ID:', req.sessionID);
  console.log('🔍 Session data:', req.session);
  console.log('🔍 Is authenticated:', req.isAuthenticated());
  console.log('🔍 User:', req.user);
  
  if (req.isAuthenticated()) {
    console.log('✅ User authenticated, returning user data');
    res.json({ user: req.user });
  } else {
    console.log('❌ User not authenticated, returning 401');
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Add the /api/auth/me endpoint that the frontend expects
app.get('/api/auth/me', (req, res) => {
  console.log('🔍 /api/auth/me endpoint called');
  console.log('🔍 Request headers:', req.headers);
  console.log('🔍 Session ID:', req.sessionID);
  console.log('🔍 Session data:', req.session);
  console.log('🔍 Is authenticated:', req.isAuthenticated());
  console.log('🔍 User:', req.user);
  
  if (req.isAuthenticated()) {
    console.log('✅ User authenticated, returning user data');
    res.json({ user: req.user });
  } else {
    console.log('❌ User not authenticated, returning 401');
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
        
        // Check if user is frozen
        if (user.isFrozen) {
            console.log('❌ User account is frozen:', user.username);
            return res.status(403).json({ error: 'This account is frozen. Please contact support.' });
        }
        
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
        const settings = await PaymentSettings.getSettings();
        res.json({ settings });
    } catch (error) {
        console.error('Error fetching payment settings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/admin/payment-settings', upload.single('qrCodeImage'), async function(req, res) {
    try {
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

        // Get existing settings or create new
        let settings = await PaymentSettings.findOne();
        
        if (settings) {
            // Update existing settings
            settings.bankName = bankName;
            settings.accountTitle = accountTitle;
            settings.accountNumber = accountNumber;
            settings.iban = iban;
            settings.branchCode = branchCode || '';
            settings.swiftCode = swiftCode || '';
            if (qrCodeImageUrl) {
                settings.qrCodeImage = qrCodeImageUrl;
            }
            settings.paymentAmounts = parsedPaymentAmounts;
            await settings.save();
        } else {
            // Create new settings
            settings = await PaymentSettings.create({
                bankName,
                accountTitle,
                accountNumber,
                iban,
                branchCode: branchCode || '',
                swiftCode: swiftCode || '',
                qrCodeImage: qrCodeImageUrl,
                paymentAmounts: parsedPaymentAmounts
            });
        }

        res.json({ 
            success: true, 
            message: 'Payment settings updated successfully',
            settings: settings.toObject()
        });
    } catch (error) {
        console.error('Error updating payment settings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Public endpoint to get payment settings for frontend
app.get('/api/payment/settings', async function(req, res) {
    try {
        const settings = await PaymentSettings.getSettings();
        res.json({ settings: settings.toObject() });
    } catch (error) {
        console.error('Error fetching payment settings:', error);
        res.status(500).json({ error: 'Internal server error' });
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

// Image upload endpoint for wizard
app.post('/api/upload/image', (req, res, next) => {
  console.log('🖼️ Image upload request received');
  console.log('   - Content-Type:', req.headers['content-type']);
  console.log('   - Content-Length:', req.headers['content-length']);
  next();
}, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('❌ Multer upload error:', err);
      console.error('   - Error message:', err.message);
      console.error('   - Error code:', err.code);
      return res.status(500).json({ 
        error: 'File upload failed', 
        details: err.message 
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log('🖼️ Image upload handler executing');
    console.log('   - File:', req.file);
    console.log('   - File exists:', !!req.file);
    
    if (!req.file) {
      console.error('❌ No image file provided');
      console.error('   - Request body keys:', Object.keys(req.body || {}));
      console.error('   - Request files:', req.files);
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log('   - File path:', req.file?.path);
    console.log('   - File URL:', req.file?.url);
    console.log('   - File secure URL:', req.file?.secure_url);
    console.log('   - File fieldname:', req.file?.fieldname);
    console.log('   - File originalname:', req.file?.originalname);
    console.log('   - File mimetype:', req.file?.mimetype);
    console.log('   - File size:', req.file?.size);

    // Determine the final image URL
    let imageUrl = req.file.path; // Default to path
    
    if (req.file.secure_url) {
      imageUrl = req.file.secure_url; // Prefer secure HTTPS URL
      console.log('   - ✅ Using secure URL from Cloudinary');
    } else if (req.file.url) {
      imageUrl = req.file.url; // Fallback to regular URL
      console.log('   - ✅ Using regular URL from Cloudinary');
    } else if (req.file.path) {
      imageUrl = req.file.path; // Fallback to path
      console.log('   - ✅ Using file path');
    } else {
      console.error('❌ No valid URL found in file object');
      console.error('   - File object keys:', Object.keys(req.file || {}));
      return res.status(500).json({ error: 'Failed to get image URL from upload' });
    }
    
    console.log('   - Final imageUrl:', imageUrl);
    
    if (!imageUrl || !imageUrl.includes('res.cloudinary.com')) {
      console.error('❌ Invalid imageUrl:', imageUrl);
      return res.status(500).json({ error: 'Invalid image URL returned from upload' });
    }
    
    res.json({
      success: true,
      imageUrl: imageUrl, // Cloudinary URL
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    console.error('   - Error name:', error.name);
    console.error('   - Error message:', error.message);
    console.error('   - Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to upload image',
      details: error.message 
    });
  }
});

// Test CORS endpoint
app.get('/api/test-cors', (req, res) => {
  console.log('🔍 CORS test request from origin:', req.headers.origin);
  res.json({ 
    message: 'CORS test successful', 
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

// Forgot Password: Send reset link
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  const user = await User.findOne({ email });
  const genericMsg = 'If your email is registered, you will receive a reset link shortly.';
  if (!user) {
    return res.status(200).json({ message: genericMsg });
  }
  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = Date.now() + 1000 * 60 * 60; // 1 hour
  await user.save();
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:8080').replace(/\/$/, '');
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

  if (mailUtil.isTransactionalEmailConfigured()) {
    try {
      await transporter.sendMail({
        from: mailUtil.getDefaultFrom(),
        to: user.email,
        subject: 'Reset your E-Dunia password',
        html: mailUtil.passwordResetEmailHtml(user.fullName, resetUrl),
      });
    } catch (e) {
      console.error('forgot-password email failed:', e);
    }
    return res.status(200).json({ message: genericMsg });
  }

  console.log('Password reset URL (email not configured):', resetUrl);
  return res.status(200).json({ message: 'Password reset link generated.', resetUrl });
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
        const { userId, entityType, paymentRequestId } = req.body;
        
        console.log('🔍 Approve Entity Request:', {
            userId,
            entityType,
            paymentRequestId,
            adminUser: req.user?._id,
            adminRole: req.user?.role
        });
        
        if (!userId || !entityType || !paymentRequestId) {
            console.error('❌ Missing required fields:', { userId, entityType, paymentRequestId });
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if user is admin
        if (!req.user || req.user.role !== 'admin') {
            console.error('❌ Unauthorized access attempt:', { userId: req.user?._id, role: req.user?.role });
            return res.status(403).json({ error: 'Admin access required' });
        }

        console.log(`✅ Admin ${req.user._id} (${req.user.role}) approving ${entityType} for user ${userId} after payment verification`);

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
                EntityModel = require('./models/Hospital');
                entityCollection = 'hospitals';
                break;
            case 'marketplace':
                EntityModel = require('./models/Product');
                entityCollection = 'products';
                break;
            default:
                console.error('❌ Invalid entity type:', entityType);
                return res.status(400).json({ error: 'Invalid entity type' });
        }

        // First, try to find the entity by entityId from the payment request if available
        let pendingEntity = null;
        
        // Get the payment request to check if it has an entityId
        const PaymentRequest = require('./models/PaymentRequest');
        const paymentRequest = await PaymentRequest.findById(paymentRequestId);
        
        if (paymentRequest && paymentRequest.entityId) {
            console.log(`🔍 Payment request has entityId: ${paymentRequest.entityId}, searching directly...`);
            pendingEntity = await EntityModel.findById(paymentRequest.entityId);
            
            if (pendingEntity) {
                console.log(`✅ Found entity directly by ID: ${pendingEntity._id}`);
                // Verify it's the correct entity type and owner
                if (pendingEntity.approvalStatus !== 'pending') {
                    console.log(`⚠️ Entity ${pendingEntity._id} is not pending (status: ${pendingEntity.approvalStatus})`);
                    pendingEntity = null;
                } else if (pendingEntity.owner.toString() !== userId) {
                    console.log(`⚠️ Entity ${pendingEntity._id} owner mismatch: ${pendingEntity.owner} vs ${userId}`);
                    pendingEntity = null;
                }
            }
        }
        
        // If not found by entityId, fall back to searching by owner and status
        if (!pendingEntity) {
            console.log(`🔍 Searching for pending ${entityType} for user ${userId}...`);
        
        if (entityType === 'shop') {
            pendingEntity = await EntityModel.findOne({ 
                owner: userId, 
                approvalStatus: 'pending' 
            });
                console.log(`   - Shop search query: { owner: ${userId}, approvalStatus: 'pending' }`);
        } else if (entityType === 'institute') {
            pendingEntity = await EntityModel.findOne({ 
                owner: userId, 
                approvalStatus: 'pending' 
            });
                console.log(`   - Institute search query: { owner: ${userId}, approvalStatus: 'pending' }`);
            } else if (entityType === 'hospital') {
                pendingEntity = await EntityModel.findOne({ 
                    owner: userId, 
                    approvalStatus: 'pending' 
                });
                console.log(`   - Hospital search query: { owner: ${userId}, approvalStatus: 'pending' }`);
                console.log(`   - Hospital search result:`, pendingEntity ? {
                    id: pendingEntity._id,
                    name: pendingEntity.name,
                    approvalStatus: pendingEntity.approvalStatus,
                    owner: pendingEntity.owner
                } : 'Not found');
            } else if (entityType === 'marketplace') {
                pendingEntity = await EntityModel.findOne({ 
                    owner: userId, 
                    approvalStatus: 'pending' 
                });
                console.log(`   - Product search query: { owner: ${userId}, approvalStatus: 'pending' }`);
        } else {
            // For other entity types, try to find by userId or owner field
            pendingEntity = await EntityModel.findOne({ 
                $or: [
                    { userId: userId, approvalStatus: 'pending' },
                    { owner: userId, approvalStatus: 'pending' }
                ]
            });
                console.log(`   - Other entity search query: { $or: [{ userId: ${userId}, approvalStatus: 'pending' }, { owner: ${userId}, approvalStatus: 'pending' }] }`);
            }
        }
        
        console.log(`   - Search result: ${pendingEntity ? 'Found' : 'Not found'}`);
        if (pendingEntity) {
            console.log(`   - Entity ID: ${pendingEntity._id}`);
            console.log(`   - Current approvalStatus: ${pendingEntity.approvalStatus}`);
        }

        if (!pendingEntity) {
            console.log(`❌ No pending ${entityType} found for user ${userId}`);
            console.log(`   - This might happen if:`);
            console.log(`     1. The ${entityType} was already approved`);
            console.log(`     2. The ${entityType} was created with a different owner ID`);
            console.log(`     3. The ${entityType} creation failed`);
            
            // Let's also check if there are any entities for this user at all
            if (entityType === 'shop') {
                const allShops = await EntityModel.find({ owner: userId });
                console.log(`   - Total shops found for user: ${allShops.length}`);
                allShops.forEach(shop => {
                    console.log(`     - Shop: ${shop.shopName}, Status: ${shop.approvalStatus}, ID: ${shop._id}`);
                });
            } else if (entityType === 'institute') {
                const allInstitutes = await EntityModel.find({ owner: userId });
                console.log(`   - Total institutes found for user: ${allInstitutes.length}`);
                allInstitutes.forEach(institute => {
                    console.log(`     - Institute: ${institute.name}, Status: ${institute.approvalStatus}, ID: ${institute._id}`);
                });
            } else if (entityType === 'hospital') {
                const allHospitals = await EntityModel.find({ owner: userId });
                console.log(`   - Total hospitals found for user: ${allHospitals.length}`);
                allHospitals.forEach(hospital => {
                    console.log(`     - Hospital: ${hospital.name}, Status: ${hospital.approvalStatus}, ID: ${hospital._id}`);
                });
            } else if (entityType === 'marketplace') {
                const allProducts = await EntityModel.find({ owner: userId });
                console.log(`   - Total products found for user: ${allProducts.length}`);
                allProducts.forEach(product => {
                    console.log(`     - Product: ${product.title}, Status: ${product.approvalStatus}, ID: ${product._id}`);
                });
            }
            
            return res.status(404).json({ error: `No pending ${entityType} found for this user` });
        }

        // Update entity approval status to approved
        pendingEntity.approvalStatus = 'approved';
        pendingEntity.approvedAt = new Date();
        pendingEntity.approvedBy = req.user._id;
        pendingEntity.paymentVerified = true;
        pendingEntity.paymentRequestId = paymentRequestId;
        
        console.log(`🔄 Updating ${entityType} approval status...`);
        console.log(`   - Entity ID: ${pendingEntity._id}`);
        console.log(`   - Entity Name: ${pendingEntity.name || pendingEntity.shopName || 'N/A'}`);
        console.log(`   - Old approvalStatus: ${pendingEntity.approvalStatus}`);
        console.log(`   - New approvalStatus: approved`);
        console.log(`   - approvedAt: ${pendingEntity.approvedAt}`);
        console.log(`   - paymentVerified: ${pendingEntity.paymentVerified}`);
        
        await pendingEntity.save();

        console.log(`✅ ${entityType} ${pendingEntity._id} approved successfully for user ${userId}`);
        console.log(`✅ ${entityType} will now appear on the appropriate page automatically`);
        console.log(`   - Final approvalStatus: ${pendingEntity.approvalStatus}`);
        console.log(`   - Final approvedAt: ${pendingEntity.approvedAt}`);
        console.log(`   - Final paymentVerified: ${pendingEntity.paymentVerified}`);

        res.json({ 
            success: true, 
            message: `${entityType} approved successfully`,
            entityId: pendingEntity._id,
            approvalStatus: pendingEntity.approvalStatus,
            approvedAt: pendingEntity.approvedAt
        });

    } catch (error) {
        console.error('Error approving entity:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
  });

// Test endpoint to check shop approval status
app.get('/api/test/shop-approval/:shopId', async function(req, res) {
  try {
    const Shop = require('./models/Shop');
    const shop = await Shop.findById(req.params.shopId);
    
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    
    res.json({
      shopId: shop._id,
      shopName: shop.shopName,
      approvalStatus: shop.approvalStatus,
      approvedAt: shop.approvedAt,
      approvedBy: shop.approvedBy,
      paymentVerified: shop.paymentVerified,
      paymentRequestId: shop.paymentRequestId,
      createdAt: shop.createdAt,
      updatedAt: shop.updatedAt
    });
  } catch (error) {
    console.error('Error checking shop approval:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Public endpoint to create emoji categories (no authentication required)
app.post('/api/categories/create-emoji-categories', async function(req, res) {
  try {
    const Category = require('./models/Category');
    
    const emojiCategories = [
      // Food & Beverages
      { value: "Restaurants & Cafes", label: "Restaurants & Cafes", icon: "🍽️", section: "Food & Beverages", order: 1 },
      { value: "Fast Food", label: "Fast Food", icon: "🍔", section: "Food & Beverages", order: 2 },
      { value: "Bakery & Pastries", label: "Bakery & Pastries", icon: "🥐", section: "Food & Beverages", order: 3 },
      { value: "Coffee & Tea", label: "Coffee & Tea", icon: "☕", section: "Food & Beverages", order: 4 },
      { value: "Ice Cream & Desserts", label: "Ice Cream & Desserts", icon: "🍦", section: "Food & Beverages", order: 5 },
      { value: "Street Food", label: "Street Food", icon: "🌮", section: "Food & Beverages", order: 6 },
      { value: "Pizza", label: "Pizza", icon: "🍕", section: "Food & Beverages", order: 7 },
      { value: "Chinese Food", label: "Chinese Food", icon: "🥡", section: "Food & Beverages", order: 8 },

      // Fashion & Clothing
      { value: "Men's Clothing", label: "Men's Clothing", icon: "👔", section: "Fashion & Clothing", order: 1 },
      { value: "Women's Clothing", label: "Women's Clothing", icon: "👗", section: "Fashion & Clothing", order: 2 },
      { value: "Kids & Baby Clothing", label: "Kids & Baby Clothing", icon: "👶", section: "Fashion & Clothing", order: 3 },
      { value: "Shoes & Footwear", label: "Shoes & Footwear", icon: "👟", section: "Fashion & Clothing", order: 4 },
      { value: "Jewelry & Accessories", label: "Jewelry & Accessories", icon: "💎", section: "Fashion & Clothing", order: 5 },
      { value: "Bags & Handbags", label: "Bags & Handbags", icon: "👜", section: "Fashion & Clothing", order: 6 },
      { value: "Watches", label: "Watches", icon: "⌚", section: "Fashion & Clothing", order: 7 },
      { value: "Traditional Wear", label: "Traditional Wear", icon: "👘", section: "Fashion & Clothing", order: 8 },

      // Electronics & Technology
      { value: "Mobile Phones", label: "Mobile Phones", icon: "📱", section: "Electronics & Technology", order: 1 },
      { value: "Computers & Laptops", label: "Computers & Laptops", icon: "💻", section: "Electronics & Technology", order: 2 },
      { value: "Gaming & Consoles", label: "Gaming & Consoles", icon: "🎮", section: "Electronics & Technology", order: 3 },
      { value: "Audio & Speakers", label: "Audio & Speakers", icon: "🔊", section: "Electronics & Technology", order: 4 },
      { value: "Cameras & Photography", label: "Cameras & Photography", icon: "📷", section: "Electronics & Technology", order: 5 },
      { value: "TV & Home Entertainment", label: "TV & Home Entertainment", icon: "📺", section: "Electronics & Technology", order: 6 },
      { value: "Smart Home Devices", label: "Smart Home Devices", icon: "🏠", section: "Electronics & Technology", order: 7 },
      { value: "Computer Accessories", label: "Computer Accessories", icon: "🖱️", section: "Electronics & Technology", order: 8 },

      // Home & Garden
      { value: "Furniture", label: "Furniture", icon: "🪑", section: "Home & Garden", order: 1 },
      { value: "Home Decor", label: "Home Decor", icon: "🖼️", section: "Home & Garden", order: 2 },
      { value: "Kitchen & Dining", label: "Kitchen & Dining", icon: "🍴", section: "Home & Garden", order: 3 },
      { value: "Bedding & Bath", label: "Bedding & Bath", icon: "🛏️", section: "Home & Garden", order: 4 },
      { value: "Garden & Outdoor", label: "Garden & Outdoor", icon: "🌱", section: "Home & Garden", order: 5 },
      { value: "Lighting", label: "Lighting", icon: "💡", section: "Home & Garden", order: 6 },
      { value: "Storage & Organization", label: "Storage & Organization", icon: "📦", section: "Home & Garden", order: 7 },
      { value: "Tools & Hardware", label: "Tools & Hardware", icon: "🔧", section: "Home & Garden", order: 8 },

      // Beauty & Personal Care
      { value: "Skincare", label: "Skincare", icon: "🧴", section: "Beauty & Personal Care", order: 1 },
      { value: "Makeup & Cosmetics", label: "Makeup & Cosmetics", icon: "💄", section: "Beauty & Personal Care", order: 2 },
      { value: "Hair Care", label: "Hair Care", icon: "✂️", section: "Beauty & Personal Care", order: 3 },
      { value: "Fragrances", label: "Fragrances", icon: "🌸", section: "Beauty & Personal Care", order: 4 },
      { value: "Salon Services", label: "Salon Services", icon: "💇‍♀️", section: "Beauty & Personal Care", order: 5 },
      { value: "Spa & Wellness", label: "Spa & Wellness", icon: "💆‍♀️", section: "Beauty & Personal Care", order: 6 },
      { value: "Personal Hygiene", label: "Personal Hygiene", icon: "🧼", section: "Beauty & Personal Care", order: 7 },
      { value: "Nail Care", label: "Nail Care", icon: "💅", section: "Beauty & Personal Care", order: 8 },

      // Sports & Outdoors
      { value: "Sports Equipment", label: "Sports Equipment", icon: "⚽", section: "Sports & Outdoors", order: 1 },
      { value: "Fitness & Gym", label: "Fitness & Gym", icon: "🏋️", section: "Sports & Outdoors", order: 2 },
      { value: "Outdoor Recreation", label: "Outdoor Recreation", icon: "🏕️", section: "Sports & Outdoors", order: 3 },
      { value: "Cycling", label: "Cycling", icon: "🚴", section: "Sports & Outdoors", order: 4 },
      { value: "Swimming", label: "Swimming", icon: "🏊", section: "Sports & Outdoors", order: 5 },
      { value: "Cricket", label: "Cricket", icon: "🏏", section: "Sports & Outdoors", order: 6 },
      { value: "Football", label: "Football", icon: "⚽", section: "Sports & Outdoors", order: 7 },
      { value: "Water Sports", label: "Water Sports", icon: "🏄", section: "Sports & Outdoors", order: 8 },

      // Automotive
      { value: "Cars & Vehicles", label: "Cars & Vehicles", icon: "🚗", section: "Automotive", order: 1 },
      { value: "Motorcycles", label: "Motorcycles", icon: "🏍️", section: "Automotive", order: 2 },
      { value: "Auto Parts", label: "Auto Parts", icon: "⚙️", section: "Automotive", order: 3 },
      { value: "Auto Services", label: "Auto Services", icon: "🔧", section: "Automotive", order: 4 },
      { value: "Car Wash", label: "Car Wash", icon: "🚿", section: "Automotive", order: 5 },
      { value: "Fuel Stations", label: "Fuel Stations", icon: "⛽", section: "Automotive", order: 6 },
      { value: "Tires & Wheels", label: "Tires & Wheels", icon: "🛞", section: "Automotive", order: 7 },
      { value: "Auto Accessories", label: "Auto Accessories", icon: "🚙", section: "Automotive", order: 8 },

      // Health & Wellness
      { value: "Pharmacy", label: "Pharmacy", icon: "💊", section: "Health & Wellness", order: 1 },
      { value: "Medical Equipment", label: "Medical Equipment", icon: "🩺", section: "Health & Wellness", order: 2 },
      { value: "Health Supplements", label: "Health Supplements", icon: "💊", section: "Health & Wellness", order: 3 },
      { value: "Fitness & Nutrition", label: "Fitness & Nutrition", icon: "🍎", section: "Health & Wellness", order: 4 },
      { value: "Mental Health", label: "Mental Health", icon: "🧠", section: "Health & Wellness", order: 5 },
      { value: "Dental Care", label: "Dental Care", icon: "🦷", section: "Health & Wellness", order: 6 },
      { value: "Hospitals", label: "Hospitals", icon: "🏥", section: "Health & Wellness", order: 7 },
      { value: "Clinics", label: "Clinics", icon: "🩺", section: "Health & Wellness", order: 8 },

      // Education & Training
      { value: "Schools & Universities", label: "Schools & Universities", icon: "🏫", section: "Education & Training", order: 1 },
      { value: "Tutoring Services", label: "Tutoring Services", icon: "👨‍🏫", section: "Education & Training", order: 2 },
      { value: "Language Learning", label: "Language Learning", icon: "🗣️", section: "Education & Training", order: 3 },
      { value: "Online Courses", label: "Online Courses", icon: "💻", section: "Education & Training", order: 4 },
      { value: "Vocational Training", label: "Vocational Training", icon: "🔨", section: "Education & Training", order: 5 },
      { value: "Music Lessons", label: "Music Lessons", icon: "🎼", section: "Education & Training", order: 6 },
      { value: "Art Classes", label: "Art Classes", icon: "🎨", section: "Education & Training", order: 7 },
      { value: "Sports Training", label: "Sports Training", icon: "🏃", section: "Education & Training", order: 8 },

      // Professional Services
      { value: "Legal Services", label: "Legal Services", icon: "⚖️", section: "Professional Services", order: 1 },
      { value: "Accounting & Tax", label: "Accounting & Tax", icon: "🧮", section: "Professional Services", order: 2 },
      { value: "Consulting", label: "Consulting", icon: "💼", section: "Professional Services", order: 3 },
      { value: "Real Estate", label: "Real Estate", icon: "🏢", section: "Professional Services", order: 4 },
      { value: "Insurance", label: "Insurance", icon: "🛡️", section: "Professional Services", order: 5 },
      { value: "Banking & Finance", label: "Banking & Finance", icon: "🏦", section: "Professional Services", order: 6 },
      { value: "Marketing & Advertising", label: "Marketing & Advertising", icon: "📢", section: "Professional Services", order: 7 },
      { value: "IT & Software", label: "IT & Software", icon: "💻", section: "Professional Services", order: 8 },

      // Entertainment
      { value: "Cinemas & Theaters", label: "Cinemas & Theaters", icon: "🎭", section: "Entertainment", order: 1 },
      { value: "Gaming Centers", label: "Gaming Centers", icon: "🎮", section: "Entertainment", order: 2 },
      { value: "Amusement Parks", label: "Amusement Parks", icon: "🎢", section: "Entertainment", order: 3 },
      { value: "Event Planning", label: "Event Planning", icon: "🎉", section: "Entertainment", order: 4 },
      { value: "Photography Services", label: "Photography Services", icon: "📸", section: "Entertainment", order: 5 },
      { value: "DJ & Music", label: "DJ & Music", icon: "🎧", section: "Entertainment", order: 6 },
      { value: "Party Supplies", label: "Party Supplies", icon: "🎂", section: "Entertainment", order: 7 },
      { value: "Karaoke", label: "Karaoke", icon: "🎤", section: "Entertainment", order: 8 },

      // Travel & Tourism
      { value: "Hotels & Accommodation", label: "Hotels & Accommodation", icon: "🏨", section: "Travel & Tourism", order: 1 },
      { value: "Travel Agencies", label: "Travel Agencies", icon: "✈️", section: "Travel & Tourism", order: 2 },
      { value: "Tourist Attractions", label: "Tourist Attractions", icon: "🗺️", section: "Travel & Tourism", order: 3 },
      { value: "Transportation", label: "Transportation", icon: "🚌", section: "Travel & Tourism", order: 4 },
      { value: "Car Rental", label: "Car Rental", icon: "🚗", section: "Travel & Tourism", order: 5 },
      { value: "Tour Guides", label: "Tour Guides", icon: "👥", section: "Travel & Tourism", order: 6 },
      { value: "Adventure Tours", label: "Adventure Tours", icon: "🏔️", section: "Travel & Tourism", order: 7 },
      { value: "Cultural Tours", label: "Cultural Tours", icon: "🏛️", section: "Travel & Tourism", order: 8 },

      // Books & Media
      { value: "Books & Literature", label: "Books & Literature", icon: "📚", section: "Books & Media", order: 1 },
      { value: "Magazines & Newspapers", label: "Magazines & Newspapers", icon: "📰", section: "Books & Media", order: 2 },
      { value: "Music & Instruments", label: "Music & Instruments", icon: "🎵", section: "Books & Media", order: 3 },
      { value: "Movies & DVDs", label: "Movies & DVDs", icon: "🎬", section: "Books & Media", order: 4 },
      { value: "Educational Materials", label: "Educational Materials", icon: "🎓", section: "Books & Media", order: 5 },
      { value: "Art Supplies", label: "Art Supplies", icon: "🎨", section: "Books & Media", order: 6 },
      { value: "Stationery", label: "Stationery", icon: "✏️", section: "Books & Media", order: 7 },
      { value: "Gaming & Toys", label: "Gaming & Toys", icon: "🧩", section: "Books & Media", order: 8 },

      // Pet Services
      { value: "Pet Food & Supplies", label: "Pet Food & Supplies", icon: "🐾", section: "Pet Services", order: 1 },
      { value: "Pet Grooming", label: "Pet Grooming", icon: "✂️", section: "Pet Services", order: 2 },
      { value: "Veterinary Services", label: "Veterinary Services", icon: "🐕‍🦺", section: "Pet Services", order: 3 },
      { value: "Pet Training", label: "Pet Training", icon: "🎾", section: "Pet Services", order: 4 },
      { value: "Pet Boarding", label: "Pet Boarding", icon: "🏠", section: "Pet Services", order: 5 },
      { value: "Pet Accessories", label: "Pet Accessories", icon: "🦴", section: "Pet Services", order: 6 },
      { value: "Aquarium & Fish", label: "Aquarium & Fish", icon: "🐠", section: "Pet Services", order: 7 },
      { value: "Bird Supplies", label: "Bird Supplies", icon: "🐦", section: "Pet Services", order: 8 },

      // Religious & Cultural
      { value: "Religious Items", label: "Religious Items", icon: "🙏", section: "Religious & Cultural", order: 1 },
      { value: "Islamic Centers", label: "Islamic Centers", icon: "🕌", section: "Religious & Cultural", order: 2 },
      { value: "Cultural Events", label: "Cultural Events", icon: "🎭", section: "Religious & Cultural", order: 3 },
      { value: "Traditional Crafts", label: "Traditional Crafts", icon: "🏺", section: "Religious & Cultural", order: 4 },
      { value: "Religious Services", label: "Religious Services", icon: "🙏", section: "Religious & Cultural", order: 5 },
      { value: "Cultural Workshops", label: "Cultural Workshops", icon: "🎨", section: "Religious & Cultural", order: 6 },
      { value: "Festival Supplies", label: "Festival Supplies", icon: "🎊", section: "Religious & Cultural", order: 7 },
      { value: "Traditional Clothing", label: "Traditional Clothing", icon: "👘", section: "Religious & Cultural", order: 8 },

      // Miscellaneous
      { value: "Gift Shops", label: "Gift Shops", icon: "🎁", section: "Miscellaneous", order: 1 },
      { value: "Antiques & Collectibles", label: "Antiques & Collectibles", icon: "🕰️", section: "Miscellaneous", order: 2 },
      { value: "Thrift Stores", label: "Thrift Stores", icon: "🛒", section: "Miscellaneous", order: 3 },
      { value: "Repair Services", label: "Repair Services", icon: "🔧", section: "Miscellaneous", order: 4 },
      { value: "Cleaning Services", label: "Cleaning Services", icon: "🧹", section: "Miscellaneous", order: 5 },
      { value: "Security Services", label: "Security Services", icon: "🔒", section: "Miscellaneous", order: 6 },
      { value: "Printing & Copying", label: "Printing & Copying", icon: "🖨️", section: "Miscellaneous", order: 7 },
      { value: "Other", label: "Other", icon: "📝", section: "Miscellaneous", order: 8 }
    ];

    // Clear existing categories
    await Category.deleteMany({});
    
    // Insert emoji categories
    const insertedCategories = await Category.insertMany(emojiCategories);
    
    res.json({ 
      message: 'Emoji categories created successfully', 
      count: insertedCategories.length,
      sample: insertedCategories.slice(0, 5).map(cat => ({ 
        label: cat.label, 
        icon: cat.icon, 
        section: cat.section 
      }))
    });
  } catch (error) {
    console.error('Error creating emoji categories:', error);
    res.status(500).json({ error: 'Failed to create emoji categories' });
    }
  });

// Public endpoint to initialize categories (no authentication required)
app.post('/api/categories/initialize-public', async function(req, res) {
  try {
    const Category = require('./models/Category');
    
    const defaultCategories = [
      // Food & Beverages
      { value: "Restaurants & Cafes", label: "Restaurants & Cafes", icon: "🍽️", section: "Food & Beverages", order: 1 },
      { value: "Fast Food", label: "Fast Food", icon: "🍔", section: "Food & Beverages", order: 2 },
      { value: "Bakery & Pastries", label: "Bakery & Pastries", icon: "🥐", section: "Food & Beverages", order: 3 },
      { value: "Coffee & Tea", label: "Coffee & Tea", icon: "☕", section: "Food & Beverages", order: 4 },
      { value: "Ice Cream & Desserts", label: "Ice Cream & Desserts", icon: "🍦", section: "Food & Beverages", order: 5 },
      { value: "Street Food", label: "Street Food", icon: "🚚", section: "Food & Beverages", order: 6 },
      { value: "Catering Services", label: "Catering Services", icon: "🔔", section: "Food & Beverages", order: 7 },
      { value: "Food Delivery", label: "Food Delivery", icon: "🚚", section: "Food & Beverages", order: 8 },

      // Fashion & Clothing
      { value: "Men's Clothing", label: "Men's Clothing", icon: "👔", section: "Fashion & Clothing", order: 1 },
      { value: "Women's Clothing", label: "Women's Clothing", icon: "👗", section: "Fashion & Clothing", order: 2 },
      { value: "Kids & Baby Clothing", label: "Kids & Baby Clothing", icon: "👶", section: "Fashion & Clothing", order: 3 },
      { value: "Shoes & Footwear", label: "Shoes & Footwear", icon: "👟", section: "Fashion & Clothing", order: 4 },
      { value: "Jewelry & Accessories", label: "Jewelry & Accessories", icon: "💎", section: "Fashion & Clothing", order: 5 },
      { value: "Bags & Handbags", label: "Bags & Handbags", icon: "👜", section: "Fashion & Clothing", order: 6 },
      { value: "Watches", label: "Watches", icon: "⌚", section: "Fashion & Clothing", order: 7 },
      { value: "Traditional Wear", label: "Traditional Wear", icon: "👘", section: "Fashion & Clothing", order: 8 },

      // Electronics & Technology
      { value: "Mobile Phones", label: "Mobile Phones", icon: "📱", section: "Electronics & Technology", order: 1 },
      { value: "Computers & Laptops", label: "Computers & Laptops", icon: "💻", section: "Electronics & Technology", order: 2 },
      { value: "Gaming & Consoles", label: "Gaming & Consoles", icon: "🎮", section: "Electronics & Technology", order: 3 },
      { value: "Audio & Speakers", label: "Audio & Speakers", icon: "🔊", section: "Electronics & Technology", order: 4 },
      { value: "Cameras & Photography", label: "Cameras & Photography", icon: "📷", section: "Electronics & Technology", order: 5 },
      { value: "TV & Home Entertainment", label: "TV & Home Entertainment", icon: "📺", section: "Electronics & Technology", order: 6 },
      { value: "Smart Home Devices", label: "Smart Home Devices", icon: "🏠", section: "Electronics & Technology", order: 7 },
      { value: "Computer Accessories", label: "Computer Accessories", icon: "🖱️", section: "Electronics & Technology", order: 8 },

      // Home & Garden
      { value: "Furniture", label: "Furniture", icon: "🪑", section: "Home & Garden", order: 1 },
      { value: "Home Decor", label: "Home Decor", icon: "🖼️", section: "Home & Garden", order: 2 },
      { value: "Kitchen & Dining", label: "Kitchen & Dining", icon: "🍴", section: "Home & Garden", order: 3 },
      { value: "Bedding & Bath", label: "Bedding & Bath", icon: "🛏️", section: "Home & Garden", order: 4 },
      { value: "Garden & Outdoor", label: "Garden & Outdoor", icon: "🌱", section: "Home & Garden", order: 5 },
      { value: "Lighting", label: "Lighting", icon: "💡", section: "Home & Garden", order: 6 },
      { value: "Storage & Organization", label: "Storage & Organization", icon: "📦", section: "Home & Garden", order: 7 },
      { value: "Tools & Hardware", label: "Tools & Hardware", icon: "🔧", section: "Home & Garden", order: 8 },

      // Beauty & Personal Care
      { value: "Skincare", label: "Skincare", icon: "🧴", section: "Beauty & Personal Care", order: 1 },
      { value: "Makeup & Cosmetics", label: "Makeup & Cosmetics", icon: "💄", section: "Beauty & Personal Care", order: 2 },
      { value: "Hair Care", label: "Hair Care", icon: "✂️", section: "Beauty & Personal Care", order: 3 },
      { value: "Fragrances", label: "Fragrances", icon: "💨", section: "Beauty & Personal Care", order: 4 },
      { value: "Beauty Tools", label: "Beauty Tools", icon: "✨", section: "Beauty & Personal Care", order: 5 },
      { value: "Salon Services", label: "Salon Services", icon: "💇‍♀️", section: "Beauty & Personal Care", order: 6 },
      { value: "Spa & Wellness", label: "Spa & Wellness", icon: "💆‍♀️", section: "Beauty & Personal Care", order: 7 },
      { value: "Personal Hygiene", label: "Personal Hygiene", icon: "🧼", section: "Beauty & Personal Care", order: 8 },

      // Sports & Outdoors
      { value: "Sports Equipment", label: "Sports Equipment", icon: "⚽", section: "Sports & Outdoors", order: 1 },
      { value: "Fitness & Gym", label: "Fitness & Gym", icon: "🏋️", section: "Sports & Outdoors", order: 2 },
      { value: "Outdoor Recreation", label: "Outdoor Recreation", icon: "🏕️", section: "Sports & Outdoors", order: 3 },
      { value: "Cycling", label: "Cycling", icon: "🚴", section: "Sports & Outdoors", order: 4 },
      { value: "Swimming", label: "Swimming", icon: "🏊", section: "Sports & Outdoors", order: 5 },
      { value: "Hiking & Camping", label: "Hiking & Camping", icon: "🏔️", section: "Sports & Outdoors", order: 6 },
      { value: "Water Sports", label: "Water Sports", icon: "🏄", section: "Sports & Outdoors", order: 7 },
      { value: "Winter Sports", label: "Winter Sports", icon: "⛷️", section: "Sports & Outdoors", order: 8 },

      // Books & Media
      { value: "Books & Literature", label: "Books & Literature", icon: "📚", section: "Books & Media", order: 1 },
      { value: "Magazines & Newspapers", label: "Magazines & Newspapers", icon: "📰", section: "Books & Media", order: 2 },
      { value: "Music & Instruments", label: "Music & Instruments", icon: "🎵", section: "Books & Media", order: 3 },
      { value: "Movies & DVDs", label: "Movies & DVDs", icon: "🎬", section: "Books & Media", order: 4 },
      { value: "Educational Materials", label: "Educational Materials", icon: "🎓", section: "Books & Media", order: 5 },
      { value: "Art Supplies", label: "Art Supplies", icon: "🎨", section: "Books & Media", order: 6 },
      { value: "Stationery", label: "Stationery", icon: "✏️", section: "Books & Media", order: 7 },
      { value: "Gaming & Toys", label: "Gaming & Toys", icon: "🧩", section: "Books & Media", order: 8 },

      // Automotive
      { value: "Cars & Vehicles", label: "Cars & Vehicles", icon: "🚗", section: "Automotive", order: 1 },
      { value: "Motorcycles", label: "Motorcycles", icon: "🏍️", section: "Automotive", order: 2 },
      { value: "Auto Parts", label: "Auto Parts", icon: "⚙️", section: "Automotive", order: 3 },
      { value: "Auto Services", label: "Auto Services", icon: "🔧", section: "Automotive", order: 4 },
      { value: "Car Wash", label: "Car Wash", icon: "🚿", section: "Automotive", order: 5 },
      { value: "Fuel Stations", label: "Fuel Stations", icon: "⛽", section: "Automotive", order: 6 },
      { value: "Tires & Wheels", label: "Tires & Wheels", icon: "🛞", section: "Automotive", order: 7 },
      { value: "Auto Accessories", label: "Auto Accessories", icon: "🚙", section: "Automotive", order: 8 },

      // Health & Wellness
      { value: "Pharmacy", label: "Pharmacy", icon: "💊", section: "Health & Wellness", order: 1 },
      { value: "Medical Equipment", label: "Medical Equipment", icon: "🩺", section: "Health & Wellness", order: 2 },
      { value: "Health Supplements", label: "Health Supplements", icon: "💊", section: "Health & Wellness", order: 3 },
      { value: "Fitness & Nutrition", label: "Fitness & Nutrition", icon: "🍎", section: "Health & Wellness", order: 4 },
      { value: "Mental Health", label: "Mental Health", icon: "🧠", section: "Health & Wellness", order: 5 },
      { value: "Alternative Medicine", label: "Alternative Medicine", icon: "🌿", section: "Health & Wellness", order: 6 },
      { value: "Dental Care", label: "Dental Care", icon: "🦷", section: "Health & Wellness", order: 7 },
      { value: "Optical Services", label: "Optical Services", icon: "👓", section: "Health & Wellness", order: 8 },

      // Education & Training
      { value: "Schools & Universities", label: "Schools & Universities", icon: "🏫", section: "Education & Training", order: 1 },
      { value: "Tutoring Services", label: "Tutoring Services", icon: "👨‍🏫", section: "Education & Training", order: 2 },
      { value: "Language Learning", label: "Language Learning", icon: "🗣️", section: "Education & Training", order: 3 },
      { value: "Online Courses", label: "Online Courses", icon: "💻", section: "Education & Training", order: 4 },
      { value: "Vocational Training", label: "Vocational Training", icon: "🔨", section: "Education & Training", order: 5 },
      { value: "Music Lessons", label: "Music Lessons", icon: "🎼", section: "Education & Training", order: 6 },
      { value: "Art Classes", label: "Art Classes", icon: "🎨", section: "Education & Training", order: 7 },
      { value: "Sports Training", label: "Sports Training", icon: "🏃", section: "Education & Training", order: 8 },

      // Professional Services
      { value: "Legal Services", label: "Legal Services", icon: "⚖️", section: "Professional Services", order: 1 },
      { value: "Accounting & Tax", label: "Accounting & Tax", icon: "🧮", section: "Professional Services", order: 2 },
      { value: "Consulting", label: "Consulting", icon: "💼", section: "Professional Services", order: 3 },
      { value: "Real Estate", label: "Real Estate", icon: "🏢", section: "Professional Services", order: 4 },
      { value: "Insurance", label: "Insurance", icon: "🛡️", section: "Professional Services", order: 5 },
      { value: "Banking & Finance", label: "Banking & Finance", icon: "🏦", section: "Professional Services", order: 6 },
      { value: "Marketing & Advertising", label: "Marketing & Advertising", icon: "📢", section: "Professional Services", order: 7 },
      { value: "IT & Software", label: "IT & Software", icon: "💻", section: "Professional Services", order: 8 },

      // Entertainment
      { value: "Cinemas & Theaters", label: "Cinemas & Theaters", icon: "🎭", section: "Entertainment", order: 1 },
      { value: "Gaming Centers", label: "Gaming Centers", icon: "🎮", section: "Entertainment", order: 2 },
      { value: "Amusement Parks", label: "Amusement Parks", icon: "🎫", section: "Entertainment", order: 3 },
      { value: "Event Planning", label: "Event Planning", icon: "📅", section: "Entertainment", order: 4 },
      { value: "Photography Services", label: "Photography Services", icon: "📸", section: "Entertainment", order: 5 },
      { value: "DJ & Music", label: "DJ & Music", icon: "🎧", section: "Entertainment", order: 6 },
      { value: "Party Supplies", label: "Party Supplies", icon: "🎂", section: "Entertainment", order: 7 },
      { value: "Karaoke", label: "Karaoke", icon: "🎤", section: "Entertainment", order: 8 },

      // Travel & Tourism
      { value: "Hotels & Accommodation", label: "Hotels & Accommodation", icon: "🏨", section: "Travel & Tourism", order: 1 },
      { value: "Travel Agencies", label: "Travel Agencies", icon: "✈️", section: "Travel & Tourism", order: 2 },
      { value: "Tourist Attractions", label: "Tourist Attractions", icon: "🗺️", section: "Travel & Tourism", order: 3 },
      { value: "Transportation", label: "Transportation", icon: "🚌", section: "Travel & Tourism", order: 4 },
      { value: "Car Rental", label: "Car Rental", icon: "🚗", section: "Travel & Tourism", order: 5 },
      { value: "Tour Guides", label: "Tour Guides", icon: "👥", section: "Travel & Tourism", order: 6 },
      { value: "Adventure Tours", label: "Adventure Tours", icon: "🏔️", section: "Travel & Tourism", order: 7 },
      { value: "Cultural Tours", label: "Cultural Tours", icon: "🏛️", section: "Travel & Tourism", order: 8 },

      // Pet Services
      { value: "Pet Food & Supplies", label: "Pet Food & Supplies", icon: "🐾", section: "Pet Services", order: 1 },
      { value: "Pet Grooming", label: "Pet Grooming", icon: "✂️", section: "Pet Services", order: 2 },
      { value: "Veterinary Services", label: "Veterinary Services", icon: "💓", section: "Pet Services", order: 3 },
      { value: "Pet Training", label: "Pet Training", icon: "⭐", section: "Pet Services", order: 4 },
      { value: "Pet Boarding", label: "Pet Boarding", icon: "🏠", section: "Pet Services", order: 5 },
      { value: "Pet Accessories", label: "Pet Accessories", icon: "🦴", section: "Pet Services", order: 6 },
      { value: "Aquarium & Fish", label: "Aquarium & Fish", icon: "🐠", section: "Pet Services", order: 7 },
      { value: "Bird Supplies", label: "Bird Supplies", icon: "🪶", section: "Pet Services", order: 8 },

      // Religious & Cultural
      { value: "Religious Items", label: "Religious Items", icon: "🙏", section: "Religious & Cultural", order: 1 },
      { value: "Islamic Centers", label: "Islamic Centers", icon: "🕌", section: "Religious & Cultural", order: 2 },
      { value: "Cultural Events", label: "Cultural Events", icon: "📅", section: "Religious & Cultural", order: 3 },
      { value: "Traditional Crafts", label: "Traditional Crafts", icon: "✋", section: "Religious & Cultural", order: 4 },
      { value: "Religious Services", label: "Religious Services", icon: "🙏", section: "Religious & Cultural", order: 5 },
      { value: "Cultural Workshops", label: "Cultural Workshops", icon: "📋", section: "Religious & Cultural", order: 6 },
      { value: "Festival Supplies", label: "Festival Supplies", icon: "⭐", section: "Religious & Cultural", order: 7 },
      { value: "Traditional Clothing", label: "Traditional Clothing", icon: "👘", section: "Religious & Cultural", order: 8 },

      // Miscellaneous
      { value: "Gift Shops", label: "Gift Shops", icon: "🎁", section: "Miscellaneous", order: 1 },
      { value: "Antiques & Collectibles", label: "Antiques & Collectibles", icon: "🕰️", section: "Miscellaneous", order: 2 },
      { value: "Thrift Stores", label: "Thrift Stores", icon: "🛒", section: "Miscellaneous", order: 3 },
      { value: "Repair Services", label: "Repair Services", icon: "🔧", section: "Miscellaneous", order: 4 },
      { value: "Cleaning Services", label: "Cleaning Services", icon: "🧹", section: "Miscellaneous", order: 5 },
      { value: "Security Services", label: "Security Services", icon: "🔒", section: "Miscellaneous", order: 6 },
      { value: "Printing & Copying", label: "Printing & Copying", icon: "🖨️", section: "Miscellaneous", order: 7 },
      { value: "Other", label: "Other", icon: "⋯", section: "Miscellaneous", order: 8 }
    ];

    // Clear existing categories
    await Category.deleteMany({});
    
    // Insert default categories
    const insertedCategories = await Category.insertMany(defaultCategories);
    
    res.json({ 
      message: 'Categories initialized successfully', 
      count: insertedCategories.length 
    });
  } catch (error) {
    console.error('Error initializing categories:', error);
    res.status(500).json({ error: 'Failed to initialize categories' });
  }
});
  
  app.use('/api/mobile', mobileRoutes);
  app.use('/api/shop', shopRoutes);
app.use('/api/shop-wizard', shopWizardRoutes);
app.use('/api/institute', instituteRoutes);
app.use('/api/institute-wizard', instituteWizardRoutes);
app.use('/api/hospital', hospitalRoutes);
app.use('/api/hospital-wizard', hospitalWizardRoutes);
app.use('/api/product-wizard', productWizardRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/notifications', notificationRoutes);
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

// Health check endpoint for Railway
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Pakistan Online Backend is running',
    timestamp: new Date().toISOString(),
    port: PORT,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Additional health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

server.listen(PORT, () => {
  const mailOk = mailUtil.isTransactionalEmailConfigured();
  const mailVia = process.env.RESEND_API_KEY
    ? 'Resend'
    : process.env.SMTP_HOST
      ? 'SMTP'
      : process.env.EMAIL_USER
        ? 'Gmail/Nodemailer'
        : 'none';
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📧 Transactional email: ${mailOk ? 'YES' : 'NO'} (${mailVia})`);
  if (mailOk && process.env.RESEND_API_KEY && !process.env.RESEND_FROM_EMAIL) {
    console.log('📧 RESEND_FROM_EMAIL not set — using default from (verify domain in Resend if sends fail).');
  }
  const fe = (process.env.FRONTEND_URL || process.env.CLIENT_URL || '').trim();
  if (process.env.NODE_ENV === 'production' && !fe) {
    console.warn(
      '⚠️  FRONTEND_URL not set — verification emails still send, but redirects after verify go nowhere useful. Set FRONTEND_URL=https://www.edunia.org (your live site, no trailing slash).',
    );
  } else if (fe) {
    console.log(`🌐 FRONTEND_URL (verify redirect): ${fe}`);
  }
  console.log(`💾 MongoDB URL: ${process.env.MONGODB_URI ? 'SET' : 'NOT SET'}`);
  console.log(`🔗 API listening on port ${PORT}`);
});

// Test endpoint to check entity approval status
app.get('/api/test/entity-approval/:entityType/:userId', async function(req, res) {
  try {
    const { entityType, userId } = req.params;
    
    console.log(`🔍 Testing entity approval for ${entityType} user ${userId}`);
    
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
        EntityModel = require('./models/Hospital');
        entityCollection = 'hospitals';
        break;
      case 'marketplace':
        EntityModel = require('./models/Product');
        entityCollection = 'products';
        break;
      default:
        return res.status(400).json({ error: 'Invalid entity type' });
    }
    
    // Find all entities for this user
    const allEntities = await EntityModel.find({ owner: userId });
    console.log(`📊 Found ${allEntities.length} ${entityType} entities for user ${userId}`);
    
    const entityDetails = allEntities.map(entity => ({
      id: entity._id,
      name: entity.name || entity.shopName || entity.title,
      approvalStatus: entity.approvalStatus,
      createdAt: entity.createdAt,
      approvedAt: entity.approvedAt,
      paymentVerified: entity.paymentVerified,
      paymentRequestId: entity.paymentRequestId
    }));
    
    res.json({
      success: true,
      entityType,
      userId,
      totalEntities: allEntities.length,
      entities: entityDetails
    });
    
  } catch (error) {
    console.error('Error testing entity approval:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});