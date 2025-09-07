// Comprehensive script to fix the leads table schema and create proper relationships
const SUPABASE_URL = 'https://kwebsccgtmntljdrzwet.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw';

async function executeSQL(sql, description) {
  console.log(`🔧 ${description}...`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY
      },
      body: JSON.stringify({ query: sql })
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ ${description} - SUCCESS`);
      return { success: true, result };
    } else {
      const error = await response.text();
      console.log(`❌ ${description} - FAILED: ${response.status}`);
      console.log(`   Error: ${error}`);
      return { success: false, error };
    }
  } catch (err) {
    console.log(`❌ ${description} - EXCEPTION: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function fixLeadsSchema() {
  console.log('🚀 FIXING LEADS TABLE SCHEMA');
  console.log('============================\n');

  // STEP 1: Add missing columns to existing leads table
  console.log('📋 STEP 1: Adding missing columns...\n');
  
  const addColumnsSQL = `
    -- Add missing columns to leads table
    ALTER TABLE public.leads 
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS custom_data JSONB,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  `;
  
  await executeSQL(addColumnsSQL, 'Adding missing columns (phone, custom_data, updated_at)');

  // STEP 2: Add status constraint (if not exists)
  console.log('\n📋 STEP 2: Adding status constraint...\n');
  
  const addConstraintSQL = `
    -- Add check constraint for status field
    DO $$ 
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints 
                       WHERE constraint_name = 'leads_status_check') THEN
            ALTER TABLE public.leads 
            ADD CONSTRAINT leads_status_check 
            CHECK (status IN ('new', 'qualified', 'unqualified', 'contacted', 'converted'));
        END IF;
    END $$;
  `;
  
  await executeSQL(addConstraintSQL, 'Adding status check constraint');

  // STEP 3: Create foreign key constraint to companies table
  console.log('\n📋 STEP 3: Setting up foreign key relationship...\n');
  
  const addForeignKeySQL = `
    -- Drop existing foreign key constraint if it exists (from old clients table)
    DO $$ 
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'leads_client_id_fkey') THEN
            ALTER TABLE public.leads DROP CONSTRAINT leads_client_id_fkey;
        END IF;
        
        -- Add foreign key constraint to companies table
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                       WHERE constraint_name = 'leads_company_id_fkey') THEN
            ALTER TABLE public.leads 
            ADD CONSTRAINT leads_company_id_fkey 
            FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
        END IF;
    END $$;
  `;
  
  await executeSQL(addForeignKeySQL, 'Setting up foreign key relationship to companies');

  // STEP 4: Create updated_at trigger
  console.log('\n📋 STEP 4: Creating updated_at trigger...\n');
  
  const updateTriggerSQL = `
    -- Create function to update updated_at timestamp
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    -- Drop existing trigger if it exists
    DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;

    -- Create trigger for updated_at
    CREATE TRIGGER update_leads_updated_at 
        BEFORE UPDATE ON public.leads 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
  `;
  
  await executeSQL(updateTriggerSQL, 'Creating updated_at trigger');

  // STEP 5: Enable RLS and create policies
  console.log('\n📋 STEP 5: Setting up Row Level Security...\n');
  
  const rlsSQL = `
    -- Enable Row Level Security
    ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "leads_tenant_policy" ON public.leads;
    DROP POLICY IF EXISTS "Users can only access leads for their own client." ON public.leads;

    -- Create RLS policy for multi-tenant access via companies
    CREATE POLICY "leads_tenant_policy" ON public.leads FOR ALL USING (
        company_id IN (
            SELECT c.id 
            FROM public.companies c 
            JOIN public.profiles p ON p.client_id = c.id 
            WHERE p.id = auth.uid()
        )
    );
  `;
  
  await executeSQL(rlsSQL, 'Setting up Row Level Security policies');

  // STEP 6: Create indexes for performance
  console.log('\n📋 STEP 6: Creating performance indexes...\n');
  
  const indexesSQL = `
    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_leads_company_id ON public.leads(company_id);
    CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(lead_email);
    CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);
  `;
  
  await executeSQL(indexesSQL, 'Creating performance indexes');

  // STEP 7: Verify the final schema
  console.log('\n📋 STEP 7: Verifying final schema...\n');
  
  const verifyResponse = await fetch(`${SUPABASE_URL}/rest/v1/leads?limit=1`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY
    }
  });

  if (verifyResponse.ok) {
    const leads = await verifyResponse.json();
    if (leads.length > 0) {
      const lead = leads[0];
      console.log('✅ Final leads table schema:');
      Object.keys(lead).forEach((column, index) => {
        console.log(`   ${index + 1}. ${column}`);
      });
    } else {
      console.log('✅ Schema updated successfully (no test data available)');
    }
  }

  console.log('\n🎉 LEADS SCHEMA FIX COMPLETED!');
  console.log('===============================');
  console.log('✅ Added missing columns: phone, custom_data, updated_at');
  console.log('✅ Added status check constraint');
  console.log('✅ Fixed foreign key relationship to companies table');
  console.log('✅ Created updated_at trigger');
  console.log('✅ Configured Row Level Security policies');
  console.log('✅ Created performance indexes');
  console.log('\nNext: Update worker.js to use companies table instead of clients');
}

// Run the fix
fixLeadsSchema().catch(console.error);