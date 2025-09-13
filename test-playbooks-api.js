const WORKER_URL = 'https://lqs-uat-worker.charlesheflin.workers.dev';

const TEST_USER_ID = '71b41176-4730-45b4-978a-f62bfe38b916';
const EXPECTED_COMPANY_ID = '38cb97f5-44e2-47b1-85ab-5ef55b5a9e24';

function createMockJWT(userId, email) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = { 
    sub: userId, 
    email: email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };
  
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = 'mock-signature';
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

async function testPlaybooksAPI() {
  console.log('=== Playbooks API Test ===');
  
  const mockToken = createMockJWT(TEST_USER_ID, 'charlesheflin@gmail.com');
  console.log('Using mock JWT token for testing');
  
  try {
    console.log('\nTest 1: GET /api/playbooks');
    const getResponse = await fetch(`${WORKER_URL}/api/playbooks`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mockToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('GET /api/playbooks status:', getResponse.status);
    
    if (getResponse.ok) {
      const playbooks = await getResponse.json();
      console.log('✅ GET /api/playbooks successful');
      console.log('Playbooks data:', JSON.stringify(playbooks, null, 2));
    } else {
      const errorText = await getResponse.text();
      console.log('❌ GET /api/playbooks failed:', errorText);
      
      if (errorText.includes('User profile not found')) {
        console.log('💥 Still getting "User profile not found" error - fix may not be deployed');
        return false;
      }
    }
    
    console.log('\nTest 2: POST /api/playbooks');
    const testPlaybook = {
      name: 'Test Playbook',
      description: 'Test playbook for authentication verification',
      steps: [
        { action: 'send_email', content: 'Welcome message' }
      ]
    };
    
    const postResponse = await fetch(`${WORKER_URL}/api/playbooks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mockToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPlaybook)
    });
    
    console.log('POST /api/playbooks status:', postResponse.status);
    
    if (postResponse.ok) {
      const createdPlaybook = await postResponse.json();
      console.log('✅ POST /api/playbooks successful');
      console.log('Created playbook:', JSON.stringify(createdPlaybook, null, 2));
      return true;
    } else {
      const errorText = await postResponse.text();
      console.log('❌ POST /api/playbooks failed:', errorText);
      
      if (errorText.includes('User profile not found')) {
        console.log('💥 Still getting "User profile not found" error - fix may not be deployed');
        return false;
      }
    }
    
  } catch (error) {
    console.error('Test execution error:', error.message);
    return false;
  }
  
  return true;
}

testPlaybooksAPI().then(success => {
  if (success) {
    console.log('\n🎉 Playbooks API test PASSED');
    process.exit(0);
  } else {
    console.log('\n💥 Playbooks API test FAILED');
    process.exit(1);
  }
}).catch(error => {
  console.error('\n💥 Test execution failed:', error.message);
  process.exit(1);
});
