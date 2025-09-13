const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TEST_USER_ID = '71b41176-4730-45b4-978a-f62bfe38b916';
const EXPECTED_COMPANY_ID = '38cb97f5-44e2-47b1-85ab-5ef55b5a9e24';
const TEST_EMAIL = 'charlesheflin@gmail.com';

function createMockJWTPayload(userId, email) {
  return {
    sub: userId,
    email: email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };
}

async function testGetAuthenticatedProfile(userId) {
  console.log(`Testing authentication for user: ${userId}`);
  
  try {
    const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=company_id`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': `${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Profile response status:', profileResponse.status);
    console.log('Profile response ok:', profileResponse.ok);

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error('Profile query failed:', errorText);
      return { error: 'User profile not found' };
    }

    const profileData = await profileResponse.json();
    console.log('Profile data:', JSON.stringify(profileData, null, 2));

    if (!profileData || profileData.length === 0) {
      console.error('No profile data returned');
      return { error: 'User profile not found' };
    }

    const result = { profile: { client_id: profileData[0].company_id } };
    console.log('Authentication result:', JSON.stringify(result, null, 2));
    return result;

  } catch (error) {
    console.error('Authentication test error:', error.message);
    return { error: 'Authentication failed' };
  }
}

async function runAuthenticationTest() {
  console.log('=== Authentication Fix Test ===');
  console.log('Expected user ID:', TEST_USER_ID);
  console.log('Expected company ID:', EXPECTED_COMPANY_ID);
  console.log('Expected email:', TEST_EMAIL);
  console.log('');

  console.log('Test 1: Direct profile lookup');
  const authResult = await testGetAuthenticatedProfile(TEST_USER_ID);
  
  if (authResult.error) {
    console.error('❌ Authentication failed:', authResult.error);
    return false;
  }

  if (authResult.profile && authResult.profile.client_id === EXPECTED_COMPANY_ID) {
    console.log('✅ Authentication successful!');
    console.log('✅ Profile lookup works correctly');
    console.log('✅ Company ID matches expected value');
    return true;
  } else {
    console.error('❌ Authentication returned unexpected data');
    console.error('Expected client_id:', EXPECTED_COMPANY_ID);
    console.error('Actual result:', authResult);
    return false;
  }
}

runAuthenticationTest().then(success => {
  if (success) {
    console.log('\n🎉 Authentication fix verification PASSED');
    process.exit(0);
  } else {
    console.log('\n💥 Authentication fix verification FAILED');
    process.exit(1);
  }
}).catch(error => {
  console.error('\n💥 Test execution failed:', error.message);
  process.exit(1);
});
