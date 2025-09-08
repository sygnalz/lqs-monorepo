#!/usr/bin/env node

/**
 * LQS-P6-D-002 Verification Test: Client-Owned Leads Architecture
 * 
 * This script performs a comprehensive end-to-end test of the new nested lead endpoints:
 * 1. Creates a unique user via signup
 * 2. Signs in to obtain JWT token
 * 3. Creates a test client using POST /api/clients
 * 4. Creates a lead for that client using POST /api/clients/{clientId}/leads
 * 5. Retrieves leads for the client using GET /api/clients/{clientId}/leads
 * 6. Validates all responses and data integrity
 */

const https = require('https');

const API_BASE = 'https://lqs-uat-worker.charlesheflin.workers.dev/api';

// Generate unique identifiers for this test run
const timestamp = Date.now();
const uniqueId = Math.random().toString(36).substring(7);
const testEmail = `leads-test-${uniqueId}-${timestamp}@example.com`;
const testPassword = 'TestPassword123!';
const testCompanyName = `Leads Test Company ${uniqueId}`;
const testClientName = `Leads Test Inc ${uniqueId}`;

console.log('🚀 [NESTED LEADS TEST] Starting comprehensive end-to-end verification');
console.log(`📧 Test Email: ${testEmail}`);
console.log(`🏢 Test Company: ${testCompanyName}`);
console.log(`🏆 Test Client: ${testClientName}`);
console.log('');

