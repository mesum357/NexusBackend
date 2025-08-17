const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:3001'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// In-memory storage for testing
const users = new Map();
const sessions = new Map();

// Helper function to hash passwords (simplified for testing)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Helper function to generate session ID
function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

// Test endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Test Auth Server is running!', 
    endpoints: [
      'POST /api/auth/register',
      'POST /api/auth/login', 
      'GET /api/auth/me',
      'POST /api/auth/logout'
    ]
  });
});

// Registration endpoint
app.post('/api/auth/register', (req, res) => {
  console.log('🚀 Registration request received:', req.body);
  
  const { username, email, password, confirmPassword, fullName, mobile, city, isAdmin } = req.body;
  
  // Validation
  if (!username || !email || !password || !confirmPassword || !fullName || !mobile) {
    return res.status(400).json({ error: 'All required fields are missing' });
  }
  
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }
  
  // Check if user already exists
  if (users.has(username) || Array.from(users.values()).some(u => u.email === email)) {
    return res.status(400).json({ error: 'User already exists with this username or email' });
  }
  
  // Create user
  const user = {
    id: crypto.randomBytes(16).toString('hex'),
    username,
    email,
    fullName,
    mobile,
    city: city || '',
    password: hashPassword(password),
    isAdmin: isAdmin || false,
    verified: true,
    createdAt: new Date()
  };
  
  users.set(username, user);
  
  console.log('✅ User registered successfully:', { username, email, isAdmin });
  
  res.status(201).json({
    success: true,
    message: 'Admin user registered successfully!',
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin
    }
  });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  console.log('🔐 Login request received:', req.body);
  
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  // Find user by username or email
  let user = users.get(username);
  if (!user) {
    // Try to find by email
    user = Array.from(users.values()).find(u => u.email === username);
  }
  
  if (!user) {
    console.log('❌ User not found:', username);
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  
  // Verify password
  if (user.password !== hashPassword(password)) {
    console.log('❌ Password verification failed for user:', user.username);
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  
  // Create session
  const sessionId = generateSessionId();
  sessions.set(sessionId, {
    userId: user.id,
    username: user.username,
    createdAt: new Date()
  });
  
  console.log('✅ Login successful for user:', user.username);
  
  // Set session cookie
  res.cookie('sessionId', sessionId, {
    httpOnly: true,
    secure: false, // false for localhost testing
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });
  
  res.json({
    success: true,
    message: 'Login successful',
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      isAdmin: user.isAdmin
    }
  });
});

// Get current user endpoint
app.get('/api/auth/me', (req, res) => {
  const sessionId = req.cookies?.sessionId;
  
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const session = sessions.get(sessionId);
  const user = Array.from(users.values()).find(u => u.id === session.userId);
  
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  
  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      isAdmin: user.isAdmin
    }
  });
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  const sessionId = req.cookies?.sessionId;
  
  if (sessionId) {
    sessions.delete(sessionId);
  }
  
  res.clearCookie('sessionId');
  res.json({ success: true, message: 'Logout successful' });
});

// Debug endpoint to see all users
app.get('/debug/users', (req, res) => {
  const userList = Array.from(users.values()).map(u => ({
    id: u.id,
    username: u.username,
    email: u.email,
    isAdmin: u.isAdmin,
    verified: u.verified
  }));
  
  res.json({
    totalUsers: users.size,
    users: userList
  });
});

// Debug endpoint to see all sessions
app.get('/debug/sessions', (req, res) => {
  const sessionList = Array.from(sessions.entries()).map(([id, session]) => ({
    sessionId: id,
    userId: session.userId,
    username: session.username,
    createdAt: session.createdAt
  }));
  
  res.json({
    totalSessions: sessions.size,
    sessions: sessionList
  });
});

app.listen(PORT, () => {
  console.log(`🧪 Test Auth Server running on port ${PORT}`);
  console.log(`🔗 Test with: http://localhost:${PORT}/`);
  console.log(`📝 Available endpoints:`);
  console.log(`   - GET  / (server info)`);
  console.log(`   - POST /api/auth/register`);
  console.log(`   - POST /api/auth/login`);
  console.log(`   - GET  /api/auth/me`);
  console.log(`   - POST /api/auth/logout`);
  console.log(`   - GET  /debug/users (see all users)`);
  console.log(`   - GET  /debug/sessions (see all sessions)`);
});
