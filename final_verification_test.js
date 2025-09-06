// Final verification test for the exact scenario from the bug report
const API_BASE = 'https://lqs-uat-worker.charlesheflin.workers.dev';
const PROCESSOR_BASE = 'https://lqs-lead-processor.charlesheflin.workers.dev';

async function finalVerificationTest() {
  console.log('🎯 FINAL VERIFICATION TEST - EXACT UAT SCENARIO');
  console.log('================================================\n');

  // First, check the status of the originally failing lead from the bug report
  console.log('1️⃣ Checking original lead from bug report...');
  console.log('   Lead ID: 28002a24-9581-4dd8-8773-ff2591ffb13b');
  
  // Sign in to get JWT
  const signinResponse = await fetch(`${API_BASE}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'uat-owner-a@example.com',
      password: 'TestPassword123!'
    })
  });
  
  if (!signinResponse.ok) {
    console.log('   ❌ Authentication failed');
    return;
  }
  
  const signinData = await signinResponse.json();
  const userJWT = signinData.data.session.access_token;
  
  // Check original lead status
  const originalLeadResponse = await fetch(`${API_BASE}/api/leads/28002a24-9581-4dd8-8773-ff2591ffb13b`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${userJWT}` }
  });
  
  if (originalLeadResponse.ok) {
    const originalLead = await originalLeadResponse.json();
    console.log(`   📊 Original lead status: ${originalLead.data.status}`);
    console.log(`   📧 Email: ${originalLead.data.lead_email}`);
    console.log(`   ⏰ Created: ${originalLead.data.created_at}`);
    
    if (originalLead.data.status === 'new') {
      console.log('   ⚠️ Original lead still has "new" status - will process it');
    } else {
      console.log(`   ✅ Original lead was already processed to "${originalLead.data.status}"`);
    }
  } else {
    console.log('   ❌ Could not fetch original lead');
  }

  console.log('\n2️⃣ Creating new lead to test current pipeline...');
  
  // Create a fresh test lead using the exact same scenario
  const testLeadData = {
    lead_name: 'UAT Test Lead 2.1',
    lead_email: 'uat.test.2.1@businesscorp.com'  // Business domain should qualify
  };
  
  const createResponse = await fetch(`${API_BASE}/api/leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userJWT}`
    },
    body: JSON.stringify(testLeadData)
  });
  
  if (!createResponse.ok) {
    console.log('   ❌ Failed to create test lead');
    return;
  }
  
  const createdLead = await createResponse.json();
  const testLeadId = createdLead.data.id;
  const startTime = Date.now();
  
  console.log(`   ✅ Created test lead: ${testLeadId}`);
  console.log(`   📧 Email: ${createdLead.data.lead_email}`);
  console.log(`   📊 Initial status: ${createdLead.data.status}`);
  console.log(`   ⏰ Created at: ${createdLead.data.created_at}`);
  
  console.log('\n3️⃣ Monitoring lead status for 60+ seconds...');
  
  let currentStatus = 'new';
  let attempt = 0;
  const maxAttempts = 7; // 70 seconds total
  
  while (attempt < maxAttempts && currentStatus === 'new') {
    attempt++;
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    
    console.log(`   ⏰ Check ${attempt}/${maxAttempts} (${elapsedTime}s elapsed)...`);
    
    // Check status
    const statusResponse = await fetch(`${API_BASE}/api/leads/${testLeadId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${userJWT}` }
    });
    
    if (statusResponse.ok) {
      const leadStatus = await statusResponse.json();
      currentStatus = leadStatus.data.status;
      console.log(`   📊 Current status: ${currentStatus}`);
      
      if (currentStatus !== 'new') {
        const totalTime = Math.floor((Date.now() - startTime) / 1000);
        console.log(`   🎯 STATUS CHANGED! Processing completed in ${totalTime} seconds`);
        break;
      }
    } else {
      console.log(`   ❌ Failed to check status: ${statusResponse.status}`);
    }
    
    if (attempt < maxAttempts && currentStatus === 'new') {
      console.log('   ⏳ Waiting 10 seconds...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  console.log('\n4️⃣ FINAL VERIFICATION RESULTS:');
  console.log('==============================');
  
  const totalElapsedTime = Math.floor((Date.now() - startTime) / 1000);
  
  if (currentStatus !== 'new') {
    console.log('✅ SUCCESS: Asynchronous lead processing is working!');
    console.log(`   📊 Final Status: ${currentStatus}`);
    console.log(`   ⏱️ Processing Time: ${totalElapsedTime} seconds`);
    console.log(`   🎯 Expected Result: qualified (or review/rejected based on business rules)`);
    console.log(`   ✅ Actual Result: ${currentStatus}`);
    console.log(`   📋 Test Lead ID: ${testLeadId}`);
    
    if (currentStatus === 'qualified') {
      console.log('\n🏆 PERFECT: Lead was correctly qualified as expected!');
      console.log('   The async worker pipeline is functioning correctly:');
      console.log('   API Gateway → Database → Scheduled Worker → Status Update');
    } else {
      console.log(`\n✅ WORKING: Lead was processed but resulted in "${currentStatus}"`);
      console.log('   This is normal behavior based on the business qualification rules.');
    }
    
    // Verify requirement: status update within 60 seconds
    if (totalElapsedTime <= 60) {
      console.log(`\n🎯 REQUIREMENT MET: Status updated within 60 seconds (${totalElapsedTime}s)`);
    } else {
      console.log(`\n⚠️ TIMING: Status updated in ${totalElapsedTime}s (>60s but still working)`);
    }
    
  } else {
    console.log('❌ FAILURE: Lead status remained "new"');
    console.log(`   📊 Status after ${totalElapsedTime} seconds: ${currentStatus}`);
    console.log(`   📋 Test Lead ID: ${testLeadId}`);
    console.log('   🔍 The async processing pipeline may need further investigation');
  }

  // Additional verification: manually trigger processor to confirm it's working
  console.log('\n5️⃣ Manual processor verification...');
  
  const manualProcessResponse = await fetch(`${PROCESSOR_BASE}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (manualProcessResponse.ok) {
    const manualResult = await manualProcessResponse.json();
    console.log(`   📊 Manual trigger result: ${manualResult.successfully_processed} processed, ${manualResult.failed_processing} failed`);
    
    if (manualResult.successfully_processed > 0) {
      console.log('   ✅ Manual processor trigger successful - async pipeline is functional');
    }
  }
}

finalVerificationTest().catch(console.error);
