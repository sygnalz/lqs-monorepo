const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw';
const SUPABASE_URL = 'https://kwebsccgtmntljdrzwet.supabase.co';

async function checkTableSchema() {
  console.log("🔍 Checking clients table schema...");
  
  try {
    // Get table information from PostgreSQL information schema
    const schemaQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'clients' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;
    
    // Try to get table schema via RPC call
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_table_info`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        table_name: 'clients'
      })
    });
    
    if (!response.ok) {
      // Fallback: Try to insert a test record to see what columns exist
      console.log("📝 Trying to create minimal test record to check schema...");
      const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/clients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          name: 'Test Client'
        })
      });
      
      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        console.error("❌ Test insert failed:", errorText);
        
        // Try to see what the actual error tells us about the schema
        if (errorText.includes('company_id')) {
          console.log("🔧 The company_id column is missing. Let's check what columns exist...");
          
          // Try a minimal insert to see what's required
          const minimalResponse = await fetch(`${SUPABASE_URL}/rest/v1/clients`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'apikey': SERVICE_ROLE_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
          });
          
          const minimalError = await minimalResponse.text();
          console.log("📋 Minimal insert error (shows required fields):", minimalError);
        }
      } else {
        const result = await testResponse.json();
        console.log("✅ Test insert successful. Current schema supports:", Object.keys(result[0] || {}));
        
        // Delete the test record
        if (result[0]?.id) {
          await fetch(`${SUPABASE_URL}/rest/v1/clients?id=eq.${result[0].id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'apikey': SERVICE_ROLE_KEY
            }
          });
          console.log("🧹 Cleaned up test record");
        }
      }
    }
    
    // Check companies table structure for reference
    console.log("🏢 Checking companies table structure...");
    const companiesResponse = await fetch(`${SUPABASE_URL}/rest/v1/companies?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (companiesResponse.ok) {
      const companiesData = await companiesResponse.json();
      if (companiesData.length > 0) {
        console.log("✅ Companies table structure:", Object.keys(companiesData[0]));
        console.log("📊 Sample company:", companiesData[0]);
      }
    }
    
  } catch (error) {
    console.error("❌ Error checking schema:", error.message);
  }
}

checkTableSchema();