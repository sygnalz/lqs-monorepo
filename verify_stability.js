// Run multiple consecutive tests to verify JWT authentication stability
const API_BASE = 'https://lqs-uat-worker.charlesheflin.workers.dev';

async function runStabilityTests() {
  console.log('🔬 JWT AUTHENTICATION STABILITY VERIFICATION');
  console.log('Running 5 consecutive signin→create lead tests...\n');
  
  const results = [];
  
  for (let testNum = 1; testNum <= 5; testNum++) {
    console.log(`📋 TEST ${testNum}/5`);
    
    try {
      // Sign in
      const signinResponse = await fetch(`${API_BASE}/api/auth/signin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'uat-owner-a@example.com',
          password: 'TestPassword123!'
        })
      });
      
      if (!signinResponse.ok) {
        console.log(`   ❌ Signin failed: ${signinResponse.status}`);
        results.push({ test: testNum, signin: 'FAILED', lead_creation: 'SKIPPED' });
        continue;
      }
      
      const signinData = await signinResponse.json();
      const userJWT = signinData.data.session.access_token;
      console.log(`   ✅ Signin successful - JWT: ${userJWT.substring(0, 20)}...`);
      
      // Create lead
      const leadResponse = await fetch(`${API_BASE}/api/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userJWT}`
        },
        body: JSON.stringify({
          lead_name: `Stability Test ${testNum}`,
          lead_email: `stability.${testNum}@example.com`
        })
      });
      
      console.log(`   Status: ${leadResponse.status} ${leadResponse.statusText}`);
      
      if (leadResponse.ok) {
        const leadData = await leadResponse.json();
        console.log(`   ✅ Lead created: ${leadData.data.id}`);
        results.push({ test: testNum, signin: 'SUCCESS', lead_creation: 'SUCCESS', lead_id: leadData.data.id });
      } else {
        const errorData = await leadResponse.json();
        console.log(`   ❌ Lead creation failed: ${JSON.stringify(errorData, null, 2)}`);
        results.push({ test: testNum, signin: 'SUCCESS', lead_creation: 'FAILED', error: errorData });
      }
      
    } catch (error) {
      console.log(`   ❌ Test error: ${error.message}`);
      results.push({ test: testNum, signin: 'ERROR', lead_creation: 'ERROR', error: error.message });
    }
    
    console.log(''); // Empty line between tests
  }
  
  // Results summary
  console.log('📊 STABILITY TEST RESULTS');
  console.log('=' .repeat(50));
  
  let successCount = 0;
  let failureCount = 0;
  
  results.forEach(result => {
    const status = (result.signin === 'SUCCESS' && result.lead_creation === 'SUCCESS') ? '✅ SUCCESS' : '❌ FAILED';
    console.log(`Test ${result.test}: ${status}`);
    
    if (result.signin === 'SUCCESS' && result.lead_creation === 'SUCCESS') {
      successCount++;
    } else {
      failureCount++;
      if (result.error) {
        console.log(`   Error details: ${JSON.stringify(result.error, null, 2)}`);
      }
    }
  });
  
  console.log('\n📋 FINAL VERDICT:');
  console.log(`   Successful tests: ${successCount}/5`);
  console.log(`   Failed tests: ${failureCount}/5`);
  
  if (successCount === 5) {
    console.log('   🎯 RESULT: JWT authentication is STABLE and working correctly');
    console.log('   🔧 STATUS: No configuration changes needed');
  } else {
    console.log('   ⚠️ RESULT: JWT authentication has stability issues');
    console.log('   🔧 STATUS: Further investigation required');
  }
}

runStabilityTests().catch(console.error);
