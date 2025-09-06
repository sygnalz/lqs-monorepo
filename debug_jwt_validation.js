// Debug JWT validation to identify the issue
async function debugJWTValidation() {
  console.log('🔍 DEBUGGING JWT VALIDATION ISSUE\n');
  
  const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw';
  
  // Let me first get a fresh JWT token
  console.log('1. Obtaining fresh JWT token...');
  const signinResponse = await fetch('https://lqs-uat-worker.charlesheflin.workers.dev/api/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'final.test.user.1757191228@example.com',
      password: 'TestPassword123!'
    })
  });
  
  if (!signinResponse.ok) {
    console.log('❌ Signin failed');
    return;
  }
  
  const signinData = await signinResponse.json();
  const token = signinData.data.session.access_token;
  console.log(`✅ Token obtained: ${token.substring(0, 30)}...`);
  
  // Test validation with SERVICE_KEY (current incorrect approach)
  console.log('\n2. Testing validation with SERVICE_KEY (current approach)...');
  const serviceKeyTest = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/auth/v1/user`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': SERVICE_KEY
    }
  });
  
  console.log(`Status: ${serviceKeyTest.status}`);
  if (!serviceKeyTest.ok) {
    const error = await serviceKeyTest.text();
    console.log(`❌ Service key validation failed: ${error}`);
  } else {
    console.log('✅ Service key validation succeeded');
  }
  
  // Let's try without any apikey header (Supabase should validate just with Authorization)
  console.log('\n3. Testing validation without apikey header...');
  const noApikeyTest = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/auth/v1/user`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  console.log(`Status: ${noApikeyTest.status}`);
  if (!noApikeyTest.ok) {
    const error = await noApikeyTest.text();
    console.log(`❌ No apikey validation failed: ${error}`);
  } else {
    console.log('✅ No apikey validation succeeded');
    const userData = await noApikeyTest.json();
    console.log(`User ID: ${userData.id}`);
  }
  
  // Let's also check what the anon key should be by looking at typical Supabase patterns
  // Supabase anon keys typically have role: "anon"
  console.log('\n4. Checking if we need anon key instead of service key...');
  
  // Decode the service key to check structure
  try {
    const serviceKeyPayload = JSON.parse(atob(SERVICE_KEY.split('.')[1]));
    console.log('Service key payload:', serviceKeyPayload);
  } catch (e) {
    console.log('Could not decode service key');
  }
}

debugJWTValidation();