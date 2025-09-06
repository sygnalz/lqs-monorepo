// Debug script to test communications functions directly
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw';

async function logCommunication(communicationData, serviceKey) {
  console.log('🔍 Testing logCommunication function...');
  console.log('📋 Communication data:', JSON.stringify(communicationData, null, 2));
  
  try {
    // Insert communication record into communications table
    const response = await fetch('https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/communications', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(communicationData)
    });

    console.log('📡 Response status:', response.status, response.statusText);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error response text:', errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        console.log('❌ Error data parsed:', JSON.stringify(errorData, null, 2));
        throw new Error(`Failed to log communication: ${JSON.stringify(errorData)}`);
      } catch (parseError) {
        console.log('❌ Could not parse error as JSON');
        throw new Error(`Failed to log communication: ${response.status} ${errorText}`);
      }
    }

    const result = await response.json();
    console.log('✅ Success! Result:', JSON.stringify(result, null, 2));
    return result[0] || result;
  } catch (error) {
    console.error('💥 Exception in logCommunication:', error.message);
    console.error('📚 Stack trace:', error.stack);
    throw error;
  }
}

async function updateCommunicationStatus(communicationId, updateData, serviceKey) {
  console.log('🔍 Testing updateCommunicationStatus function...');
  console.log('🆔 Communication ID:', communicationId);
  console.log('📋 Update data:', JSON.stringify(updateData, null, 2));
  
  try {
    // Update communication record status
    const response = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/communications?id=eq.${communicationId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(updateData)
    });

    console.log('📡 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Failed to update communication status:', errorData);
      return false;
    }

    const result = await response.json();
    console.log('✅ Update successful! Result:', JSON.stringify(result, null, 2));
    return true;
  } catch (error) {
    console.error('💥 Exception in updateCommunicationStatus:', error.message);
    return false;
  }
}

async function testCommunicationsFlow() {
  console.log('🧪 TESTING COMMUNICATIONS FLOW');
  console.log('================================');

  // Test data from a real qualified lead
  const testLead = {
    id: '81bbb43a-e898-40e9-b966-267ea496dfab',
    lead_name: 'Debug Test Lead',
    lead_email: 'debug.test@businesscorp.com',
    client_id: '8e5203e0-8bfa-4cc9-869f-a8b684576a8d',
    status: 'qualified'
  };

  const qualificationResult = {
    status: 'qualified',
    qualification_score: 85,
    notes: 'Test qualification for debugging'
  };

  console.log('🎯 Test lead:', testLead.id, '-', testLead.lead_name);
  console.log('');

  // Step 1: Test logCommunication
  const communicationRecord = {
    lead_id: testLead.id,
    client_id: testLead.client_id,
    type: 'email',
    recipient: testLead.lead_email,
    subject: `Debug Test - Welcome ${testLead.lead_name}`,
    content: 'This is a debug test email for communications logging.',
    status: 'pending',
    provider: 'resend',
    template_id: 'lead-qualification-notification',
    template_variables: {
      lead_name: testLead.lead_name,
      qualification_status: qualificationResult.status,
      qualification_score: qualificationResult.qualification_score
    },
    priority: 5,
    consent_status: 'granted'
  };

  try {
    console.log('1️⃣ TESTING logCommunication...');
    const logResult = await logCommunication(communicationRecord, SERVICE_KEY);
    const communicationId = logResult.id;
    console.log('✅ Communication logged successfully! ID:', communicationId);
    console.log('');

    // Step 2: Test updateCommunicationStatus
    console.log('2️⃣ TESTING updateCommunicationStatus...');
    const updateData = {
      status: 'sent',
      external_id: 'resend_debug_123',
      sent_at: new Date().toISOString(),
      external_reference: {
        id: 'resend_debug_123',
        status: 'sent',
        debug: true
      }
    };

    const updateSuccess = await updateCommunicationStatus(communicationId, updateData, SERVICE_KEY);
    if (updateSuccess) {
      console.log('✅ Communication status updated successfully!');
    } else {
      console.log('❌ Communication status update failed!');
    }
    console.log('');

    // Step 3: Verify the record exists
    console.log('3️⃣ VERIFYING communication record...');
    const verifyResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/communications?id=eq.${communicationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY
      }
    });

    if (verifyResponse.ok) {
      const verifyResult = await verifyResponse.json();
      if (verifyResult.length > 0) {
        console.log('✅ Communication record verified!');
        console.log('📋 Final record:', JSON.stringify(verifyResult[0], null, 2));
      } else {
        console.log('❌ Communication record not found after creation!');
      }
    } else {
      console.log('❌ Failed to verify communication record');
    }

  } catch (error) {
    console.error('💥 COMMUNICATIONS FLOW FAILED:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testCommunicationsFlow().catch(console.error);