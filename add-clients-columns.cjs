const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw';
const SUPABASE_URL = 'https://kwebsccgtmntljdrzwet.supabase.co';

async function addMissingColumns() {
  console.log("🔧 Adding missing columns to clients table...");
  
  try {
    // Since we can't execute ALTER TABLE directly, let's recreate with the correct structure
    // First, let's check if there are any existing records
    const existingResponse = await fetch(`${SUPABASE_URL}/rest/v1/clients`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const existingData = await existingResponse.json();
    console.log("📊 Existing clients:", existingData.length);
    
    if (existingData.length > 0) {
      console.log("⚠️ Found existing data. This script will need to be run through Supabase SQL Editor.");
      console.log("📝 Please execute the following SQL in Supabase SQL Editor:");
      console.log(`
-- Add missing columns to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS primary_contact_name TEXT,
ADD COLUMN IF NOT EXISTS primary_contact_email TEXT,
ADD COLUMN IF NOT EXISTS primary_contact_phone TEXT;

-- Set company_id to the first company for existing records (if any)
UPDATE public.clients 
SET company_id = (SELECT id FROM public.companies LIMIT 1)
WHERE company_id IS NULL;

-- Make company_id NOT NULL after setting values
ALTER TABLE public.clients 
ALTER COLUMN company_id SET NOT NULL;
      `);
      return false;
    } else {
      console.log("✅ No existing data, safe to recreate table structure");
      
      // For now, let's try to work with what we have and see if we can add columns via API
      // This might not work, but let's try
      console.log("📝 Will need to manually execute ALTER TABLE in Supabase SQL Editor:");
      console.log(`
-- Add missing columns to clients table
ALTER TABLE public.clients 
ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL DEFAULT (SELECT id FROM public.companies LIMIT 1),
ADD COLUMN primary_contact_name TEXT,
ADD COLUMN primary_contact_email TEXT,
ADD COLUMN primary_contact_phone TEXT;
      `);
      
      return false; // Manual intervention required
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    return false;
  }
}

addMissingColumns()
  .then(success => {
    if (success) {
      console.log("🎉 Schema update complete!");
    } else {
      console.log("📋 Manual SQL execution required in Supabase SQL Editor");
    }
  });