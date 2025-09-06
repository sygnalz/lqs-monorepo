// Test the fixed lead processor
const PROCESSOR_BASE = 'https://lqs-lead-processor.charlesheflin.workers.dev';
const API_BASE = 'https://lqs-uat-worker.charlesheflin.workers.dev';

async function testFixedProcessor() {
  console.log('🧪 TESTING FIXED LEAD PROCESSOR');
  console.log('================================\n');

  // Step 1: Trigger processor manually
  console.log('1️⃣ Triggering fixed processor...');
  
  const processResponse = await fetch(`${PROCESSOR_BASE}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (processResponse.ok) {
    const result = await processResponse.json();
    console.log('   ✅ Processor response:');
    console.log(`   📊 Total leads found: ${result.total_leads_found}`);
    console.log(`   ✅ Successfully processed: ${result.successfully_processed}`);
    console.log(`   ❌ Failed processing: ${result.failed_processing}`);
    
    if (result.successfully_processed > 0) {
      console.log('\n   🎯 SUCCESS! Processing is now working');
      
      // Show some successful results
      const successfulResults = result.results.filter(r => r.success);
      console.log(`   📋 Sample successful results (${Math.min(3, successfulResults.length)}):`);
      
      successfulResults.slice(0, 3).forEach((result, index) => {
        console.log(`   ${index + 1}. Lead ID: ${result.lead_id}`);
        console.log(`      New Status: ${result.new_status}`);
        console.log(`      Processing Time: ${result.processing_time_ms}ms\n`);
      });
    } else if (result.failed_processing > 0) {
      console.log('\n   ❌ Still failing - showing first error:');
      const firstFailure = result.results.find(r => !r.success);
      if (firstFailure) {
        console.log(`   Error: ${firstFailure.error}`);
      }
    }
  } else {
    console.log(`   ❌ Processor call failed: ${processResponse.status}`);
    const errorText = await processResponse.text();
    console.log(`   Error: ${errorText}`);
  }

  // Step 2: Create and immediately process a test lead
  console.log('\n2️⃣ Creating and processing a fresh test lead...');
  
  // Sign in first
  const signinResponse = await fetch(`${API_BASE}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'uat-owner-a@example.com',
      password: 'TestPassword123!'
    })
  });
  
  if (!signinResponse.ok) {
    console.log('   ❌ Signin failed');
    return;
  }
  
  const signinData = await signinResponse.json();
  const userJWT = signinData.data.session.access_token;
  
  // Create fresh test lead
  const createResponse = await fetch(`${API_BASE}/api/leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userJWT}`
    },
    body: JSON.stringify({
      lead_name: 'Final Test Lead',
      lead_email: 'final.test@businesscorp.com'  // .com domain should qualify as "qualified"
    })
  });
  
  if (createResponse.ok) {
    const createdLead = await createResponse.json();
    const leadId = createdLead.data.id;
    
    console.log(`   ✅ Created test lead: ${leadId}`);
    console.log(`   📧 Email: ${createdLead.data.lead_email}`);
    console.log(`   📊 Initial status: ${createdLead.data.status}`);
    
    // Wait 3 seconds then process
    console.log('\n   ⏳ Waiting 3 seconds then processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const processTestResponse = await fetch(`${PROCESSOR_BASE}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (processTestResponse.ok) {
      const processResult = await processTestResponse.json();
      console.log(`   ✅ Processing complete: ${processResult.successfully_processed} successful`);
      
      // Check the lead status
      const statusResponse = await fetch(`${API_BASE}/api/leads/${leadId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${userJWT}` }
      });
      
      if (statusResponse.ok) {
        const leadStatus = await statusResponse.json();
        const finalStatus = leadStatus.data.status;
        
        console.log(`   📊 Final status: ${finalStatus}`);
        
        if (finalStatus !== 'new') {
          console.log('   🏆 SUCCESS: Lead status was updated by processor!');
          console.log(`   🎯 Status changed from "new" to "${finalStatus}"`);
        } else {
          console.log('   ⚠️ Status still "new" - check if this specific lead was processed');
        }
      }
    }
  } else {
    console.log('   ❌ Failed to create test lead');
  }
}

testFixedProcessor().catch(console.error);
