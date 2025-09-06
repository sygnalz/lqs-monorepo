// Test the fixed communications logging with existing table schema
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw';

async function logCommunication(communicationData, serviceKey) {
  console.log('🔍 Testing logCommunication with existing schema...');
  console.log('📋 Communication data:', JSON.stringify(communicationData, null, 2));
  
  try {
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

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error response:', errorText);
      throw new Error(`Failed to log communication: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Success! Result:', JSON.stringify(result, null, 2));
    return result[0] || result;
  } catch (error) {
    console.error('💥 Exception in logCommunication:', error.message);
    throw error;
  }
}

async function updateCommunicationStatus(communicationId, updateData, serviceKey) {
  console.log('🔍 Testing updateCommunicationStatus...');
  console.log('🆔 Communication ID:', communicationId);
  console.log('📋 Update data:', JSON.stringify(updateData, null, 2));
  
  try {
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

async function testFixedCommunications() {
  console.log('🧪 TESTING FIXED COMMUNICATIONS WITH EXISTING SCHEMA');
  console.log('===================================================');

  // Test data - using only columns that exist in current table
  const testLead = {
    id: '81bbb43a-e898-40e9-b966-267ea496dfab',
    lead_name: 'Debug Test Lead',
    lead_email: 'debug.test@businesscorp.com',
    client_id: '8e5203e0-8bfa-4cc9-869f-a8b684576a8d'
  };

  console.log('🎯 Test lead:', testLead.id, '-', testLead.lead_name);
  console.log('');

  // Communication record using ONLY existing columns
  const communicationRecord = {
    lead_id: testLead.id,
    client_id: testLead.client_id,
    type: 'email',
    recipient: testLead.lead_email,
    status: 'pending',
    provider: 'resend'
    // Not including: subject, content, template_id, template_variables,
    // priority, consent_status, external_reference, etc.
  };

  try {
    console.log('1️⃣ TESTING logCommunication with existing schema...');
    const logResult = await logCommunication(communicationRecord, SERVICE_KEY);
    const communicationId = logResult.id;
    console.log('✅ Communication logged successfully! ID:', communicationId);
    console.log('');

    console.log('2️⃣ TESTING updateCommunicationStatus...');
    const updateData = {
      status: 'sent',
      external_id: 'resend_fixed_123',
      sent_at: new Date().toISOString()
    };

    const updateSuccess = await updateCommunicationStatus(communicationId, updateData, SERVICE_KEY);
    if (updateSuccess) {
      console.log('✅ Communication status updated successfully!');
    } else {
      console.log('❌ Communication status update failed!');
    }
    console.log('');

    console.log('3️⃣ VERIFYING final communication record...');
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
        
        // Success - now test with a fresh qualified lead
        console.log('');
        console.log('4️⃣ SUCCESS - Ready to test with real lead processing!');
        return { success: true, communication_id: communicationId };
      } else {
        console.log('❌ Communication record not found after creation!');
        return { success: false, error: 'Record not found' };
      }
    } else {
      console.log('❌ Failed to verify communication record');
      return { success: false, error: 'Verification failed' };
    }

  } catch (error) {
    console.error('💥 FIXED COMMUNICATIONS TEST FAILED:');
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

testFixedCommunications().then(result => {
  if (result.success) {
    console.log('');
    console.log('🎉 COMMUNICATIONS LOGGING IS NOW WORKING!');
    console.log('✅ Worker can now log communications using existing table schema');
    console.log('📋 Ready to deploy fixed worker and test with real leads');
  } else {
    console.log('');
    console.log('❌ Communications logging still has issues:', result.error);
  }
}).catch(console.error);