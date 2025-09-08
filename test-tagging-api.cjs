const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = 'https://lqs-uat-worker.charlesheflin.workers.dev';
const TIMEOUT = 30000;

// Test helper functions
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: TIMEOUT
    };

    const requestModule = url.protocol === 'https:' ? https : http;
    const req = requestModule.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonBody
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

function log(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

// Test execution
async function runTaggingAPITests() {
  console.log('='.repeat(80));
  console.log('LEAD TAGGING API - END-TO-END VERIFICATION TEST');
  console.log('='.repeat(80));
  
  let jwt = null;
  let tagId = null;
  let leadId = null;
  let clientId = null;
  
  try {
    // Test 1: Create new user and sign in to get JWT
    log('TEST 1: Creating new user and signing in...');
    const timestamp = Date.now();
    const testEmail = `testuser_${timestamp}@example.com`;
    const testPassword = 'TestPassword123!';
    const testCompany = `Test Company ${timestamp}`;

    // Create user
    log('Creating new user account...');
    const signupResponse = await makeRequest('POST', '/api/auth/signup', {
      email: testEmail,
      password: testPassword,
      companyName: testCompany
    });

    log(`Signup Response Status: ${signupResponse.statusCode}`);
    assert(signupResponse.statusCode === 201, `Expected 201, got ${signupResponse.statusCode}`);
    assert(signupResponse.body.success === true, 'Signup should be successful');
    log('✅ User account created successfully');

    // Sign in
    log('Signing in to get JWT...');
    const signinResponse = await makeRequest('POST', '/api/auth/signin', {
      email: testEmail,
      password: testPassword
    });

    log(`Signin Response Status: ${signinResponse.statusCode}`);
    assert(signinResponse.statusCode === 200, `Expected 200, got ${signinResponse.statusCode}`);
    assert(signinResponse.body.success === true, 'Signin should be successful');
    assert(signinResponse.body.data.session.access_token, 'JWT token should be present');
    
    jwt = signinResponse.body.data.session.access_token;
    log('✅ JWT token obtained successfully');

    // Test 2: GET /api/tags - Verify 168 tags and store one tag_id
    log('\nTEST 2: Testing GET /api/tags endpoint...');
    const tagsResponse = await makeRequest('GET', '/api/tags', null, {
      'Authorization': `Bearer ${jwt}`
    });

    log(`Tags Response Status: ${tagsResponse.statusCode}`);
    assert(tagsResponse.statusCode === 200, `Expected 200, got ${tagsResponse.statusCode}`);
    assert(tagsResponse.body.success === true, 'Tags request should be successful');
    assert(Array.isArray(tagsResponse.body.data), 'Response data should be an array');
    assert(tagsResponse.body.data.length === 168, `Expected 168 tags, got ${tagsResponse.body.data.length}`);
    
    // Verify tags are ordered by step_id, then id
    const tags = tagsResponse.body.data;
    for (let i = 1; i < tags.length; i++) {
      const prev = tags[i - 1];
      const curr = tags[i];
      const prevStepId = prev.step_id || '';
      const currStepId = curr.step_id || '';
      
      // Check ordering: step_id ASC, then id ASC
      if (prevStepId !== currStepId) {
        assert(prevStepId <= currStepId, `Tags not ordered by step_id: ${prevStepId} > ${currStepId}`);
      } else {
        assert(prev.id <= curr.id, `Tags not ordered by id within same step_id: ${prev.id} > ${curr.id}`);
      }
    }
    
    // Store a tag_id for later use
    tagId = tags[0].id;
    log(`✅ Retrieved 168 tags successfully, stored tag_id: ${tagId}`);

    // Test 3: Create a client and lead for tagging tests
    log('\nTEST 3: Creating client and lead for tagging tests...');
    
    // Create client
    const clientResponse = await makeRequest('POST', '/api/clients', {
      name: `Test Client ${timestamp}`,
      primary_contact_name: 'Test Contact',
      primary_contact_email: `contact_${timestamp}@example.com`
    }, {
      'Authorization': `Bearer ${jwt}`
    });

    log(`Client Response Status: ${clientResponse.statusCode}`);
    assert(clientResponse.statusCode === 201, `Expected 201, got ${clientResponse.statusCode}`);
    assert(clientResponse.body.success === true, 'Client creation should be successful');
    
    clientId = clientResponse.body.data.id;
    log(`✅ Client created successfully with ID: ${clientId}`);

    // Create lead
    const leadResponse = await makeRequest('POST', `/api/clients/${clientId}/leads`, {
      name: `Test Lead ${timestamp}`,
      email: `lead_${timestamp}@example.com`,
      phone: '+1234567890',
      status: 'new',
      notes: 'Test lead for tagging API verification'
    }, {
      'Authorization': `Bearer ${jwt}`
    });

    log(`Lead Response Status: ${leadResponse.statusCode}`);
    assert(leadResponse.statusCode === 201, `Expected 201, got ${leadResponse.statusCode}`);
    assert(leadResponse.body.success === true, 'Lead creation should be successful');
    
    leadId = leadResponse.body.data.id;
    log(`✅ Lead created successfully with ID: ${leadId}`);

    // Test 4: Success Case - POST /api/leads/:leadId/tags
    log('\nTEST 4: Testing POST /api/leads/:leadId/tags (Success Case)...');
    const tagApplyResponse = await makeRequest('POST', `/api/leads/${leadId}/tags`, {
      tag_id: tagId
    }, {
      'Authorization': `Bearer ${jwt}`
    });

    log(`Tag Apply Response Status: ${tagApplyResponse.statusCode}`);
    assert(tagApplyResponse.statusCode === 201, `Expected 201, got ${tagApplyResponse.statusCode}`);
    assert(tagApplyResponse.body.success === true, 'Tag application should be successful');
    assert(tagApplyResponse.body.data.lead_id == leadId, 'Response should contain correct lead_id');
    assert(tagApplyResponse.body.data.tag_id == tagId, 'Response should contain correct tag_id');
    log('✅ Tag applied to lead successfully');

    // Test 5: Failure Case (Conflict) - Apply same tag again
    log('\nTEST 5: Testing POST /api/leads/:leadId/tags (Duplicate/Conflict Case)...');
    const tagConflictResponse = await makeRequest('POST', `/api/leads/${leadId}/tags`, {
      tag_id: tagId
    }, {
      'Authorization': `Bearer ${jwt}`
    });

    log(`Tag Conflict Response Status: ${tagConflictResponse.statusCode}`);
    assert(tagConflictResponse.statusCode === 409, `Expected 409, got ${tagConflictResponse.statusCode}`);
    assert(tagConflictResponse.body.success === false, 'Duplicate tag application should fail');
    assert(tagConflictResponse.body.error.includes('already applied') || tagConflictResponse.body.error.includes('duplicate'), 'Error message should indicate duplicate');
    log('✅ Duplicate tag application correctly rejected with 409 Conflict');

    // Test 6: Failure Case (Not Found) - Non-existent leadId
    log('\nTEST 6: Testing POST /api/leads/:leadId/tags (Non-existent Lead)...');
    const nonExistentLeadId = '00000000-0000-0000-0000-000000000000'; // Valid UUID format but non-existent
    const tagNotFoundResponse = await makeRequest('POST', `/api/leads/${nonExistentLeadId}/tags`, {
      tag_id: tagId
    }, {
      'Authorization': `Bearer ${jwt}`
    });

    log(`Tag Not Found Response Status: ${tagNotFoundResponse.statusCode}`);
    if (tagNotFoundResponse.statusCode !== 404) {
      log('Response body for debugging:', tagNotFoundResponse.body);
    }
    assert(tagNotFoundResponse.statusCode === 404, `Expected 404, got ${tagNotFoundResponse.statusCode}`);
    assert(tagNotFoundResponse.body.success === false, 'Non-existent lead tagging should fail');
    assert(tagNotFoundResponse.body.error.includes('not found'), 'Error message should indicate lead not found');
    log('✅ Non-existent lead correctly rejected with 404 Not Found');

    // Test 7: Additional validation - Authentication required
    log('\nTEST 7: Testing authentication requirement...');
    const unauthResponse = await makeRequest('GET', '/api/tags');
    
    log(`Unauthenticated Response Status: ${unauthResponse.statusCode}`);
    assert(unauthResponse.statusCode === 401, `Expected 401, got ${unauthResponse.statusCode}`);
    assert(unauthResponse.body.success === false, 'Unauthenticated request should fail');
    log('✅ Authentication requirement properly enforced');

    console.log('\n' + '='.repeat(80));
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
    console.log('='.repeat(80));
    
    // Test Summary
    console.log('\nTEST SUMMARY:');
    console.log('✅ User Creation and Authentication - PASSED');
    console.log('✅ GET /api/tags (168 tags, proper ordering) - PASSED');
    console.log('✅ Client and Lead Creation - PASSED');
    console.log('✅ POST /api/leads/:leadId/tags (Success Case) - PASSED');
    console.log('✅ POST /api/leads/:leadId/tags (409 Conflict) - PASSED');
    console.log('✅ POST /api/leads/:leadId/tags (404 Not Found) - PASSED');
    console.log('✅ Authentication Requirement - PASSED');
    console.log('\nAll lead tagging API endpoints are working correctly! 🚀');

  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ TEST FAILED!');
    console.error('='.repeat(80));
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  runTaggingAPITests().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { runTaggingAPITests };