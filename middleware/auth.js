const ensureAuthenticated = (req, res, next) => {
  console.log('ensureAuthenticated middleware called');
  console.log('req.isAuthenticated():', req.isAuthenticated());
  console.log('req.user:', req.user);
  if (req.isAuthenticated()) return next();
  console.log('Authentication failed, sending 401');
  res.status(401).json({ error: 'Not authenticated' });
};

module.exports = { ensureAuthenticated }; 