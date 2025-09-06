// Comprehensive JWT validation testing to catch intermittent failures
const API_BASE = 'https://lqs-uat-worker.charlesheflin.workers.dev';

async function runComprehensiveJWTTests() {
  console.log('🚨 COMPREHENSIVE JWT VALIDATION TESTING');
  console.log('Testing various scenarios to catch intermittent failures...\n');
  
  const scenarios = [
    {
      name: 'Original failing user (uat-owner-a)',
      email: 'uat-owner-a@example.com',
      password: 'TestPassword123!'
    },
    {
      name: 'Previously working user', 
      email: 'final.test.user.1757191228@example.com',
      password: 'TestPassword123!'
    },
    {
      name: 'Fresh new user',
      email: `jwt.stress.test.${Date.now()}@example.com`,
      password: 'TestPassword123!'
    }
  ];
  
  for (let scenarioIndex = 0; scenarioIndex < scenarios.length; scenarioIndex++) {
    const scenario = scenarios[scenarioIndex];
    console.log(`\n📋 SCENARIO ${scenarioIndex + 1}: ${scenario.name}`);
    console.log(`   Email: ${scenario.email}`);
    
    try {
      // Create user if it's a new one
      if (scenario.name.includes('Fresh new user')) {
        console.log('   Creating new user...');
        const signupResponse = await fetch(`${API_BASE}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: scenario.email,
            password: scenario.password,
            client_name: 'JWT Stress Test Org'
          })
        });
        
        if (!signupResponse.ok) {
          console.log(`   ❌ User creation failed: ${signupResponse.status}`);
          continue;
        }
        console.log('   ✅ User created successfully');
      }
      
      // Run multiple rapid tests for this user
      for (let testRun = 1; testRun <= 3; testRun++) {
        console.log(`   \n   🧪 Test Run ${testRun}/3:`);
        
        const startTime = Date.now();
        
        // Step 1: Get JWT
        const signinResponse = await fetch(`${API_BASE}/api/auth/signin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: scenario.email,
            password: scenario.password
          })
        });
        
        const signinTime = Date.now();
        
        if (!signinResponse.ok) {
          console.log(`      ❌ Signin failed: ${signinResponse.status}`);
          continue;
        }
        
        const signinData = await signinResponse.json();
        if (!signinData.success) {
          console.log(`      ❌ Signin error: ${signinData.error}`);
          continue;
        }
        
        const token = signinData.data.session.access_token;
        const expiresAt = signinData.data.session.expires_at;
        const currentTime = Math.floor(Date.now() / 1000);
        
        console.log(`      ✅ JWT obtained (${signinTime - startTime}ms)`);
        console.log(`      Token: ${token.substring(0, 30)}...`);
        console.log(`      Expires: ${expiresAt}, Current: ${currentTime}, TTL: ${expiresAt - currentTime}s`);
        
        // Step 2: IMMEDIATELY use JWT (with minimal delay)
        const leadStartTime = Date.now();
        const leadResponse = await fetch(`${API_BASE}/api/leads`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            lead_name: `JWT Test ${scenarioIndex + 1}-${testRun}`,
            lead_email: `jwt.test.${scenarioIndex}.${testRun}@example.com`
          })
        });
        
        const leadEndTime = Date.now();
        const responseText = await leadResponse.text();
        
        console.log(`      Lead request: ${leadEndTime - leadStartTime}ms`);
        console.log(`      Delay between signin->lead: ${leadStartTime - signinTime}ms`);
        console.log(`      Response status: ${leadResponse.status}`);
        
        let leadData;
        try {
          leadData = JSON.parse(responseText);
        } catch (e) {
          console.log(`      ❌ Invalid JSON response: ${responseText}`);
          continue;
        }
        
        if (leadData.success) {
          console.log(`      ✅ Lead created: ${leadData.data.id}`);
        } else {
          console.log(`      ❌ LEAD CREATION FAILED: ${leadData.error}`);
          console.log(`      🔍 Debug info:`, leadData.debug_info);
          
          // This is the failure we're looking for!
          return {
            scenario: scenario.name,
            testRun,
            error: leadData.error,
            debugInfo: leadData.debug_info,
            token: token.substring(0, 50),
            timing: {
              signinMs: signinTime - startTime,
              leadMs: leadEndTime - leadStartTime,
              delayMs: leadStartTime - signinTime
            }
          };
        }
        
        // Small delay between tests to not overwhelm the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error) {
      console.log(`   ❌ Scenario failed: ${error.message}`);
    }
  }
  
  console.log('\n📊 All scenarios completed successfully - no failures detected');
  return null;
}

// Run the comprehensive test
runComprehensiveJWTTests()
  .then(failure => {
    if (failure) {
      console.log('\n🚨 FAILURE DETECTED:');
      console.log(JSON.stringify(failure, null, 2));
    } else {
      console.log('\n✅ No JWT validation failures detected in comprehensive testing');
    }
  })
  .catch(error => {
    console.error('\n❌ Test execution failed:', error);
  });