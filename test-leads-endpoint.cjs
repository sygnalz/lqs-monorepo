const axios = require('axios');

const API_URL = 'https://lqs-uat-worker.charlesheflin.workers.dev/api';

async function testLeadsEndpoint() {
  console.log("🧪 Testing GET /api/leads endpoint...");
  
  try {
    // First, create a test user and get JWT token
    const signupData = {
      companyName: 'Test Leads Company',
      email: 'leads.test@example.com',
      password: 'password123'
    };

    console.log("🔐 Creating test account...");
    const signupResponse = await axios.post(`${API_URL}/auth/signup`, signupData);
    console.log("✅ Signup successful:", signupResponse.data);

    // Sign in to get JWT token
    const signinData = {
      email: 'leads.test@example.com',
      password: 'password123'
    };

    console.log("🔐 Signing in...");
    const signinResponse = await axios.post(`${API_URL}/auth/signin`, signinData);
    console.log("✅ Signin successful");

    const token = signinResponse.data.data.session.access_token;
    console.log("🎫 JWT Token received:", token ? `${token.substring(0, 20)}...` : 'null');

    // Test GET /api/leads
    console.log("📋 Testing GET /api/leads...");
    const leadsResponse = await axios.get(`${API_URL}/leads`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log("✅ GET /api/leads successful!");
    console.log("📊 Response status:", leadsResponse.status);
    console.log("📊 Response data structure:", {
      hasData: !!leadsResponse.data,
      hasNestedData: !!leadsResponse.data.data,
      isNestedDataArray: Array.isArray(leadsResponse.data.data),
      leadsCount: Array.isArray(leadsResponse.data.data) ? leadsResponse.data.data.length : 'N/A'
    });
    console.log("📊 Full response:", JSON.stringify(leadsResponse.data, null, 2));

    // Create a test lead if none exist
    if (Array.isArray(leadsResponse.data.data) && leadsResponse.data.data.length === 0) {
      console.log("📝 Creating test lead...");
      const leadData = {
        name: 'Test Lead User',
        email: 'testlead@example.com',
        phone: '+1-555-123-4567',
        notes: 'This is a test lead created for verification'
      };

      const createLeadResponse = await axios.post(`${API_URL}/auth/signup`, leadData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log("✅ Test lead created:", createLeadResponse.data);

      // Fetch leads again to verify
      const updatedLeadsResponse = await axios.get(`${API_URL}/leads`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log("📋 Updated leads count:", Array.isArray(updatedLeadsResponse.data.data) ? updatedLeadsResponse.data.data.length : 'N/A');
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

testLeadsEndpoint()
  .then(success => {
    console.log(success ? "🎉 All tests passed!" : "💥 Tests failed!");
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error("💥 Unexpected error:", error);
    process.exit(1);
  });