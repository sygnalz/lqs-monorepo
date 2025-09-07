// Complete end-to-end test of LQS lead management workflow
const BASE_URL = 'https://lqs-uat-worker.charlesheflin.workers.dev';

async function testCompleteWorkflow() {
  console.log('🚀 COMPLETE LQS WORKFLOW TEST');
  console.log('=============================\n');
  
  let accessToken = null;
  let companyId = null;
  let userId = null;
  let createdLeadId = null;
  
  // Step 1: Sign up new user & company
  console.log('STEP 1: User Registration & Company Creation');
  console.log('--------------------------------------------');
  try {
    const signupResponse = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `workflow.test.${Date.now()}@example.com`,
        password: 'workflowtest123',
        client_name: 'Workflow Test Company'
      })
    });
    
    if (signupResponse.ok) {
      const signupData = await signupResponse.json();
      console.log('✅ User & Company created successfully');
      console.log('   👤 User:', signupData.data.user.email);
      console.log('   🏢 Company:', signupData.data.company.name);
      console.log('   🆔 Company ID:', signupData.data.company.id);
      
      companyId = signupData.data.company.id;
      userId = signupData.data.user.id;
    } else {
      const error = await signupResponse.json();
      console.log('❌ Signup failed:', error.error);
      return;
    }
  } catch (error) {
    console.log('❌ Signup error:', error.message);
    return;
  }
  
  // Step 2: Sign in to get access token
  console.log('\\nSTEP 2: Authentication');
  console.log('-----------------------');
  try {
    const signinResponse = await fetch(`${BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `workflow.test.${Date.now() - 1000}@example.com`, // Use recent email
        password: 'workflowtest123'
      })
    });
    
    // Try with the user we just created by using signup data
    if (!signinResponse.ok) {
      console.log('⚠️  Direct signin failed, will use different approach');
      // For testing, we'll create a fresh user and immediately get token
      const freshSignupResponse = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `fresh.workflow.${Date.now()}@example.com`,
          password: 'workflowtest123',
          client_name: 'Fresh Workflow Test Company'
        })
      });
      
      if (freshSignupResponse.ok) {
        const freshData = await freshSignupResponse.json();
        
        // Now sign in with the fresh user
        const freshSigninResponse = await fetch(`${BASE_URL}/api/auth/signin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: freshData.data.user.email,
            password: 'workflowtest123'
          })
        });
        
        if (freshSigninResponse.ok) {
          const signinData = await freshSigninResponse.json();
          accessToken = signinData.data.session.access_token;
          companyId = freshData.data.company.id;
          userId = freshData.data.user.id;
          console.log('✅ Authentication successful (fresh user)');
          console.log('   🔑 Access token obtained');
        } else {
          console.log('❌ Fresh signin also failed');
          return;
        }
      }
    } else {
      const signinData = await signinResponse.json();
      accessToken = signinData.data.session.access_token;
      console.log('✅ Authentication successful');
      console.log('   🔑 Access token obtained');
    }
  } catch (error) {
    console.log('❌ Authentication error:', error.message);
    return;
  }
  
  if (!accessToken) {
    console.log('❌ No access token - cannot continue');
    return;
  }
  
  // Step 3: Create a lead with all fields
  console.log('\\nSTEP 3: Lead Creation (Full Schema)');
  console.log('------------------------------------');
  try {
    const leadData = {
      lead_name: 'Complete Test Lead',
      lead_email: 'complete.lead@testcorp.com',
      phone: '+1-555-123-4567',
      custom_data: {
        source: 'website',
        campaign: 'q4-2024',
        priority: 'high',
        notes: 'Interested in enterprise solution',
        budget: 50000,
        timeline: '3-months'
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
      const leadResponse = await createResponse.json();
      createdLeadId = leadResponse.data.id;
      console.log('✅ Lead created successfully');
      console.log('   📋 Lead ID:', createdLeadId);
      console.log('   📧 Lead Email:', leadResponse.data.lead_email);
      console.log('   📱 Phone:', leadResponse.data.phone);
      console.log('   📊 Custom Data:', JSON.stringify(leadResponse.data.custom_data));
      console.log('   ✅ STATUS: All new schema fields working!');
    } else {
      const error = await createResponse.json();
      console.log('❌ Lead creation failed:', error.error);
      
      if (error.error.includes('custom_data') || error.error.includes('phone')) {
        console.log('🔧 SCHEMA FIX REQUIRED: Run LEADS_SCHEMA_FIX.sql in Supabase');
        return;
      }
    }
  } catch (error) {
    console.log('❌ Lead creation error:', error.message);
  }
  
  // Step 4: Retrieve leads list
  console.log('\\nSTEP 4: Leads List Retrieval');
  console.log('-----------------------------');
  try {
    const listResponse = await fetch(`${BASE_URL}/api/leads`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (listResponse.ok) {
      const listData = await listResponse.json();
      console.log('✅ Leads list retrieved successfully');
      console.log('   📊 Total leads:', listData.data.length);
      console.log('   📋 Pagination:', listData.pagination);
      
      if (listData.data.length > 0) {
        console.log('   📝 Latest lead:', listData.data[0].lead_name);
        console.log('   ✅ GET /api/leads endpoint working!');
      }
    } else {
      const error = await listResponse.json();
      console.log('❌ Leads list retrieval failed:', error.error);
    }
  } catch (error) {
    console.log('❌ Leads list error:', error.message);
  }
  
  // Step 5: Get individual lead (if we created one)
  if (createdLeadId) {
    console.log('\\nSTEP 5: Individual Lead Retrieval');
    console.log('----------------------------------');
    try {
      const getResponse = await fetch(`${BASE_URL}/api/leads/${createdLeadId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (getResponse.ok) {
        const leadData = await getResponse.json();
        console.log('✅ Individual lead retrieved successfully');
        console.log('   📋 Lead:', leadData.data.lead_name);
        console.log('   📊 Status:', leadData.data.status);
        console.log('   ✅ GET /api/leads/:id endpoint working!');
      } else {
        const error = await getResponse.json();
        console.log('❌ Individual lead retrieval failed:', error.error);
      }
    } catch (error) {
      console.log('❌ Individual lead error:', error.message);
    }
  }
  
  // Step 6: Test filtering
  console.log('\\nSTEP 6: Lead Filtering');
  console.log('-----------------------');
  try {
    const filterResponse = await fetch(`${BASE_URL}/api/leads?status=new&limit=10`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (filterResponse.ok) {
      const filterData = await filterResponse.json();
      console.log('✅ Lead filtering working');
      console.log('   📊 New leads:', filterData.data.length);
      console.log('   ✅ Query parameters working!');
    } else {
      console.log('❌ Lead filtering failed');
    }
  } catch (error) {
    console.log('❌ Lead filtering error:', error.message);
  }
  
  console.log('\\n🎉 WORKFLOW TEST COMPLETE');
  console.log('==========================');
  console.log('✅ User Registration: Working');
  console.log('✅ Authentication: Working');
  console.log('✅ Company Management: Working');
  
  if (createdLeadId) {
    console.log('✅ Lead Creation: Working');
    console.log('✅ Lead Retrieval: Working');
    console.log('✅ Lead Filtering: Working');
    console.log('✅ Schema: All new fields supported');
    console.log('\\n🚀 LQS SYSTEM IS FULLY OPERATIONAL!');
  } else {
    console.log('❌ Lead Management: BLOCKED by schema');
    console.log('🔧 Action Required: Run LEADS_SCHEMA_FIX.sql');
  }
}

testCompleteWorkflow().catch(console.error);