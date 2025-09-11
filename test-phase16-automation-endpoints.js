import axios from 'axios';

const API_BASE_URL = 'https://lqs-uat-worker.charlesheflin.workers.dev/api';
const UAT_BASE_URL = 'https://762ff952.lqs-main-security-fix-uat.pages.dev';

const generateTestUser = () => ({
  email: `phase16-api-test-${Date.now()}@lqs-uat.com`,
  password: 'TestPassword123!',
  companyName: 'Phase 16 API Test Company'
});

async function testAutomationEndpoints() {
  console.log('🧪 Testing Phase 16 Automation API Endpoints...\n');
  
  const testUser = generateTestUser();
  console.log('👤 Test user:', { email: testUser.email, companyName: testUser.companyName });
  
  try {
    console.log('📝 Step 1: Creating test user...');
    const signupResponse = await axios.post(`${API_BASE_URL}/auth/signup`, {
      email: testUser.email,
      password: testUser.password,
      companyName: testUser.companyName
    });
    
    if (!signupResponse.data.success) {
      throw new Error('Failed to create test user: ' + signupResponse.data.error);
    }
    console.log('✅ Test user created successfully');
    
    console.log('📝 Step 2: Signing in to get auth token...');
    const signinResponse = await axios.post(`${API_BASE_URL}/auth/signin`, {
      email: testUser.email,
      password: testUser.password
    });
    
    if (!signinResponse.data.success) {
      throw new Error('Failed to sign in: ' + signinResponse.data.error);
    }
    
    const authToken = signinResponse.data.data.session.access_token;
    console.log('✅ Successfully signed in and obtained auth token');
    
    console.log('📝 Step 3: Creating test client...');
    const clientResponse = await axios.post(`${API_BASE_URL}/clients`, {
      name: `Phase 16 Test Client ${Date.now()}`,
      primary_contact_name: 'John Doe',
      primary_contact_email: 'john@phase16test.com',
      primary_contact_phone: '+1555PHASE16'
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!clientResponse.data.success) {
      throw new Error('Failed to create test client: ' + clientResponse.data.error);
    }
    
    const clientId = clientResponse.data.data.id;
    console.log('✅ Test client created successfully:', clientId);
    
    console.log('📝 Step 4: Creating test lead...');
    const leadResponse = await axios.post(`${API_BASE_URL}/clients/${clientId}/leads`, {
      name: `Phase 16 Test Lead ${Date.now()}`,
      email: 'testlead@phase16.com',
      phone: '+1555LEAD16',
      status: 'new'
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!leadResponse.data.success) {
      throw new Error('Failed to create test lead: ' + leadResponse.data.error);
    }
    
    const leadId = leadResponse.data.data.id;
    console.log('✅ Test lead created successfully:', leadId);
    
    console.log('📝 Step 5: Testing pause automation endpoint...');
    const pauseResponse = await axios.post(`${API_BASE_URL}/leads/${leadId}/pause`, {}, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!pauseResponse.data.success) {
      throw new Error('Failed to pause lead automation: ' + pauseResponse.data.error);
    }
    
    console.log('✅ Successfully paused lead automation');
    console.log('📊 Updated lead data:', {
      automation_status: pauseResponse.data.data.automation_status,
      last_action_type: pauseResponse.data.data.last_action_type,
      last_action_timestamp: pauseResponse.data.data.last_action_timestamp
    });
    
    console.log('📝 Step 6: Testing resume automation endpoint...');
    const resumeResponse = await axios.post(`${API_BASE_URL}/leads/${leadId}/resume`, {}, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!resumeResponse.data.success) {
      throw new Error('Failed to resume lead automation: ' + resumeResponse.data.error);
    }
    
    console.log('✅ Successfully resumed lead automation');
    console.log('📊 Updated lead data:', {
      automation_status: resumeResponse.data.data.automation_status,
      last_action_type: resumeResponse.data.data.last_action_type,
      last_action_timestamp: resumeResponse.data.data.last_action_timestamp
    });
    
    console.log('📝 Step 7: Testing review-bin endpoint...');
    const reviewResponse = await axios.post(`${API_BASE_URL}/leads/${leadId}/review-bin`, {}, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!reviewResponse.data.success) {
      throw new Error('Failed to move lead to review bin: ' + reviewResponse.data.error);
    }
    
    console.log('✅ Successfully moved lead to review bin');
    console.log('📊 Updated lead data:', {
      automation_status: reviewResponse.data.data.automation_status,
      last_action_type: reviewResponse.data.data.last_action_type,
      last_action_timestamp: reviewResponse.data.data.last_action_timestamp
    });
    
    console.log('📝 Step 8: Creating additional leads for bulk action testing...');
    const additionalLeads = [];
    
    for (let i = 2; i <= 4; i++) {
      const additionalLeadResponse = await axios.post(`${API_BASE_URL}/clients/${clientId}/leads`, {
        name: `Phase 16 Bulk Test Lead ${i} ${Date.now()}`,
        email: `bulklead${i}@phase16.com`,
        phone: `+1555BULK${i}`,
        status: 'new'
      }, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!additionalLeadResponse.data.success) {
        throw new Error(`Failed to create additional lead ${i}: ` + additionalLeadResponse.data.error);
      }
      
      additionalLeads.push(additionalLeadResponse.data.data.id);
    }
    
    console.log('✅ Created 3 additional leads for bulk testing');
    
    console.log('📝 Step 9: Testing bulk action endpoint...');
    const bulkActionResponse = await axios.post(`${API_BASE_URL}/leads/bulk-action`, {
      action: 'pause',
      leadIds: additionalLeads
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!bulkActionResponse.data.success) {
      throw new Error('Failed to perform bulk action: ' + bulkActionResponse.data.error);
    }
    
    console.log('✅ Successfully performed bulk pause action');
    console.log('📊 Bulk action results:', {
      action: bulkActionResponse.data.data.action,
      processed_count: bulkActionResponse.data.data.processed_count,
      message: bulkActionResponse.data.message
    });
    
    console.log('📝 Step 10: Testing multi-tenant security...');
    const unauthorizedUser = generateTestUser();
    
    const unauthorizedSignupResponse = await axios.post(`${API_BASE_URL}/auth/signup`, {
      email: unauthorizedUser.email,
      password: unauthorizedUser.password,
      companyName: unauthorizedUser.companyName
    });
    
    const unauthorizedSigninResponse = await axios.post(`${API_BASE_URL}/auth/signin`, {
      email: unauthorizedUser.email,
      password: unauthorizedUser.password
    });
    
    const unauthorizedToken = unauthorizedSigninResponse.data.data.session.access_token;
    
    try {
      await axios.post(`${API_BASE_URL}/leads/${leadId}/pause`, {}, {
        headers: {
          'Authorization': `Bearer ${unauthorizedToken}`,
          'Content-Type': 'application/json'
        }
      });
      throw new Error('Security test failed: Unauthorized user was able to access lead');
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log('✅ Multi-tenant security working correctly - unauthorized access denied');
      } else {
        throw err;
      }
    }
    
    console.log('\n🎉 All Phase 16 automation endpoint tests passed successfully!');
    console.log('\n📊 Test Summary:');
    console.log('✅ Individual pause automation endpoint');
    console.log('✅ Individual resume automation endpoint');
    console.log('✅ Individual review-bin endpoint');
    console.log('✅ Bulk action endpoint');
    console.log('✅ Multi-tenant security filtering');
    console.log('✅ Authentication and authorization');
    
  } catch (error) {
    console.error('\n❌ Phase 16 automation endpoint test failed:');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

testAutomationEndpoints();
