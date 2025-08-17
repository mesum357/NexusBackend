const fetch = require('node-fetch').default;

const API_BASE_URL = 'http://localhost:3001';
const TEST_USER = {
  username: 'testadmin',
  email: 'testadmin@example.com',
  password: 'testpass123',
  confirmPassword: 'testpass123',
  fullName: 'Test Admin User',
  mobile: '+1234567890',
  city: 'Test City',
  isAdmin: true
};

async function testAdminRegistration() {
  console.log('🧪 Testing Admin Registration...');
  console.log('📝 Test User Data:', { ...TEST_USER, password: '***' });
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_USER)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Registration Successful!');
      console.log('📊 Response:', data);
      return true;
    } else {
      console.log('❌ Registration Failed!');
      console.log('📊 Response:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Network Error:', error.message);
    return false;
  }
}

async function testAdminLogin() {
  console.log('\n🔐 Testing Admin Login...');
  console.log('📝 Login Credentials:', { username: TEST_USER.username, password: '***' });
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        username: TEST_USER.username,
        password: TEST_USER.password
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Login Successful!');
      console.log('📊 Response:', data);
      console.log('🍪 Cookies:', response.headers.get('set-cookie'));
      return true;
    } else {
      console.log('❌ Login Failed!');
      console.log('📊 Response:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Network Error:', error.message);
    return false;
  }
}

async function testAuthStatus() {
  console.log('\n🔍 Testing Authentication Status...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ User is authenticated!');
      console.log('📊 User Data:', data);
      return true;
    } else {
      console.log('❌ User is not authenticated!');
      console.log('📊 Response:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Network Error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Admin Authentication Tests...\n');
  
  // Test 1: Registration
  const registrationSuccess = await testAdminRegistration();
  
  if (registrationSuccess) {
    // Test 2: Login
    const loginSuccess = await testAdminLogin();
    
    if (loginSuccess) {
      // Test 3: Auth Status
      await testAuthStatus();
    }
  }
  
  console.log('\n🏁 Tests completed!');
}

// Run the tests
runTests().catch(console.error);
