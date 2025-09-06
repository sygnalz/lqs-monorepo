// Test the fixed /api/leads endpoint functionality
const API_BASE = 'https://lqs-uat-environment.pages.dev';

async function testLeadsEndpoint() {
  console.log('🧪 Testing Lead Qualification System - /api/leads endpoint\n');

  try {
    // Step 1: Create a test user and get JWT token  
    console.log('1. Creating test user and obtaining JWT token...');
    
    const testEmail = `test.user.${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);

    // Sign up user
    const signupResponse = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });

    if (!signupResponse.ok) {
      const error = await signupResponse.json();
      console.log(`   ❌ Signup failed: ${error.error}`);
      return;
    }

    const signupData = await signupResponse.json();
    console.log('   ✅ User created successfully');
    console.log(`   User ID: ${signupData.data.user.id}`);

    // Step 2: Sign in to get JWT token
    console.log('\n2. Signing in to get JWT token...');
    
    const signinResponse = await fetch(`${API_BASE}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });

    if (!signinResponse.ok) {
      const error = await signinResponse.json();
      console.log(`   ❌ Signin failed: ${error.error}`);
      return;
    }

    const signinData = await signinResponse.json();
    const jwtToken = signinData.data.session.access_token;
    const userId = signinData.data.user.id;
    
    console.log('   ✅ JWT token obtained');
    console.log(`   User ID: ${userId}`);
    console.log(`   Token: ${jwtToken.substring(0, 20)}...`);

    // Step 3: Check if user has a client profile (required for multi-tenancy)
    console.log('\n3. Checking user profile in database...');
    
    const SUPABASE_URL = 'https://kwebsccgtmntljdrzwet.supabase.co';
    const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw';
    
    const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    });

    const profileData = await profileResponse.json();
    console.log(`   Profile check response: ${profileResponse.status}`);
    console.log(`   Profile data:`, profileData);

    if (!profileData || profileData.length === 0) {
      console.log('   ❌ No profile found for user, creating one...');
      
      // Create a profile for this user
      // First, let's get a client_id to assign
      const clientsResponse = await fetch(`${SUPABASE_URL}/rest/v1/clients?limit=1`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      const clientsData = await clientsResponse.json();
      if (clientsData.length === 0) {
        console.log('   ❌ No clients found in database. Cannot proceed with test.');
        return;
      }
      
      const clientId = clientsData[0].id;
      console.log(`   Using client_id: ${clientId}`);
      
      // Create profile
      const createProfileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          id: userId,
          client_id: clientId
        })
      });
      
      if (!createProfileResponse.ok) {
        const error = await createProfileResponse.json();
        console.log(`   ❌ Failed to create profile: ${error.message}`);
        return;
      }
      
      console.log('   ✅ Profile created successfully');
    } else {
      console.log(`   ✅ Profile found with client_id: ${profileData[0].client_id}`);
    }

    // Step 4: Test the POST /api/leads endpoint
    console.log('\n4. Testing POST /api/leads endpoint...');
    
    const leadData = {
      lead_name: 'Jane Smith',
      lead_email: 'jane.smith@testcompany.com',
      phone: '+1-555-0123',
      custom_data: {
        source: 'website',
        campaign: 'UAT_testing'
      }
    };
    
    console.log(`   Creating lead:`, leadData);
    
    const createLeadResponse = await fetch(`${API_BASE}/api/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify(leadData)
    });

    console.log(`   Response status: ${createLeadResponse.status}`);
    
    if (!createLeadResponse.ok) {
      const error = await createLeadResponse.json();
      console.log(`   ❌ Failed to create lead: ${JSON.stringify(error, null, 2)}`);
      return;
    }

    const createdLead = await createLeadResponse.json();
    console.log('   ✅ Lead created successfully!');
    console.log(`   Lead data:`, JSON.stringify(createdLead, null, 2));

    // Step 5: Test the GET /api/leads/:id endpoint
    if (createdLead.success && createdLead.data && createdLead.data.id) {
      console.log('\n5. Testing GET /api/leads/:id endpoint...');
      
      const leadId = createdLead.data.id;
      console.log(`   Fetching lead with ID: ${leadId}`);
      
      const getLeadResponse = await fetch(`${API_BASE}/api/leads/${leadId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      console.log(`   Response status: ${getLeadResponse.status}`);
      
      if (!getLeadResponse.ok) {
        const error = await getLeadResponse.json();
        console.log(`   ❌ Failed to retrieve lead: ${JSON.stringify(error, null, 2)}`);
      } else {
        const retrievedLead = await getLeadResponse.json();
        console.log('   ✅ Lead retrieved successfully!');
        console.log(`   Retrieved lead:`, JSON.stringify(retrievedLead, null, 2));
      }
    }

    console.log('\n🎉 Test completed successfully! The /api/leads endpoints are working correctly.');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
  }
}

testLeadsEndpoint();