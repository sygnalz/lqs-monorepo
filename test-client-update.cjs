const axios = require('axios');

const API_URL = 'https://lqs-uat-worker.charlesheflin.workers.dev/api';

async function testClientBillingUpdate() {
  console.log("🧪 Testing Client Billing Update Endpoint...");
  
  try {
    // Step 1: Create a new, unique user via the signup endpoint
    const timestamp = Date.now();
    const signupData = {
      companyName: 'Billing Test Company',
      email: `billing.test.${timestamp}@example.com`,
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
      name: 'Billing Test Client Corp',
      primary_contact_name: 'John Billing Manager',
      primary_contact_email: 'john.billing@testcorp.com',
      primary_contact_phone: '+1-555-BILLING'
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

    // Step 5: Send a PATCH request to /api/clients/{id} with new billing data
    console.log("💰 Step 5: Updating client billing information...");
    const billingUpdateData = {
      billing_address: '123 Billing Street, Finance City, FC 12345',
      rate_per_minute: 2.50,
      rate_per_sms: 0.15,
      rate_per_lead: 25.00
    };

    console.log("📊 Billing update payload:", JSON.stringify(billingUpdateData, null, 2));

    const patchResponse = await axios.patch(`${API_URL}/clients/${clientId}`, billingUpdateData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // Step 6: Verify the PATCH request returns 200 OK and contains updated billing information
    console.log("✅ PATCH request successful!");
    console.log("📊 PATCH response status:", patchResponse.status);
    console.log("📊 PATCH response data:", JSON.stringify(patchResponse.data, null, 2));

    // Detailed verification of response
    if (patchResponse.status !== 200) {
      throw new Error(`Expected 200 OK, got ${patchResponse.status}`);
    }

    const updatedClient = patchResponse.data.data;
    
    // Verify all billing fields were updated correctly
    console.log("🔍 Verifying billing information updates...");
    
    const verifications = [
      { field: 'billing_address', expected: billingUpdateData.billing_address, actual: updatedClient.billing_address },
      { field: 'rate_per_minute', expected: billingUpdateData.rate_per_minute, actual: parseFloat(updatedClient.rate_per_minute) },
      { field: 'rate_per_sms', expected: billingUpdateData.rate_per_sms, actual: parseFloat(updatedClient.rate_per_sms) },
      { field: 'rate_per_lead', expected: billingUpdateData.rate_per_lead, actual: parseFloat(updatedClient.rate_per_lead) }
    ];

    let allVerified = true;
    verifications.forEach(({ field, expected, actual }) => {
      const matches = expected === actual;
      console.log(`   ${matches ? '✅' : '❌'} ${field}: Expected ${expected}, Got ${actual}`);
      if (!matches) allVerified = false;
    });

    if (!allVerified) {
      throw new Error('Billing information verification failed - values do not match');
    }

    // Test partial update (only update one field)
    console.log("🔄 Step 7: Testing partial billing update...");
    const partialUpdateData = {
      rate_per_minute: 3.75
    };

    const partialPatchResponse = await axios.patch(`${API_URL}/clients/${clientId}`, partialUpdateData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log("✅ Partial PATCH request successful!");
    console.log("📊 Partial update response:", JSON.stringify(partialPatchResponse.data, null, 2));

    const partialUpdatedClient = partialPatchResponse.data.data;
    if (parseFloat(partialUpdatedClient.rate_per_minute) !== 3.75) {
      throw new Error('Partial update verification failed');
    }

    // Verify other fields remained unchanged
    if (partialUpdatedClient.billing_address !== billingUpdateData.billing_address) {
      throw new Error('Partial update incorrectly modified other fields');
    }

    console.log("✅ Partial update verified - only rate_per_minute changed");

    // Test 404 error with non-existent client ID
    console.log("🚫 Step 8: Testing 404 error with non-existent client ID...");
    const fakeClientId = '00000000-0000-0000-0000-000000000000';
    
    try {
      await axios.patch(`${API_URL}/clients/${fakeClientId}`, { rate_per_minute: 1.00 }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      throw new Error('Expected 404 error but request succeeded');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log("✅ 404 error correctly returned for non-existent client");
        console.log("📊 404 response:", JSON.stringify(error.response.data, null, 2));
      } else {
        throw error;
      }
    }

    return true;
  } catch (error) {
    console.error("❌ Test failed:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error("Error:", error.message);
    }
    return false;
  }
}

testClientBillingUpdate()
  .then(success => {
    console.log(success ? "🎉 All client billing endpoint tests passed!" : "💥 Tests failed!");
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error("💥 Unexpected error:", error);
    process.exit(1);
  });