// Test the actual worker endpoint to capture the 403 error
const API_BASE = 'https://lqs-uat-worker.charlesheflin.workers.dev';

async function testWorker403() {
  console.log('🚨 TESTING WORKER 403 ERROR REPRODUCTION');
  
  // Step 1: Sign in to get JWT
  console.log('\n1. Signing in through worker...');
  const signinResponse = await fetch(`${API_BASE}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'uat-owner-a@example.com',
      password: 'TestPassword123!'
    })
  });
  
  if (!signinResponse.ok) {
    console.log('❌ Signin failed');
    return;
  }
  
  const signinData = await signinResponse.json();
  const userJWT = signinData.data.session.access_token;
  console.log(`✅ JWT obtained: ${userJWT.substring(0, 30)}...`);
  
  // Step 2: Try to create a lead (this should trigger the 403)
  console.log('\n2. Creating lead to trigger 403 error...');
  const createLeadResponse = await fetch(`${API_BASE}/api/leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userJWT}`
    },
    body: JSON.stringify({
      lead_name: 'Test Lead 403',
      lead_email: 'test403@example.com'
    })
  });
  
  console.log(`   Status: ${createLeadResponse.status} ${createLeadResponse.statusText}`);
  
  if (!createLeadResponse.ok) {
    const errorResponse = await createLeadResponse.json();
    console.log('❌ CAPTURED ERROR:');
    console.log(JSON.stringify(errorResponse, null, 2));
    
    if (errorResponse.debug_info) {
      console.log('\n📋 DEBUG INFO FROM WORKER:');
      console.log(JSON.stringify(errorResponse.debug_info, null, 2));
    }
  } else {
    console.log('✅ Unexpected success - no 403 error occurred');
    const responseData = await createLeadResponse.json();
    console.log(JSON.stringify(responseData, null, 2));
  }
}

testWorker403().catch(console.error);
