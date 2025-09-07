// Debug API endpoints step by step
const BASE_URL = 'https://lqs-uat-worker.charlesheflin.workers.dev';

async function debugStepByStep() {
  console.log('🔍 DEBUG: API ENDPOINTS STEP BY STEP');
  console.log('====================================\n');
  
  // Step 1: Test health endpoint to confirm worker is deployed
  console.log('STEP 1: Health Check');
  console.log('--------------------');
  try {
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthResponse.text(); // Use text() to see raw response
    
    console.log('Status:', healthResponse.status);
    console.log('Headers:', Object.fromEntries(healthResponse.headers.entries()));
    console.log('Raw response:', healthData);
    
    if (healthResponse.ok) {
      console.log('✅ Health endpoint working\n');
    } else {
      console.log('❌ Health endpoint failed\n');
      return;
    }
  } catch (error) {
    console.log('❌ Health endpoint error:', error.message);
    return;
  }
  
  // Step 2: Test sign-up with detailed error logging
  console.log('STEP 2: Sign-Up Test (Detailed)');
  console.log('--------------------------------');
  try {
    const signupData = {
      email: `debug.test.${Date.now()}@example.com`,
      password: 'testpassword123',
      client_name: 'Debug Test Company'
    };
    
    console.log('Request URL:', `${BASE_URL}/api/auth/signup`);
    console.log('Request body:', JSON.stringify(signupData, null, 2));
    
    const signupResponse = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(signupData)
    });
    
    console.log('Response status:', signupResponse.status);
    console.log('Response headers:', Object.fromEntries(signupResponse.headers.entries()));
    
    const responseText = await signupResponse.text();
    console.log('Raw response:', responseText);
    
    try {
      const jsonData = JSON.parse(responseText);
      console.log('Parsed JSON:', JSON.stringify(jsonData, null, 2));
    } catch (parseError) {
      console.log('❌ Response is not valid JSON');
    }
    
  } catch (error) {
    console.log('❌ Sign-up request error:', error.message);
  }
  
  console.log('\nSTEP 3: Check Worker Deployment');
  console.log('--------------------------------');
  
  // Test if our updated endpoints are actually deployed
  console.log('Testing GET /api/leads (should fail auth but show endpoint exists)...');
  try {
    const leadsResponse = await fetch(`${BASE_URL}/api/leads`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test'
      }
    });
    
    console.log('GET /api/leads status:', leadsResponse.status);
    const leadsText = await leadsResponse.text();
    console.log('GET /api/leads response:', leadsText);
    
    if (leadsResponse.status === 401) {
      console.log('✅ GET /api/leads endpoint exists (auth required as expected)');
    } else if (leadsResponse.status === 404) {
      console.log('❌ GET /api/leads endpoint not found - deployment issue');
    }
    
  } catch (error) {
    console.log('❌ GET /api/leads test error:', error.message);
  }
  
  console.log('\n📋 DIAGNOSTIC SUMMARY');
  console.log('=====================');
  console.log('1. Check if all responses are valid JSON');
  console.log('2. Check if worker.js deployment is complete');
  console.log('3. Check if Supabase credentials are working');
  console.log('4. Check if companies table exists and is accessible');
}

debugStepByStep().catch(console.error);