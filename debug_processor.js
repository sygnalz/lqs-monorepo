// Debug the lead processor to find why it's failing
const PROCESSOR_BASE = 'https://lqs-lead-processor.charlesheflin.workers.dev';
const SUPABASE_URL = 'https://kwebsccgtmntljdrzwet.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw';

async function debugProcessor() {
  console.log('🔍 DEBUGGING LEAD PROCESSOR');
  console.log('============================\n');

  // Step 1: Check how many leads are in "new" status
  console.log('1️⃣ Checking leads with "new" status...');
  
  const leadsResponse = await fetch(`${SUPABASE_URL}/rest/v1/leads?status=eq.new&select=id,lead_name,lead_email,status,created_at&order=created_at.desc&limit=5`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY
    }
  });
  
  if (leadsResponse.ok) {
    const newLeads = await leadsResponse.json();
    console.log(`   ✅ Found ${newLeads.length} leads with "new" status:`);
    
    newLeads.forEach((lead, index) => {
      console.log(`   ${index + 1}. ID: ${lead.id}`);
      console.log(`      Name: ${lead.lead_name}`);
      console.log(`      Email: ${lead.lead_email}`);
      console.log(`      Status: ${lead.status}`);
      console.log(`      Created: ${lead.created_at}\n`);
    });
  } else {
    console.log(`   ❌ Failed to fetch leads: ${leadsResponse.status}`);
    const errorText = await leadsResponse.text();
    console.log(`   Error: ${errorText}\n`);
  }

  // Step 2: Test processor manually with detailed error capture
  console.log('2️⃣ Testing processor with detailed error capture...');
  
  try {
    const processResponse = await fetch(`${PROCESSOR_BASE}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log(`   Response status: ${processResponse.status} ${processResponse.statusText}`);
    
    if (processResponse.ok) {
      const result = await processResponse.json();
      console.log('   ✅ Processor response:');
      console.log(JSON.stringify(result, null, 2));
      
      if (result.results) {
        console.log('\n   📊 Individual lead processing results:');
        result.results.forEach((result, index) => {
          console.log(`   Lead ${index + 1}: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
          console.log(`      Lead ID: ${result.lead_id}`);
          if (result.success) {
            console.log(`      New Status: ${result.new_status}`);
            console.log(`      Processing Time: ${result.processing_time_ms}ms`);
          } else {
            console.log(`      Error: ${result.error}`);
          }
          console.log('');
        });
      }
    } else {
      const errorText = await processResponse.text();
      console.log(`   ❌ Processor failed: ${errorText}`);
    }
  } catch (error) {
    console.log(`   ❌ Error calling processor: ${error.message}`);
  }

  // Step 3: Test direct Supabase update to isolate issue
  console.log('3️⃣ Testing direct lead status update...');
  
  try {
    // Get one lead to test update
    const testLeadsResponse = await fetch(`${SUPABASE_URL}/rest/v1/leads?status=eq.new&limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY
      }
    });
    
    if (testLeadsResponse.ok) {
      const testLeads = await testLeadsResponse.json();
      
      if (testLeads.length > 0) {
        const testLead = testLeads[0];
        console.log(`   🧪 Testing update on lead: ${testLead.id}`);
        
        const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${testLead.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'apikey': SERVICE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            status: 'qualified',
            updated_at: new Date().toISOString()
          })
        });
        
        console.log(`   Update response: ${updateResponse.status} ${updateResponse.statusText}`);
        
        if (updateResponse.ok) {
          const updatedLead = await updateResponse.json();
          console.log('   ✅ Direct update successful:');
          console.log(JSON.stringify(updatedLead[0] || updatedLead, null, 2));
        } else {
          const errorText = await updateResponse.text();
          console.log(`   ❌ Direct update failed: ${errorText}`);
        }
      } else {
        console.log('   ⚠️ No leads with "new" status found for testing');
      }
    }
  } catch (error) {
    console.log(`   ❌ Error in direct update test: ${error.message}`);
  }
}

debugProcessor().catch(console.error);
