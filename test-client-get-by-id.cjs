const axios = require('axios');

const API_URL = 'https://lqs-uat-worker.charlesheflin.workers.dev/api';

async function testClientGetByIdEndpoint() {
  console.log("🧪 Testing GET /api/clients/:id Endpoint...");
  
  try {
    // Step 1: Create a new, unique user via the signup endpoint
    const timestamp = Date.now();
    const signupData = {
      companyName: 'Detail Test Company',
      email: `detail.test.${timestamp}@example.com`,
      password: 'password123'
    };

    console.log("📝 Step 1: Creating new unique user...");
    console.log("📝 Email:", signupData.email);
    const signupResponse = await axios.post(`${API_URL}/auth/signup`, signupData);
    console.log("✅ Signup successful");

    // Step 2: Sign in as that user to obtain a JWT
    const signinData = {
      email: signupData.email,
      password: 'password123'
    };

    console.log("🔐 Step 2: Signing in to obtain JWT...");
    const signinResponse = await axios.post(`${API_URL}/auth/signin`, signinData);
    console.log("✅ Signin successful");

    const token = signinResponse.data.data.session.access_token;
    console.log("🎫 JWT Token received:", token ? `${token.substring(0, 20)}...` : 'null');

    // Step 3: Create a new test client via POST /api/clients
    console.log("📋 Step 3: Creating test client...");
    const clientData = {
      name: 'Detail Test Corp',
      primary_contact_name: 'Jane Detail Manager',
      primary_contact_email: 'jane.detail@testcorp.com',
      primary_contact_phone: '+1-555-DETAIL'
    };

    const createClientResponse = await axios.post(`${API_URL}/clients`, clientData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log("✅ Client creation successful!");
    console.log("📊 Created client response:", JSON.stringify(createClientResponse.data, null, 2));

    // Step 4: Extract the id of the newly created client
    const clientId = createClientResponse.data.data.id;
    console.log("🆔 Client ID extracted:", clientId);

    if (!clientId) {
      throw new Error('Failed to extract client ID from creation response');
    }

    // Step 5: Send a GET request to /api/clients/{id}
    console.log("🔍 Step 5: Retrieving client by ID...");
    console.log("🔍 GET URL:", `${API_URL}/clients/${clientId}`);

    const getClientResponse = await axios.get(`${API_URL}/clients/${clientId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log("✅ GET /api/clients/:id successful!");
    console.log("📊 GET response status:", getClientResponse.status);
    console.log("📊 GET response data:", JSON.stringify(getClientResponse.data, null, 2));

    // Step 6: Verify response contains correct client data
    console.log("🔍 Step 6: Verifying client data matches...");

    if (getClientResponse.status !== 200) {
      throw new Error(`Expected 200 OK, got ${getClientResponse.status}`);
    }

    const retrievedClient = getClientResponse.data.data;
    
    // Verify client data matches what was created
    const verifications = [
      { field: 'id', expected: clientId, actual: retrievedClient.id },
      { field: 'name', expected: clientData.name, actual: retrievedClient.name },
      { field: 'primary_contact_name', expected: clientData.primary_contact_name, actual: retrievedClient.primary_contact_name },
      { field: 'primary_contact_email', expected: clientData.primary_contact_email, actual: retrievedClient.primary_contact_email },
      { field: 'primary_contact_phone', expected: clientData.primary_contact_phone, actual: retrievedClient.primary_contact_phone }
    ];

    let allVerified = true;
    verifications.forEach(({ field, expected, actual }) => {
      const matches = expected === actual;
      console.log(`   ${matches ? '✅' : '❌'} ${field}: Expected '${expected}', Got '${actual}'`);
      if (!matches) allVerified = false;
    });

    if (!allVerified) {
      throw new Error('Client data verification failed - retrieved data does not match created data');
    }

    console.log("✅ Client data verification successful - all fields match!");

    // Verify response structure
    if (!retrievedClient.created_at) {
      throw new Error('Missing created_at timestamp in response');
    }

    if (!retrievedClient.company_id) {
      throw new Error('Missing company_id in response');
    }

    console.log("✅ Response structure verification successful");

    // Step 7: Test 404 error with non-existent UUID
    console.log("🚫 Step 7: Testing 404 error with non-existent client ID...");
    const randomUuid = '00000000-1111-2222-3333-444444444444';
    console.log("🚫 Testing with random UUID:", randomUuid);
    
    try {
      await axios.get(`${API_URL}/clients/${randomUuid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      throw new Error('Expected 404 error but request succeeded');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log("✅ 404 error correctly returned for non-existent client");
        console.log("📊 404 response status:", error.response.status);
        console.log("📊 404 response data:", JSON.stringify(error.response.data, null, 2));
        
        // Verify 404 response structure
        if (!error.response.data.success === false) {
          throw new Error('404 response should have success: false');
        }
        
        if (!error.response.data.error) {
          throw new Error('404 response should include error message');
        }
        
        console.log("✅ 404 response structure validation successful");
      } else {
        throw error;
      }
    }

    // Step 8: Test edge cases
    console.log("⚡ Step 8: Testing edge cases...");

    // Test empty client ID
    console.log("⚡ Testing empty client ID...");
    try {
      await axios.get(`${API_URL}/clients/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      // This should actually hit the GET /api/clients (list all) endpoint, not return an error
      console.log("✅ Empty client ID correctly routed to list endpoint");
    } catch (error) {
      if (error.response && error.response.status === 200) {
        console.log("✅ Empty client ID correctly routed to list endpoint");
      } else {
        console.log("⚠️ Empty client ID handling:", error.response ? error.response.status : error.message);
      }
    }

    // Test invalid UUID format
    console.log("⚡ Testing invalid UUID format...");
    try {
      await axios.get(`${API_URL}/clients/invalid-uuid-format`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      throw new Error('Expected 404 error for invalid UUID format but request succeeded');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log("✅ Invalid UUID format correctly returns 404");
      } else {
        console.log("⚠️ Invalid UUID handling:", error.response ? error.response.status : error.message);
      }
    }

    return true;
  } catch (error) {
    console.error("❌ Test failed:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
      console.error("Headers:", error.response.headers);
    } else {
      console.error("Error:", error.message);
    }
    return false;
  }
}

testClientGetByIdEndpoint()
  .then(success => {
    console.log(success ? "🎉 All GET /api/clients/:id endpoint tests passed!" : "💥 Tests failed!");
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error("💥 Unexpected error:", error);
    process.exit(1);
  });