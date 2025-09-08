const axios = require('axios');

const API_URL = 'https://lqs-uat-worker.charlesheflin.workers.dev/api';

async function testClientsEndpoints() {
  console.log("🧪 Testing Clients API endpoints...");
  
  try {
    // Step 1: Create a test user and get JWT token
    const timestamp = Date.now();
    const signupData = {
      companyName: 'Client Test Company',
      email: `clients.test.${timestamp}@example.com`,
      password: 'password123'
    };

    console.log("🔐 Creating test account...");
    const signupResponse = await axios.post(`${API_URL}/auth/signup`, signupData);
    console.log("✅ Signup successful");

    // Step 2: Sign in to get JWT token
    const signinData = {
      email: `clients.test.${timestamp}@example.com`,
      password: 'password123'
    };

    console.log("🔐 Signing in...");
    const signinResponse = await axios.post(`${API_URL}/auth/signin`, signinData);
    console.log("✅ Signin successful");

    const token = signinResponse.data.data.session.access_token;
    console.log("🎫 JWT Token received:", token ? `${token.substring(0, 20)}...` : 'null');

    // Step 3: Test GET /api/clients (should return empty initially)
    console.log("📋 Testing GET /api/clients...");
    const getClientsResponse = await axios.get(`${API_URL}/clients`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log("✅ GET /api/clients successful!");
    console.log("📊 Response status:", getClientsResponse.status);
    console.log("📊 Response data structure:", {
      hasData: !!getClientsResponse.data,
      hasDataArray: !!getClientsResponse.data.data,
      isDataArray: Array.isArray(getClientsResponse.data.data),
      clientsCount: Array.isArray(getClientsResponse.data.data) ? getClientsResponse.data.data.length : 'N/A'
    });
    console.log("📊 Full GET response:", JSON.stringify(getClientsResponse.data, null, 2));

    // Step 4: Test POST /api/clients - Create a new client
    console.log("📝 Testing POST /api/clients...");
    const clientData = {
      name: 'Acme Corporation',
      primary_contact_name: 'John Smith',
      primary_contact_email: 'john.smith@acme.com',
      primary_contact_phone: '+1-555-123-4567'
    };

    const createClientResponse = await axios.post(`${API_URL}/clients`, clientData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log("✅ POST /api/clients successful!");
    console.log("📊 Create response status:", createClientResponse.status);
    console.log("📊 Create response data:", JSON.stringify(createClientResponse.data, null, 2));

    // Step 5: Test GET /api/clients again (should now have the created client)
    console.log("📋 Testing GET /api/clients after creation...");
    const updatedClientsResponse = await axios.get(`${API_URL}/clients`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log("✅ Updated GET /api/clients successful!");
    console.log("📊 Updated clients count:", Array.isArray(updatedClientsResponse.data.data) ? updatedClientsResponse.data.data.length : 'N/A');
    console.log("📊 Updated full response:", JSON.stringify(updatedClientsResponse.data, null, 2));

    // Step 6: Create another client to test multiple records
    console.log("📝 Creating second client...");
    const secondClientData = {
      name: 'Beta Industries',
      primary_contact_name: 'Jane Doe',
      primary_contact_email: 'jane.doe@beta.com',
      primary_contact_phone: '+1-555-987-6543'
    };

    const secondClientResponse = await axios.post(`${API_URL}/clients`, secondClientData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log("✅ Second client created successfully!");
    
    // Final GET test
    console.log("📋 Final GET test with multiple clients...");
    const finalClientsResponse = await axios.get(`${API_URL}/clients`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log("📊 Final clients count:", Array.isArray(finalClientsResponse.data.data) ? finalClientsResponse.data.data.length : 'N/A');
    console.log("📊 Final clients list:");
    if (Array.isArray(finalClientsResponse.data.data)) {
      finalClientsResponse.data.data.forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.name} (ID: ${client.id})`);
        console.log(`      Contact: ${client.primary_contact_name || 'N/A'} (${client.primary_contact_email || 'N/A'})`);
      });
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

testClientsEndpoints()
  .then(success => {
    console.log(success ? "🎉 All clients endpoint tests passed!" : "💥 Tests failed!");
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error("💥 Unexpected error:", error);
    process.exit(1);
  });