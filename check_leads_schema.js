// Check the actual leads table schema
const SUPABASE_URL = 'https://kwebsccgtmntljdrzwet.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw';

async function checkLeadsSchema() {
  console.log('🔍 CHECKING LEADS TABLE SCHEMA');
  console.log('===============================\n');

  // Get a sample lead to see the actual columns
  const sampleResponse = await fetch(`${SUPABASE_URL}/rest/v1/leads?limit=1`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY
    }
  });

  if (sampleResponse.ok) {
    const leads = await sampleResponse.json();
    
    if (leads.length > 0) {
      const lead = leads[0];
      console.log('📋 Actual leads table columns:');
      
      Object.keys(lead).forEach((column, index) => {
        console.log(`   ${index + 1}. ${column}: ${typeof lead[column]} (${lead[column] ? String(lead[column]).substring(0, 50) + (String(lead[column]).length > 50 ? '...' : '') : 'null'})`);
      });
      
      console.log('\n✅ Available columns for updates:', Object.keys(lead).join(', '));
      
      // Check specifically for timestamp columns
      const timestampColumns = Object.keys(lead).filter(col => 
        col.includes('at') || col.includes('time') || col.includes('date')
      );
      
      console.log('⏰ Timestamp-related columns:', timestampColumns.join(', ') || 'None found');
      
    } else {
      console.log('⚠️ No leads found in table');
    }
  } else {
    console.log(`❌ Failed to fetch leads: ${sampleResponse.status}`);
    const errorText = await sampleResponse.text();
    console.log(`Error: ${errorText}`);
  }
}

checkLeadsSchema().catch(console.error);
