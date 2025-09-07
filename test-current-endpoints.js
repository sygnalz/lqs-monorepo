// Test current API endpoints to see what works before schema fix
const BASE_URL = 'https://lqs-uat-worker.charlesheflin.workers.dev';

async function testEndpoints() {
  console.log('🧪 TESTING CURRENT API ENDPOINTS');
  console.log('=================================\n');
  
  // Test 1: Health check
  console.log('1. Testing health endpoint...');
  try {
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthResponse.json();
    
    if (healthResponse.ok) {
      console.log('   ✅ Health endpoint working');
      console.log('   📋 Response:', healthData);
    } else {
      console.log('   ❌ Health endpoint failed:', healthResponse.status);
    }
  } catch (error) {
    console.log('   ❌ Health endpoint error:', error.message);
  }
  
  console.log('\n2. Testing lead creation with missing schema fields...');
  
  // Test 2: Try creating a lead with the current (broken) schema
  // This should fail because phone and custom_data columns don't exist yet
  try {
    const testLead = {
      lead_name: 'Schema Test Lead',
      lead_email: 'schema.test@example.com',
      phone: '+1234567890', // This should fail
      custom_data: { test: 'data' } // This should fail
    };
    
    const createResponse = await fetch(`${BASE_URL}/api/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake_token_for_testing' // Will fail auth, but should show schema error first
      },
      body: JSON.stringify(testLead)
    });
    
    const createData = await createResponse.json();
    
    if (createResponse.ok) {
      console.log('   ⚠️  Unexpected success - schema may already be fixed');
      console.log('   📋 Response:', createData);
    } else {
      console.log(`   ❌ Expected failure (${createResponse.status}):`, createData.error);
      
      // Check if error is about missing columns vs authentication
      if (createData.error.includes('custom_data') || createData.error.includes('phone')) {
        console.log('   🔧 CONFIRMED: Schema columns missing - need to run LEADS_SCHEMA_FIX.sql');
      } else if (createData.error.includes('Authorization') || createData.error.includes('token')) {
        console.log('   ⚠️  Authentication error (expected) - schema may be OK');
      }
    }
  } catch (error) {
    console.log('   ❌ Lead creation test error:', error.message);
  }
  
  console.log('\n3. Testing GET leads endpoint...');
  
  // Test 3: Try getting leads list
  try {
    const getResponse = await fetch(`${BASE_URL}/api/leads`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer fake_token_for_testing'
      }
    });
    
    const getData = await getResponse.json();
    
    if (getResponse.ok) {
      console.log('   ⚠️  Unexpected success - auth may be bypassed');
      console.log('   📋 Response:', getData);
    } else {
      console.log(`   ❌ Expected failure (${getResponse.status}):`, getData.error);
      
      if (getData.error.includes('Authorization') || getData.error.includes('token')) {
        console.log('   ✅ GET endpoint exists and requires auth (good)');
      }
    }
  } catch (error) {
    console.log('   ❌ GET leads test error:', error.message);
  }
  
  console.log('\n📋 NEXT STEPS:');
  console.log('================');
  console.log('1. Run LEADS_SCHEMA_FIX.sql in Supabase SQL Editor');
  console.log('2. Test endpoints again with valid authentication');
  console.log('3. Verify full lead management workflow');
  
  // Show the SQL file path
  console.log('\n📄 Schema Fix Script Location:');
  console.log('   File: LEADS_SCHEMA_FIX.sql');
  console.log('   Usage: Copy content to Supabase Dashboard → SQL Editor → Run');
}

// Run tests
testEndpoints().catch(console.error);