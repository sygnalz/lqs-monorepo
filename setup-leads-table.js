// Script to create leads table in Supabase
const SUPABASE_URL = 'https://kwebsccgtmntljdrzwet.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw';

async function setupLeadsTable() {
  console.log('Setting up leads table...');
  
  // Create leads table SQL
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS public.leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
      lead_name TEXT NOT NULL,
      lead_email TEXT NOT NULL,
      phone TEXT,
      custom_data JSONB,
      status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'qualified', 'unqualified', 'contacted', 'converted')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Enable Row Level Security
    ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

    -- Create RLS policy for leads
    CREATE POLICY "Users can only access leads for their own client." ON public.leads FOR ALL USING (
      client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_leads_client_id ON public.leads(client_id);
    CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(lead_email);
  `;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        sql: createTableSQL
      })
    });

    if (response.ok) {
      console.log('✅ Leads table setup completed successfully');
    } else {
      console.log('⚠️  Leads table may already exist or setup using alternative method needed');
    }
  } catch (error) {
    console.log('⚠️  Table creation via RPC not available, leads table may need manual setup');
  }
}

// Run the setup
setupLeadsTable();