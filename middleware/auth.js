const ensureAuthenticated = (req, res, next) => {
  console.log('ensureAuthenticated middleware called');
  console.log('req.isAuthenticated():', req.isAuthenticated());
  console.log('req.user:', req.user);
  if (req.isAuthenticated()) return next();
  console.log('Authentication failed, sending 401');
  res.status(401).json({ error: 'Not authenticated' });
};

const ensureAdmin = (req, res, next) => {
  console.log('ensureAdmin middleware called');
  if (!req.isAuthenticated()) {
    console.log('Authentication failed, sending 401');
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  if (!req.user.isAdmin) {
    console.log('User is not admin, sending 403');
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  console.log('Admin access granted');
  next();
};

module.exports = { ensureAuthenticated, ensureAdmin }; 