const fetch = require('node-fetch');

async function testCORS() {
  const baseUrl = 'https://nexusbackend-production.up.railway.app';
  
  console.log('🧪 Testing CORS configuration...');
  
  try {
    // Test the CORS endpoint
    console.log('\n1️⃣ Testing /api/test-cors...');
    const corsResponse = await fetch(`${baseUrl}/api/test-cors`, {
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:3001',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', corsResponse.status);
    console.log('CORS Headers:');
    corsResponse.headers.forEach((value, key) => {
      if (key.toLowerCase().includes('access-control')) {
        console.log(`  ${key}: ${value}`);
      }
    });
    
    if (corsResponse.ok) {
      const data = await corsResponse.json();
      console.log('Response:', data);
    }
    
  } catch (error) {
    console.error('❌ CORS test failed:', error.message);
  }
  
  try {
    // Test the admin stats endpoint
    console.log('\n2️⃣ Testing /api/admin/public/stats...');
    const statsResponse = await fetch(`${baseUrl}/api/admin/public/stats`, {
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:3001',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', statsResponse.status);
    console.log('CORS Headers:');
    statsResponse.headers.forEach((value, key) => {
      if (key.toLowerCase().includes('access-control')) {
        console.log(`  ${key}: ${value}`);
      }
    });
    
    if (statsResponse.ok) {
      const data = await statsResponse.json();
      console.log('Response received successfully');
    }
    
  } catch (error) {
    console.error('❌ Admin stats test failed:', error.message);
  }
}

testCORS();
