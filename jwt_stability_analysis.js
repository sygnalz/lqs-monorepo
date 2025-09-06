// JWT Stability Analysis - Testing edge cases and potential failure points
const API_BASE = 'https://lqs-uat-worker.charlesheflin.workers.dev';

async function analyzeJWTStability() {
  console.log('🔬 JWT STABILITY ANALYSIS');
  console.log('Testing edge cases that could cause intermittent failures...\n');
  
  const testResults = [];
  
  // Test 1: Concurrent requests with same JWT
  console.log('📋 TEST 1: Concurrent requests with same JWT token');
  try {
    const signinResponse = await fetch(`${API_BASE}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'uat-owner-a@example.com',
        password: 'TestPassword123!'
      })
    });
    
    const signinData = await signinResponse.json();
    const token = signinData.data.session.access_token;
    
    console.log(`   JWT Token: ${token.substring(0, 30)}...`);
    
    // Fire 5 concurrent requests with the same token
    const concurrentPromises = [];
    for (let i = 0; i < 5; i++) {
      concurrentPromises.push(
        fetch(`${API_BASE}/api/leads`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            lead_name: `Concurrent Test ${i}`,
            lead_email: `concurrent.${i}@example.com`
          })
        })
      );
    }
    
    const results = await Promise.all(concurrentPromises);
    let successCount = 0;
    let failureCount = 0;
    
    for (let i = 0; i < results.length; i++) {
      const response = results[i];
      const data = await response.json();
      if (data.success) {
        successCount++;
        console.log(`   ✅ Request ${i + 1}: Success (${data.data.id})`);
      } else {
        failureCount++;
        console.log(`   ❌ Request ${i + 1}: Failed (${data.error})`);
        testResults.push({ test: 'concurrent', failure: data });
      }
    }
    
    console.log(`   📊 Results: ${successCount} success, ${failureCount} failures`);
    
  } catch (error) {
    console.log(`   ❌ Test 1 failed: ${error.message}`);
  }
  
  // Test 2: Token at different lifecycle stages
  console.log('\n📋 TEST 2: Token validation at different lifecycle stages');
  try {
    const signinResponse = await fetch(`${API_BASE}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'uat-owner-a@example.com',
        password: 'TestPassword123!'
      })
    });
    
    const signinData = await signinResponse.json();
    const token = signinData.data.session.access_token;
    const expiresAt = signinData.data.session.expires_at;
    const currentTime = Math.floor(Date.now() / 1000);
    
    console.log(`   Token expires at: ${expiresAt} (in ${expiresAt - currentTime} seconds)`);
    
    // Immediate use
    console.log('   Testing immediate use (0ms delay)...');
    const immediateResponse = await fetch(`${API_BASE}/api/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        lead_name: 'Immediate Test',
        lead_email: 'immediate@example.com'
      })
    });
    
    const immediateData = await immediateResponse.json();
    if (immediateData.success) {
      console.log('   ✅ Immediate use: Success');
    } else {
      console.log('   ❌ Immediate use: Failed');
      testResults.push({ test: 'immediate', failure: immediateData });
    }
    
    // After 1 second delay
    console.log('   Testing after 1 second delay...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const delayedResponse = await fetch(`${API_BASE}/api/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        lead_name: 'Delayed Test',
        lead_email: 'delayed@example.com'
      })
    });
    
    const delayedData = await delayedResponse.json();
    if (delayedData.success) {
      console.log('   ✅ After 1s delay: Success');
    } else {
      console.log('   ❌ After 1s delay: Failed');
      testResults.push({ test: 'delayed', failure: delayedData });
    }
    
  } catch (error) {
    console.log(`   ❌ Test 2 failed: ${error.message}`);
  }
  
  // Test 3: Malformed requests
  console.log('\n📋 TEST 3: Edge case request variations');
  try {
    const signinResponse = await fetch(`${API_BASE}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'uat-owner-a@example.com',
        password: 'TestPassword123!'
      })
    });
    
    const signinData = await signinResponse.json();
    const token = signinData.data.session.access_token;
    
    // Test with extra whitespace in token
    console.log('   Testing with whitespace in token...');
    const whitespaceResponse = await fetch(`${API_BASE}/api/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer  ${token} ` // Extra spaces
      },
      body: JSON.stringify({
        lead_name: 'Whitespace Test',
        lead_email: 'whitespace@example.com'
      })
    });
    
    const whitespaceData = await whitespaceResponse.json();
    if (whitespaceData.success) {
      console.log('   ✅ Whitespace handling: Success');
    } else {
      console.log('   ❌ Whitespace handling: Failed - this might be an issue!');
      testResults.push({ test: 'whitespace', failure: whitespaceData });
    }
    
    // Test with case variations in Bearer
    console.log('   Testing with case variations in Bearer...');
    const caseResponse = await fetch(`${API_BASE}/api/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `bearer ${token}` // lowercase 'bearer'
      },
      body: JSON.stringify({
        lead_name: 'Case Test',
        lead_email: 'case@example.com'
      })
    });
    
    const caseData = await caseResponse.json();
    if (caseData.success) {
      console.log('   ✅ Case insensitive Bearer: Success');
    } else {
      console.log('   ❌ Case insensitive Bearer: Failed - this might be an issue!');
      testResults.push({ test: 'case', failure: caseData });
    }
    
  } catch (error) {
    console.log(`   ❌ Test 3 failed: ${error.message}`);
  }
  
  // Summary
  console.log('\n📊 STABILITY ANALYSIS SUMMARY:');
  if (testResults.length === 0) {
    console.log('✅ No edge case failures detected - JWT validation appears stable');
  } else {
    console.log('❌ Edge case failures detected:');
    testResults.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.test}: ${result.failure.error}`);
    });
  }
  
  return testResults;
}

// Run the analysis
analyzeJWTStability()
  .then(results => {
    if (results.length > 0) {
      console.log('\n🚨 POTENTIAL ISSUES FOUND:');
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log('\n✅ No stability issues detected in edge case testing');
    }
  })
  .catch(error => {
    console.error('\n❌ Analysis failed:', error);
  });