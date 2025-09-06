// Test the complete lead processing pipeline
const API_BASE = 'https://lqs-uat-worker.charlesheflin.workers.dev';
const PROCESSOR_BASE = 'https://lqs-lead-processor.charlesheflin.workers.dev';

async function testCompletePipeline() {
  console.log('🧪 TESTING COMPLETE LEAD PROCESSING PIPELINE');
  console.log('============================================\n');

  // Step 1: Create new lead
  console.log('1️⃣ Creating new lead via API...');
  
  // First sign in to get JWT
  const signinResponse = await fetch(`${API_BASE}/api/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'uat-owner-a@example.com',
      password: 'TestPassword123!'
    })
  });
  
  if (!signinResponse.ok) {
    console.log('❌ Signin failed');
    return;
  }
  
  const signinData = await signinResponse.json();
  const userJWT = signinData.data.session.access_token;
  console.log(`   ✅ Authentication successful`);
  
  // Create lead
  const leadData = {
    lead_name: 'Pipeline Test Lead',
    lead_email: 'pipeline.test@example.com'
  };
  
  const createResponse = await fetch(`${API_BASE}/api/leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userJWT}`
    },
    body: JSON.stringify(leadData)
  });
  
  if (!createResponse.ok) {
    console.log('❌ Lead creation failed:', await createResponse.text());
    return;
  }
  
  const createdLead = await createResponse.json();
  const leadId = createdLead.data.id;
  
  console.log(`   ✅ Lead created successfully:`);
  console.log(`   📋 Lead ID: ${leadId}`);
  console.log(`   📧 Email: ${createdLead.data.lead_email}`);
  console.log(`   📊 Initial Status: ${createdLead.data.status}`);
  console.log(`   ⏰ Created At: ${createdLead.data.created_at}\n`);

  // Step 2: Trigger manual processing to test immediately
  console.log('2️⃣ Manually triggering lead processor...');
  
  const processResponse = await fetch(`${PROCESSOR_BASE}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  
  if (processResponse.ok) {
    const processResult = await processResponse.json();
    console.log('   ✅ Manual processing triggered:');
    console.log(`   📊 Total leads found: ${processResult.total_leads_found}`);
    console.log(`   ✅ Successfully processed: ${processResult.successfully_processed}`);
    console.log(`   ❌ Failed processing: ${processResult.failed_processing}\n`);
  } else {
    console.log('   ⚠️ Manual trigger failed, relying on cron schedule\n');
  }

  // Step 3: Wait and check status multiple times
  console.log('3️⃣ Monitoring lead status changes...');
  
  const maxWaitTime = 90; // 90 seconds maximum
  const checkInterval = 10; // Check every 10 seconds
  let currentStatus = 'new';
  let attempts = 0;
  const maxAttempts = Math.ceil(maxWaitTime / checkInterval);
  
  while (attempts < maxAttempts && currentStatus === 'new') {
    attempts++;
    const waitTime = attempts * checkInterval;
    
    console.log(`   ⏰ Checking status (attempt ${attempts}/${maxAttempts}, ${waitTime}s elapsed)...`);
    
    // Check lead status
    const statusResponse = await fetch(`${API_BASE}/api/leads/${leadId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userJWT}`
      }
    });
    
    if (statusResponse.ok) {
      const leadStatus = await statusResponse.json();
      currentStatus = leadStatus.data.status;
      
      console.log(`   📊 Current status: ${currentStatus}`);
      
      if (currentStatus !== 'new') {
        console.log(`   🎯 STATUS CHANGED! New status: ${currentStatus}`);
        console.log(`   ⏱️ Processing completed in ${waitTime} seconds\n`);
        break;
      }
    } else {
      console.log(`   ⚠️ Failed to check status: ${statusResponse.status}`);
    }
    
    if (attempts < maxAttempts && currentStatus === 'new') {
      console.log(`   ⏳ Waiting ${checkInterval} seconds before next check...\n`);
      await new Promise(resolve => setTimeout(resolve, checkInterval * 1000));
    }
  }

  // Step 4: Final result
  console.log('4️⃣ FINAL RESULTS:');
  console.log('================');
  
  if (currentStatus !== 'new') {
    console.log('✅ SUCCESS: Lead processing pipeline working correctly!');
    console.log(`   📊 Final Status: ${currentStatus}`);
    console.log(`   ⏱️ Total Processing Time: ${attempts * checkInterval} seconds`);
    console.log(`   🎯 Expected Result: qualified`);
    console.log(`   ✅ Actual Result: ${currentStatus}`);
    
    if (currentStatus === 'qualified') {
      console.log('   🏆 PERFECT: Lead was correctly qualified as expected!');
    } else {
      console.log('   ⚠️ NOTE: Lead was processed but not qualified (this is normal based on business rules)');
    }
  } else {
    console.log('❌ FAILURE: Lead status did not change within 90 seconds');
    console.log(`   📊 Status remained: ${currentStatus}`);
    console.log('   🔍 Check processor logs for issues');
  }
  
  console.log(`\n📋 Lead ID for further inspection: ${leadId}`);
}

testCompletePipeline().catch(console.error);
