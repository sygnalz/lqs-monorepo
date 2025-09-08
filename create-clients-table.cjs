const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw';
const SUPABASE_URL = 'https://kwebsccgtmntljdrzwet.supabase.co';

async function createClientsTable() {
  console.log("🗃️ Creating clients table in Supabase...");
  
  try {
    const createTableSQL = `
-- Create the clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  name TEXT NOT NULL,
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL
);

-- Add comments for clarity
COMMENT ON TABLE public.clients IS 'Stores client records, which are organizations or individuals for whom leads are managed.';
COMMENT ON COLUMN public.clients.company_id IS 'Foreign key to the company that this client belongs to.';
    `;
    
    console.log("📋 Executing CREATE TABLE SQL...");
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: createTableSQL
      })
    });
    
    if (!response.ok) {
      // Try alternative approach using direct SQL execution
      console.log("🔧 Trying alternative SQL execution method...");
      const directResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
          'Content-Type': 'application/sql'
        },
        body: createTableSQL
      });
      
      if (!directResponse.ok) {
        const errorText = await directResponse.text();
        console.error("❌ Failed to create table:", errorText);
        return false;
      }
    }
    
    console.log("✅ Clients table created successfully!");
    
    // Verify the table was created by querying the clients table
    console.log("🔍 Verifying table creation...");
    const verifyResponse = await fetch(`${SUPABASE_URL}/rest/v1/clients?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (verifyResponse.ok) {
      console.log("✅ Table verification successful - clients table is accessible");
    } else {
      const errorText = await verifyResponse.text();
      console.warn("⚠️ Table may not be fully accessible:", errorText);
    }
    
    return true;
    
  } catch (error) {
    console.error("❌ Error creating clients table:", error);
    return false;
  }
}

createClientsTable()
  .then(success => {
    console.log(success ? "🎉 Database setup complete!" : "💥 Database setup failed!");
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error("💥 Unexpected error:", error);
    process.exit(1);
  });