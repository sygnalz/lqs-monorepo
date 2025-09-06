// Debug signup step by step
async function debugSignup() {
  const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw';
  const testEmail = `debug.test.${Date.now()}@example.com`;
  
  console.log('🔍 DEBUGGING SIGNUP TRANSACTION STEP BY STEP\n');
  console.log(`Test email: ${testEmail}\n`);

  try {
    // Step 1: Create user
    console.log('STEP 1: Creating user...');
    const userResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY
      },
      body: JSON.stringify({
        email: testEmail,
        password: 'TestPassword123!',
        email_confirm: true
      })
    });
    
    if (!userResponse.ok) {
      const userError = await userResponse.json();
      console.log('❌ User creation failed:', userError);
      return;
    }
    
    const userData = await userResponse.json();
    console.log('✅ User response:', JSON.stringify(userData, null, 2));
    
    if (!userData.user) {
      console.log('❌ No user object in response');
      return;
    }
    
    console.log('✅ User created:', userData.user.id);
    
    // Step 2: Create client
    console.log('\nSTEP 2: Creating client...');
    const clientResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/clients`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        name: 'Debug Test Organization'
      })
    });
    
    if (!clientResponse.ok) {
      const clientError = await clientResponse.json();
      console.log('❌ Client creation failed:', clientError);
      return;
    }
    
    const clientData = await clientResponse.json();
    console.log('✅ Client created:');
    console.log('   Raw response:', JSON.stringify(clientData, null, 2));
    console.log('   Client ID:', Array.isArray(clientData) ? clientData[0].id : clientData.id);
    
    const createdUserId = userData.user.id;
    const createdClientId = Array.isArray(clientData) ? clientData[0].id : clientData.id;
    
    // Step 3: Create profile
    console.log('\nSTEP 3: Creating profile link...');
    const profileResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        id: createdUserId,
        client_id: createdClientId
      })
    });
    
    if (!profileResponse.ok) {
      const profileError = await profileResponse.json();
      console.log('❌ Profile creation failed:', profileError);
      return;
    }
    
    const profileData = await profileResponse.json();
    console.log('✅ Profile created:', JSON.stringify(profileData, null, 2));
    
    console.log('\n🎉 ALL STEPS SUCCESSFUL!');
    console.log(`User ID: ${createdUserId}`);
    console.log(`Client ID: ${createdClientId}`);
    console.log(`Profile created: ${profileData[0].id} → ${profileData[0].client_id}`);
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
  }
}

debugSignup();