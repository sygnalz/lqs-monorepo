// Quick test with different field names to see what the deployed worker expects
const BASE_URL = 'https://lqs-uat-worker.charlesheflin.workers.dev';

async function testSignupFieldNames() {
  console.log('🧪 TESTING SIGNUP FIELD NAMES');
  console.log('==============================\n');
  
  // Test 1: Try with client_name (our code)
  console.log('Test 1: Using client_name...');
  try {
    const response1 = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test1.${Date.now()}@example.com`,
        password: 'testpassword123',
        client_name: 'Test Company 1'
      })
    });
    
    const data1 = await response1.json();
    console.log(`   Status: ${response1.status}`);
    console.log(`   Response:`, data1);
  } catch (error) {
    console.log('   Error:', error.message);
  }
  
  // Test 2: Try with company_name (error message suggests this)
  console.log('\\nTest 2: Using company_name...');
  try {
    const response2 = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test2.${Date.now()}@example.com`,
        password: 'testpassword123',
        company_name: 'Test Company 2'
      })
    });
    
    const data2 = await response2.json();
    console.log(`   Status: ${response2.status}`);
    console.log(`   Response:`, data2);
  } catch (error) {
    console.log('   Error:', error.message);
  }
  
  // Test 3: Try with name (simple field)
  console.log('\\nTest 3: Using name...');
  try {
    const response3 = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test3.${Date.now()}@example.com`,
        password: 'testpassword123',
        name: 'Test Company 3'
      })
    });
    
    const data3 = await response3.json();
    console.log(`   Status: ${response3.status}`);
    console.log(`   Response:`, data3);
  } catch (error) {
    console.log('   Error:', error.message);
  }
  
  console.log('\\n📋 CONCLUSION:');
  console.log('===============');
  console.log('The deployed worker may be different from our local code.');
  console.log('Need to deploy our updated worker.js to Cloudflare.');
}

testSignupFieldNames().catch(console.error);