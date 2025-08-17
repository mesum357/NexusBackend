console.log('Starting minimal test...');

try {
  require('dotenv').config();
  console.log('✅ dotenv loaded');
  console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
  console.log('SESSION_SECRET:', process.env.SESSION_SECRET ? 'Set' : 'Not set');
  
  const express = require('express');
  console.log('✅ express loaded');
  
  const app = express();
  console.log('✅ app created');
  
  app.get('/', (req, res) => {
    res.json({ message: 'Minimal server working!' });
  });
  
  const PORT = 3001;
  app.listen(PORT, () => {
    console.log(`✅ Minimal server listening on port ${PORT}`);
  });
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
}
