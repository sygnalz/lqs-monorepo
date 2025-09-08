const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw';
const SUPABASE_URL = 'https://kwebsccgtmntljdrzwet.supabase.co';

async function checkAndSetupClientsTable() {
  console.log("🔍 Checking clients table structure...");
  
  try {
    // First, check if the clients table exists by trying to query it
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/clients?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (checkResponse.ok) {
      console.log("✅ Clients table already exists and is accessible");
      
      // Get table structure
      const data = await checkResponse.json();
      console.log("📊 Current clients table data count:", data.length);
      
      return true;
    } else if (checkResponse.status === 404) {
      console.log("❗ Clients table does not exist");
      console.log("📝 Please manually execute the following SQL in Supabase SQL Editor:");
      console.log(`
-- Create the clients table
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
      `);
      return false;
    } else {
      const errorText = await checkResponse.text();
      console.error("❌ Error checking clients table:", errorText);
      return false;
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    return false;
  }
}

// Also check the companies table to ensure it exists
async function checkCompaniesTable() {
  console.log("🔍 Verifying companies table exists...");
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/companies?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log("✅ Companies table exists with", data.length, "records");
      return true;
    } else {
      console.error("❌ Companies table not accessible");
      return false;
    }
  } catch (error) {
    console.error("❌ Error checking companies table:", error.message);
    return false;
  }
}

async function main() {
  console.log("🚀 Starting database schema verification...");
  
  const companiesOk = await checkCompaniesTable();
  const clientsOk = await checkAndSetupClientsTable();
  
  if (companiesOk && clientsOk) {
    console.log("🎉 Database schema verification complete!");
    return true;
  } else {
    console.log("💥 Database schema issues detected. Please address them before proceeding.");
    return false;
  }
}

main()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error("💥 Unexpected error:", error);
    process.exit(1);
  });