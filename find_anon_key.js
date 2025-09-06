// Test script to find the correct anon key for the project
const API_BASE = 'https://lqs-uat-worker.charlesheflin.workers.dev';

async function testAnonKey() {
  // Potential anon key based on standard Supabase pattern
  // Typically anon keys have role:"anon" instead of "service_role"
  const potentialAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODg4NzgsImV4cCI6MjA3MjY2NDg3OH0.xyz'; // Placeholder
  
  console.log('🔍 TESTING ANON KEY DISCOVERY');
  
  // First, let's sign in to get a valid user JWT
  console.log('\n1. Signing in to get user JWT...');
  const signinResponse = await fetch(`${API_BASE}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'uat-owner-a@example.com',
      password: 'TestPassword123!'
    })
  });
  
  if (!signinResponse.ok) {
    console.log('❌ Signin failed:', await signinResponse.text());
    return;
  }
  
  const signinData = await signinResponse.json();
  const userJWT = signinData.data.session.access_token;
  console.log(`✅ Got user JWT: ${userJWT.substring(0, 30)}...`);
  
  // Test direct Supabase validation with different keys
  console.log('\n2. Testing Supabase /auth/v1/user with SERVICE_ROLE_KEY...');
  const serviceKeyResponse = await fetch('https://kwebsccgtmntljdrzwet.supabase.co/auth/v1/user', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${userJWT}`,
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw'
    }
  });
  
  console.log(`Service key result: ${serviceKeyResponse.status} ${serviceKeyResponse.statusText}`);
  if (!serviceKeyResponse.ok) {
    console.log('❌ SERVICE_ROLE_KEY gives 403 - confirming the issue');
  }
}

testAnonKey().catch(console.error);
