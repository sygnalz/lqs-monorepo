const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw';
const SUPABASE_URL = 'https://kwebsccgtmntljdrzwet.supabase.co';

async function recreateClientsTable() {
  console.log("🔧 Recreating clients table with correct schema...");
  
  try {
    // Step 1: Check existing data
    const existingResponse = await fetch(`${SUPABASE_URL}/rest/v1/clients`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY
      }
    });
    
    const existingData = await existingResponse.json();
    console.log("📊 Found", existingData.length, "existing clients");
    
    // Step 2: Drop existing table (since it has wrong schema)
    console.log("🗑️ Dropping existing clients table...");
    
    // Try to drop via API (might not work, but let's try)
    const dropResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'DROP TABLE IF EXISTS public.clients CASCADE;'
      })
    });
    
    if (!dropResponse.ok) {
      console.log("⚠️ Cannot drop table via API. Manual intervention required.");
      console.log("📝 Please execute this SQL in Supabase SQL Editor:");
      console.log(`
-- Drop and recreate clients table with correct schema
DROP TABLE IF EXISTS public.clients CASCADE;

-- Create clients table with correct schema
CREATE TABLE public.clients (
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

-- Disable RLS as per directive
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
      `);
      return false;
    }
    
    // Step 3: Create new table with correct schema
    console.log("📋 Creating clients table with correct schema...");
    const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `
CREATE TABLE public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  name TEXT NOT NULL,
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL
);

COMMENT ON TABLE public.clients IS 'Stores client records, which are organizations or individuals for whom leads are managed.';
COMMENT ON COLUMN public.clients.company_id IS 'Foreign key to the company that this client belongs to.';

ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
        `
      })
    });
    
    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error("❌ Failed to create table:", error);
      return false;
    }
    
    console.log("✅ Clients table recreated successfully!");
    return true;
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    return false;
  }
}

recreateClientsTable()
  .then(success => {
    if (success) {
      console.log("🎉 Schema recreation complete!");
    } else {
      console.log("📋 Manual SQL execution required - see output above");
    }
  });