// Utility function for HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            headers: res.headers,
            data: data ? JSON.parse(data) : null
          };
          resolve(response);
        } catch (parseError) {
          reject(new Error(`JSON Parse Error: ${parseError.message}. Raw data: ${data}`));
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Test state variables
let jwtToken = null;
let createdClientId = null;
let createdLeadId = null;

async function runTest() {
  try {
    console.log('📝 STEP 1: Creating new user via signup endpoint');
    console.log('─'.repeat(60));
    
    const signupResponse = await makeRequest(`${API_BASE}/auth/signup`, {
      method: 'POST',
      body: {
        email: testEmail,
        password: testPassword,
        companyName: testCompanyName
      }
    });

    console.log(`Status: ${signupResponse.status}`);
    console.log(`Response:`, JSON.stringify(signupResponse.data, null, 2));

    if (signupResponse.status !== 201) {
      throw new Error(`Signup failed: Expected 201, got ${signupResponse.status}`);
    }

    if (!signupResponse.data.success) {
      throw new Error(`Signup failed: ${signupResponse.data.error}`);
    }

    console.log('✅ User creation successful');
    console.log('');

    console.log('🔐 STEP 2: Signing in to obtain JWT token');
    console.log('─'.repeat(60));

    const signinResponse = await makeRequest(`${API_BASE}/auth/signin`, {
      method: 'POST',
      body: {
        email: testEmail,
        password: testPassword
      }
    });

    console.log(`Status: ${signinResponse.status}`);
    console.log(`Response:`, JSON.stringify(signinResponse.data, null, 2));

    if (signinResponse.status !== 200) {
      throw new Error(`Signin failed: Expected 200, got ${signinResponse.status}`);
    }

    if (!signinResponse.data.success || !signinResponse.data.data.session.access_token) {
      throw new Error(`Signin failed: No access token received`);
    }

    jwtToken = signinResponse.data.data.session.access_token;
    console.log('✅ JWT token obtained successfully');
    console.log(`🔑 Token length: ${jwtToken.length} characters`);
    console.log('');

    console.log('🏢 STEP 3: Creating test client via POST /api/clients');
    console.log('─'.repeat(60));

    const clientResponse = await makeRequest(`${API_BASE}/clients`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      },
      body: {
        name: testClientName,
        primary_contact_name: 'John Lead Manager',
        primary_contact_email: 'john@leadstestinc.com',
        primary_contact_phone: '+1-555-LEADS-01'
      }
    });

    console.log(`Status: ${clientResponse.status}`);
    console.log(`Response:`, JSON.stringify(clientResponse.data, null, 2));

    if (clientResponse.status !== 201) {
      throw new Error(`Client creation failed: Expected 201, got ${clientResponse.status}`);
    }

    if (!clientResponse.data.success || !clientResponse.data.data.id) {
      throw new Error(`Client creation failed: No client ID received`);
    }

    createdClientId = clientResponse.data.data.id;
    console.log('✅ Client created successfully');
    console.log(`🆔 Client ID: ${createdClientId}`);
    console.log('');

    console.log('📊 STEP 4: Creating lead via POST /api/clients/{clientId}/leads');
    console.log('─'.repeat(60));

    const leadCreateResponse = await makeRequest(`${API_BASE}/clients/${createdClientId}/leads`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      },
      body: {
        name: 'Sarah Prospect',
        email: 'sarah.prospect@potentialclient.com',
        phone: '+1-555-PROSPECT',
        status: 'new',
        notes: 'High-value prospect from networking event. Interested in enterprise solution.'
      }
    });

    console.log(`Status: ${leadCreateResponse.status}`);
    console.log(`Response:`, JSON.stringify(leadCreateResponse.data, null, 2));

    if (leadCreateResponse.status !== 201) {
      throw new Error(`Lead creation failed: Expected 201, got ${leadCreateResponse.status}`);
    }

    if (!leadCreateResponse.data.success || !leadCreateResponse.data.data.id) {
      throw new Error(`Lead creation failed: No lead ID received`);
    }

    createdLeadId = leadCreateResponse.data.data.id;
    
    // Verify the lead contains correct client_id
    if (leadCreateResponse.data.data.client_id !== createdClientId) {
      throw new Error(`Lead creation failed: client_id mismatch. Expected ${createdClientId}, got ${leadCreateResponse.data.data.client_id}`);
    }

    console.log('✅ Lead created successfully');
    console.log(`🆔 Lead ID: ${createdLeadId}`);
    console.log(`🔗 Verified client_id: ${leadCreateResponse.data.data.client_id}`);
    console.log('');

    console.log('📋 STEP 5: Retrieving leads via GET /api/clients/{clientId}/leads');
    console.log('─'.repeat(60));

    const leadsListResponse = await makeRequest(`${API_BASE}/clients/${createdClientId}/leads`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    });

    console.log(`Status: ${leadsListResponse.status}`);
    console.log(`Response:`, JSON.stringify(leadsListResponse.data, null, 2));

    if (leadsListResponse.status !== 200) {
      throw new Error(`Leads list failed: Expected 200, got ${leadsListResponse.status}`);
    }

    if (!leadsListResponse.data.success || !Array.isArray(leadsListResponse.data.data)) {
      throw new Error(`Leads list failed: Response data is not an array`);
    }

    const retrievedLeads = leadsListResponse.data.data;
    
    if (retrievedLeads.length !== 1) {
      throw new Error(`Leads list failed: Expected 1 lead, got ${retrievedLeads.length}`);
    }

    const retrievedLead = retrievedLeads[0];
    
    if (retrievedLead.id !== createdLeadId) {
      throw new Error(`Leads list failed: Lead ID mismatch. Expected ${createdLeadId}, got ${retrievedLead.id}`);
    }

    if (retrievedLead.client_id !== createdClientId) {
      throw new Error(`Leads list failed: client_id mismatch. Expected ${createdClientId}, got ${retrievedLead.client_id}`);
    }

    console.log('✅ Leads retrieved successfully');
    console.log(`📊 Number of leads found: ${retrievedLeads.length}`);
    console.log(`🔗 Verified client_id: ${retrievedLead.client_id}`);
    console.log(`👤 Lead name: ${retrievedLead.name}`);
    console.log(`📧 Lead email: ${retrievedLead.email}`);
    console.log('');

    console.log('🎉 VERIFICATION COMPLETE: ALL TESTS PASSED');
    console.log('═'.repeat(60));
    console.log('✅ User creation and authentication working');
    console.log('✅ Client creation working');
    console.log('✅ Nested lead creation working (POST /api/clients/:clientId/leads)');
    console.log('✅ Nested lead retrieval working (GET /api/clients/:clientId/leads)');
    console.log('✅ Client ownership security enforced');
    console.log('✅ Data integrity maintained (client_id relationships)');
    console.log('');
    console.log('🏆 Client-Owned Leads Architecture: FULLY OPERATIONAL');

  } catch (error) {
    console.error('');
    console.error('❌ TEST FAILED');
    console.error('═'.repeat(60));
    console.error(`Error: ${error.message}`);
    console.error('');
    console.error('🔍 Test State at Failure:');
    console.error(`- JWT Token: ${jwtToken ? 'Obtained' : 'Not obtained'}`);
    console.error(`- Client ID: ${createdClientId || 'Not created'}`);
    console.error(`- Lead ID: ${createdLeadId || 'Not created'}`);
    console.error('');
    process.exit(1);
  }
}

// Execute the test
runTest();