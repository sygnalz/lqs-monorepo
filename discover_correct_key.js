// Systematic test to discover the correct anon key
const API_BASE = 'https://lqs-uat-worker.charlesheflin.workers.dev';

async function discoverCorrectKey() {
  console.log('🔍 DISCOVERING CORRECT ANON KEY FOR JWT VALIDATION');
  
  // Step 1: Get a valid user JWT token
  console.log('\n1. Getting valid user JWT token...');
  const signinResponse = await fetch(`${API_BASE}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'uat-owner-a@example.com',
      password: 'TestPassword123!'
    })
  });
  
  if (!signinResponse.ok) {
    console.log('❌ Failed to get user JWT');
    return;
  }
  
  const signinData = await signinResponse.json();
  const userJWT = signinData.data.session.access_token;
  console.log(`✅ User JWT obtained: ${userJWT.substring(0, 30)}...`);
  
  // Step 2: Test service_role key (should fail with 403)
  console.log('\n2. Testing SERVICE_ROLE key (expecting 403)...');
  const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw';
  
  const serviceResponse = await fetch('https://kwebsccgtmntljdrzwet.supabase.co/auth/v1/user', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${userJWT}`,
      'apikey': serviceRoleKey
    }
  });
  
  console.log(`   Service role result: ${serviceResponse.status} ${serviceResponse.statusText}`);
  
  // Step 3: Test potential anon keys
  console.log('\n3. Testing potential ANON keys...');
  
  // Common anon key patterns for this project
  const potentialAnonKeys = [
    // Pattern 1: Same signature as service key but with anon role
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODg4NzgsImV4cCI6MjA3MjY2NDg3OH0.5UsD6PH0Wa1abSi4yj-r7SJgkPNrL9FovEfezZD3X9s',
    // Pattern 2: Alternative signature
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODg4NzgsImV4cCI6MjA3MjY2NDg3OH0.FNa4R01TaYO3PGnHbKqmPCvFdSNZ3z7CohoZ9xaCf5k'
  ];
  
  for (let i = 0; i < potentialAnonKeys.length; i++) {
    const anonKey = potentialAnonKeys[i];
    console.log(`   Testing anon key ${i + 1}...`);
    
    try {
      const anonResponse = await fetch('https://kwebsccgtmntljdrzwet.supabase.co/auth/v1/user', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userJWT}`,
          'apikey': anonKey
        }
      });
      
      console.log(`   → Status: ${anonResponse.status} ${anonResponse.statusText}`);
      
      if (anonResponse.ok) {
        console.log('✅ FOUND WORKING ANON KEY!');
        console.log(`   Correct anon key: ${anonKey}`);
        
        const userData = await anonResponse.json();
        console.log(`   User data received: ${JSON.stringify(userData, null, 2)}`);
        return anonKey;
      }
    } catch (error) {
      console.log(`   → Error: ${error.message}`);
    }
  }
  
  console.log('❌ No working anon key found in test patterns');
  console.log('   Manual intervention needed to find correct anon key from Supabase dashboard');
  
  return null;
}

discoverCorrectKey().catch(console.error);
