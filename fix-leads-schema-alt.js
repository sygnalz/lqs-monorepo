// Alternative approach using individual SQL operations
const SUPABASE_URL = 'https://kwebsccgtmntljdrzwet.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw';

async function analyzeCurrentSchema() {
  console.log('🔍 ANALYZING CURRENT LEADS TABLE');
  console.log('=================================\n');

  // Get current schema by examining a sample record
  const response = await fetch(`${SUPABASE_URL}/rest/v1/leads?limit=1`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY
    }
  });

  if (response.ok) {
    const leads = await response.json();
    
    if (leads.length > 0) {
      const lead = leads[0];
      console.log('📋 Current leads table columns:');
      
      const columns = Object.keys(lead);
      columns.forEach((column, index) => {
        console.log(`   ${index + 1}. ${column}: ${typeof lead[column]}`);
      });
      
      console.log('\n🔍 Analysis:');
      console.log('   Current columns:', columns.join(', '));
      
      const expectedColumns = ['id', 'company_id', 'lead_name', 'lead_email', 'phone', 'custom_data', 'status', 'created_at', 'updated_at'];
      const missingColumns = expectedColumns.filter(col => !columns.includes(col));
      
      if (missingColumns.length > 0) {
        console.log('   ❌ Missing columns:', missingColumns.join(', '));
      } else {
        console.log('   ✅ All expected columns present');
      }
      
      // Test if we can add a field to see if the structure allows modifications
      console.log('\n🧪 Testing lead creation with missing fields...');
      
      try {
        const testLead = {
          company_id: lead.company_id, // Use existing company_id
          lead_name: 'Test Lead for Schema Check',
          lead_email: 'test.schema@example.com',
          phone: '+1234567890', // This should fail if column doesn't exist
          custom_data: { test: 'data' }, // This should fail if column doesn't exist
          status: 'new'
        };
        
        const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'apikey': SERVICE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(testLead)
        });
        
        if (createResponse.ok) {
          const createdLead = await createResponse.json();
          console.log('   ✅ Test lead created successfully - schema supports all fields');
          
          // Clean up test lead
          if (Array.isArray(createdLead) && createdLead.length > 0) {
            await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${createdLead[0].id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'apikey': SERVICE_KEY
              }
            });
            console.log('   🧹 Test lead cleaned up');
          }
        } else {
          const error = await createResponse.json();
          console.log('   ❌ Test lead creation failed:', error.message);
          console.log('   🔧 This indicates missing columns or constraints');
        }
      } catch (testError) {
        console.log('   ❌ Test lead creation exception:', testError.message);
      }
      
    } else {
      console.log('⚠️ No leads found in table - cannot analyze current schema');
    }
  } else {
    console.log(`❌ Failed to fetch leads: ${response.status}`);
    const errorText = await response.text();
    console.log(`Error: ${errorText}`);
  }
}

async function attemptDirectSchemaFix() {
  console.log('\n🔧 ATTEMPTING DIRECT SCHEMA MODIFICATIONS');
  console.log('==========================================\n');
  
  // Since SQL RPC isn't available, we'll need to work within REST API limitations
  // Let's try to use the raw SQL approach from the existing scripts
  
  console.log('⚠️  Note: Direct schema modifications via REST API are limited.');
  console.log('   The following SQL needs to be run in Supabase SQL Editor:');
  console.log('   Dashboard → SQL Editor → New Query\n');
  
  const sqlScript = `
-- LQS Leads Schema Fix Script
-- Run this in Supabase SQL Editor

-- Step 1: Add missing columns
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS custom_data JSONB,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 2: Add status constraint
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                   WHERE constraint_name = 'leads_status_check') THEN
        ALTER TABLE public.leads 
        ADD CONSTRAINT leads_status_check 
        CHECK (status IN ('new', 'qualified', 'unqualified', 'contacted', 'converted'));
    END IF;
END $$;

-- Step 3: Fix foreign key relationship
DO $$ 
BEGIN
    -- Drop old foreign key if exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'leads_client_id_fkey') THEN
        ALTER TABLE public.leads DROP CONSTRAINT leads_client_id_fkey;
    END IF;
    
    -- Add new foreign key to companies
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'leads_company_id_fkey') THEN
        ALTER TABLE public.leads 
        ADD CONSTRAINT leads_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 4: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;

CREATE TRIGGER update_leads_updated_at 
    BEFORE UPDATE ON public.leads 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Step 5: Configure RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_tenant_policy" ON public.leads;
DROP POLICY IF EXISTS "Users can only access leads for their own client." ON public.leads;

CREATE POLICY "leads_tenant_policy" ON public.leads FOR ALL USING (
    company_id IN (
        SELECT c.id 
        FROM public.companies c 
        JOIN public.profiles p ON p.client_id = c.id 
        WHERE p.id = auth.uid()
    )
);

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON public.leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(lead_email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);

-- Verification query
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'leads' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
`;

  console.log(sqlScript);
  console.log('\n📋 After running the SQL script above, run this verification:');
  console.log('   SELECT * FROM public.leads LIMIT 1;');
  
  return sqlScript;
}

// Run analysis and generate fix script
analyzeCurrentSchema()
  .then(() => attemptDirectSchemaFix())
  .catch(console.error);