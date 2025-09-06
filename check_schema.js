// Check actual database schema to understand the structure
const SUPABASE_URL = 'https://kwebsccgtmntljdrzwet.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw';

async function checkDatabaseSchema() {
  console.log('🔍 Checking database schema...\n');

  try {
    // 1. Check clients table structure by fetching a sample record
    console.log('1. Checking clients table structure:');
    const clientsResponse = await fetch(`${SUPABASE_URL}/rest/v1/clients?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (clientsResponse.ok) {
      const clientsData = await clientsResponse.json();
      console.log('   Sample clients record:');
      if (clientsData.length > 0) {
        console.log('   ' + JSON.stringify(clientsData[0], null, 2));
        console.log('   Available columns:', Object.keys(clientsData[0]));
      } else {
        console.log('   No records found in clients table');
      }
    } else {
      console.log('   Failed to fetch clients:', clientsResponse.status, await clientsResponse.text());
    }

    console.log('\n2. Checking profiles table (alternative):');
    const profilesResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (profilesResponse.ok) {
      const profilesData = await profilesResponse.json();
      console.log('   Sample profiles record:');
      if (profilesData.length > 0) {
        console.log('   ' + JSON.stringify(profilesData[0], null, 2));
        console.log('   Available columns:', Object.keys(profilesData[0]));
      } else {
        console.log('   No records found in profiles table');
      }
    } else {
      console.log('   Failed to fetch profiles:', profilesResponse.status, await profilesResponse.text());
    }

    console.log('\n3. Checking leads table structure:');
    const leadsResponse = await fetch(`${SUPABASE_URL}/rest/v1/leads?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (leadsResponse.ok) {
      const leadsData = await leadsResponse.json();
      console.log('   Sample leads record:');
      if (leadsData.length > 0) {
        console.log('   ' + JSON.stringify(leadsData[0], null, 2));
        console.log('   Available columns:', Object.keys(leadsData[0]));
      } else {
        console.log('   No records found in leads table');
      }
    } else {
      console.log('   Failed to fetch leads:', leadsResponse.status, await leadsResponse.text());
    }

    console.log('\n4. Let\'s check all available tables:');
    const tablesResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Accept': 'application/openapi+json'
      }
    });

    if (tablesResponse.ok) {
      const schema = await tablesResponse.json();
      const tables = Object.keys(schema.definitions || {});
      console.log('   Available tables:', tables);
    }

  } catch (error) {
    console.error('Error checking schema:', error);
  }
}

checkDatabaseSchema();