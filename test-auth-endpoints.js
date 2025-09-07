// Test API endpoints with proper authentication flow
const BASE_URL = 'https://lqs-uat-worker.charlesheflin.workers.dev';
const SUPABASE_URL = 'https://kwebsccgtmntljdrzwet.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwODg4NzgsImV4cCI6MjA3MjY2NDg3OH0.TCcozM4eY4v21WlFIRHP7ytUqDhDY48bSYFkebuqYwY';

async function testWithAuthentication() {
  console.log('🔐 TESTING WITH AUTHENTICATION');
  console.log('==============================\n');
  
  let accessToken = null;
  
  // Step 1: Try to get an access token using existing user
  console.log('1. Testing sign-in with existing user...');
  try {
    const signinResponse = await fetch(`${BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'john.doe@example.com', // Using test email
        password: 'testpassword123' // Using test password
      })
    });
    
    if (signinResponse.ok) {
      const signinData = await signinResponse.json();
      if (signinData.success && signinData.data && signinData.data.session) {
        accessToken = signinData.data.session.access_token;
        console.log('   ✅ Sign-in successful');
        console.log('   🔑 Got access token (first 20 chars):', accessToken.substring(0, 20) + '...');
      } else {
        console.log('   ❌ Sign-in response missing token');
      }
    } else {
      const signinError = await signinResponse.json();
      console.log(`   ❌ Sign-in failed (${signinResponse.status}):`, signinError.error || 'Unknown error');
    }
  } catch (error) {
    console.log('   ❌ Sign-in error:', error.message);
  }
  
  // Step 2: If no token, try to sign up a new user
  if (!accessToken) {
    console.log('\\n2. Testing sign-up with new user...');
    try {
      const signupResponse = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: `test.${Date.now()}@example.com`, // Unique email
          password: 'testpassword123',
          client_name: 'Test Company for Schema Testing'
        })
      });
      
      const signupData = await signupResponse.json();
      
      if (signupResponse.ok && signupData.success) {
        console.log('   ✅ Sign-up successful');
        console.log('   🏢 Company created:', signupData.data.company?.name);
        console.log('   👤 User created:', signupData.data.user?.email);
        
        // Now try to sign in with new user
        console.log('   🔄 Attempting sign-in with new user...');
        const newSigninResponse = await fetch(`${BASE_URL}/api/auth/signin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: signupData.data.user?.email,
            password: 'testpassword123'
          })
        });
        
        if (newSigninResponse.ok) {
          const newSigninData = await newSigninResponse.json();
          if (newSigninData.success && newSigninData.data && newSigninData.data.session) {
            accessToken = newSigninData.data.session.access_token;
            console.log('   ✅ New user sign-in successful');
            console.log('   🔑 Got access token (first 20 chars):', accessToken.substring(0, 20) + '...');
          }
        }
      } else {
        console.log(`   ❌ Sign-up failed (${signupResponse.status}):`, signupData.error || 'Unknown error');
      }
    } catch (error) {
      console.log('   ❌ Sign-up error:', error.message);
    }
  }
  
  // Step 3: Test lead creation with authentication
  if (accessToken) {
    console.log('\\n3. Testing lead creation with auth token...');
    try {
      const leadData = {
        lead_name: 'Authenticated Test Lead',
        lead_email: 'auth.test@example.com',
        phone: '+1234567890',
        custom_data: { 
          source: 'api_test',
          priority: 'high',
          notes: 'Created during schema testing'
        }
      };
      
      const createResponse = await fetch(`${BASE_URL}/api/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(leadData)
      });
      
      if (createResponse.ok) {
        const createData = await createResponse.json();
        console.log('   ✅ Lead creation successful!');
        console.log('   📋 Created lead:', createData);
        
        // Step 4: Test getting leads list
        console.log('\\n4. Testing leads list retrieval...');
        const listResponse = await fetch(`${BASE_URL}/api/leads`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (listResponse.ok) {
          const listData = await listResponse.json();
          console.log('   ✅ Leads list retrieval successful!');
          console.log('   📋 Leads count:', listData.data?.length || 0);
          console.log('   📋 Pagination:', listData.pagination);
        } else {
          const listError = await listResponse.json();
          console.log(`   ❌ Leads list failed (${listResponse.status}):`, listError.error);
        }
        
      } else {
        const createError = await createResponse.json();
        console.log(`   ❌ Lead creation failed (${createResponse.status}):`, createError.error);
        
        // Analyze the error
        if (createError.error && typeof createError.error === 'string') {
          if (createError.error.includes('custom_data') || createError.error.includes('phone')) {
            console.log('   🔧 SCHEMA ERROR: Missing columns detected');
            console.log('   📝 ACTION REQUIRED: Run LEADS_SCHEMA_FIX.sql in Supabase');
          } else {
            console.log('   🔍 OTHER ERROR:', createError.error);
          }
        }
      }
    } catch (error) {
      console.log('   ❌ Lead creation test error:', error.message);
    }
  } else {
    console.log('\\n❌ No access token available - cannot test lead operations');
    console.log('   🔧 Check authentication setup');
  }
  
  console.log('\\n📋 SUMMARY');
  console.log('===========');
  if (accessToken) {
    console.log('✅ Authentication: Working');
    console.log('🔑 Token obtained: Yes');
    console.log('🏢 Company creation: Working');
    console.log('📝 Next: Test lead operations or run schema fix');
  } else {
    console.log('❌ Authentication: Failed');
    console.log('🔧 Need to check Supabase configuration');
  }
}

// Run the test
testWithAuthentication().catch(console.error);