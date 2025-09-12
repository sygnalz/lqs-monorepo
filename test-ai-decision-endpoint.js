const SUPABASE_URL = 'https://kwebsccgtmntljdrzwet.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw';

async function testAIDecisionEndpoint() {
  console.log('🧪 Testing AI Decision Engine endpoint...');

  try {
    const leadsResponse = await fetch(`${SUPABASE_URL}/rest/v1/leads?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!leadsResponse.ok) {
      console.error('❌ Failed to fetch test lead:', leadsResponse.status);
      return;
    }

    const leads = await leadsResponse.json();
    if (leads.length === 0) {
      console.log('⚠️ No leads found in database for testing');
      return;
    }

    const testProspectId = leads[0].id;
    console.log(`📋 Testing with prospect ID: ${testProspectId}`);

    const profilesResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!profilesResponse.ok) {
      console.error('❌ Failed to fetch test profile:', profilesResponse.status);
      return;
    }

    const profiles = await profilesResponse.json();
    if (profiles.length === 0) {
      console.log('⚠️ No profiles found in database for testing');
      return;
    }

    const testToken = 'test-jwt-token';
    console.log('🔑 Using test authentication token');

    console.log('\n🚀 Testing AI Decision endpoint...');
    const aiResponse = await fetch(`http://localhost:8787/api/ai/decide/${testProspectId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`📊 Response status: ${aiResponse.status}`);
    const responseData = await aiResponse.json();
    console.log('📄 Response data:', JSON.stringify(responseData, null, 2));

    if (aiResponse.ok) {
      console.log('✅ AI Decision endpoint test completed successfully');
      
      if (responseData.data && responseData.data.decision) {
        const decision = responseData.data.decision;
        console.log('\n🤖 AI Decision Analysis:');
        console.log(`   Action Type: ${decision.action_type}`);
        console.log(`   Priority: ${decision.action_payload?.priority}`);
        console.log(`   Scheduled For: ${decision.scheduled_for}`);
        console.log(`   Rationale: ${decision.ai_rationale}`);
      }
    } else {
      console.log('❌ AI Decision endpoint test failed');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testAIDecisionEndpoint().catch(console.error);
