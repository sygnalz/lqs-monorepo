const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw';
const SUPABASE_URL = 'https://kwebsccgtmntljdrzwet.supabase.co';

async function fixClientsSchema() {
  console.log("🔧 Checking current clients table schema...");
  
  try {
    // First, check if client_id column already exists
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/clients?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (!checkResponse.ok) {
      const error = await checkResponse.text();
      console.log("📋 Current error from clients table:", error);
      
      if (error.includes("client_id")) {
        console.log("✅ Error confirms client_id column is missing - this is expected");
        console.log("📝 Manual SQL execution required in Supabase SQL Editor:");
        console.log(`
-- Execute this SQL in Supabase SQL Editor to fix the schema:

ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Set client_id to match company_id for existing records
UPDATE public.clients 
SET client_id = company_id 
WHERE client_id IS NULL AND company_id IS NOT NULL;

-- Make client_id NOT NULL after setting values
ALTER TABLE public.clients 
ALTER COLUMN client_id SET NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.clients.client_id IS 'Foreign key to the company that this client belongs to. Matches worker.js expectations.';

-- Verify the fix
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'clients' AND table_schema = 'public'
ORDER BY ordinal_position;
        `);
        return false;
      }
    } else {
      console.log("✅ Clients table accessible - checking for client_id column...");
      const data = await checkResponse.json();
      console.log("📊 Sample record structure:", Object.keys(data[0] || {}));
      
      if (data.length > 0 && data[0].client_id !== undefined) {
        console.log("✅ client_id column already exists!");
        return true;
      } else {
        console.log("❌ client_id column missing - manual SQL execution required");
        return false;
      }
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.log("📝 Manual SQL execution required - see fix-clients-client-id-column.sql");
    return false;
  }
}

fixClientsSchema()
  .then(success => {
    if (success) {
      console.log("🎉 Schema is ready!");
    } else {
      console.log("📋 Please execute the SQL manually in Supabase SQL Editor");
      console.log("📄 SQL file: fix-clients-client-id-column.sql");
    }
  });
