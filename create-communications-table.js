// Create communications table using alternative approach
const SUPABASE_URL = 'https://kwebsccgtmntljdrzwet.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw';

async function createCommunicationsTable() {
  console.log('🚀 ATTEMPTING TO CREATE COMMUNICATIONS TABLE');
  console.log('==============================================\n');

  // Since we cannot execute DDL directly, let's try an alternative approach
  // We'll attempt to create the table by making a POST request with all required fields
  // This may trigger Supabase to create the table structure automatically (if possible)
  
  console.log('🔧 Attempting alternative table creation method...');
  
  try {
    // First, let's check what tables DO exist by looking at existing ones
    console.log('1️⃣ Checking existing database structure...');
    
    const leadsCheck = await fetch(`${SUPABASE_URL}/rest/v1/leads?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY
      }
    });
    
    console.log(`   Leads table: ${leadsCheck.status} ${leadsCheck.statusText}`);
    
    const clientsCheck = await fetch(`${SUPABASE_URL}/rest/v1/clients?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY
      }
    });
    
    console.log(`   Clients table: ${clientsCheck.status} ${clientsCheck.statusText}`);
    
    // Since we need manual table creation, let's provide a comprehensive solution
    console.log('\n2️⃣ Preparing manual table creation solution...');
    
    // Create a comprehensive SQL file that can be executed manually
    const createTableSQL = `
-- =====================================================
-- COMMUNICATIONS TABLE CREATION SCRIPT
-- Execute this in Supabase SQL Editor
-- =====================================================

-- Step 1: Create the communications table
CREATE TABLE IF NOT EXISTS public.communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign key references
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    
    -- Communication details
    type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'sms', 'push', 'webhook')),
    recipient VARCHAR(255) NOT NULL,
    subject TEXT,
    content TEXT,
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced', 'rejected')),
    
    -- Third-party integration
    provider VARCHAR(50),
    external_id VARCHAR(255),
    external_reference JSONB,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Template and campaign support
    template_id VARCHAR(100),
    template_variables JSONB,
    campaign_id VARCHAR(100),
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    
    -- Compliance
    consent_status VARCHAR(20) DEFAULT 'unknown' CHECK (consent_status IN ('granted', 'denied', 'unknown', 'withdrawn')),
    compliance_notes TEXT
);

-- Step 2: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_communications_lead_id ON public.communications(lead_id);
CREATE INDEX IF NOT EXISTS idx_communications_client_id ON public.communications(client_id);
CREATE INDEX IF NOT EXISTS idx_communications_type ON public.communications(type);
CREATE INDEX IF NOT EXISTS idx_communications_status ON public.communications(status);
CREATE INDEX IF NOT EXISTS idx_communications_created_at ON public.communications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communications_provider ON public.communications(provider);

-- Step 3: Enable Row Level Security
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

-- Step 4: Create security policies
CREATE POLICY "Service role can manage all communications" 
ON public.communications FOR ALL 
USING (auth.role() = 'service_role');

CREATE POLICY "Users can view communications for their client" 
ON public.communications FOR SELECT 
USING (
    client_id IN (
        SELECT p.client_id 
        FROM public.profiles p 
        WHERE p.id = auth.uid()
    )
);

-- Step 5: Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_communications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_communications_updated_at
    BEFORE UPDATE ON public.communications
    FOR EACH ROW
    EXECUTE FUNCTION update_communications_updated_at();

-- Step 6: Add table comments
COMMENT ON TABLE public.communications IS 'Audit log for all outbound communications';
COMMENT ON COLUMN public.communications.lead_id IS 'Reference to the lead that triggered this communication';
COMMENT ON COLUMN public.communications.type IS 'Communication type: email, sms, push, webhook';
COMMENT ON COLUMN public.communications.status IS 'Status: pending, sent, delivered, failed, bounced, rejected';
COMMENT ON COLUMN public.communications.external_id IS 'ID from third-party service (Resend, Twilio, etc.)';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify table was created
SELECT table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'communications' 
ORDER BY ordinal_position;

-- Test table access
SELECT COUNT(*) as record_count FROM public.communications;

-- =====================================================
-- END OF SCRIPT
-- =====================================================
`;

    // Write the SQL to a file for easy access
    console.log('   📝 Creating comprehensive SQL migration file...');
    
    // Save to a file
    import('fs').then(fs => {
      fs.writeFileSync('./communications-table-creation.sql', createTableSQL);
      console.log('   ✅ SQL file created: communications-table-creation.sql');
    });
    
    // Show the critical parts
    console.log('\n3️⃣ IMMEDIATE ACTION REQUIRED:');
    console.log('=============================');
    console.log('Copy and execute this SQL in Supabase SQL Editor:');
    console.log('\n' + createTableSQL);
    
    return false; // Indicates manual intervention needed
    
  } catch (error) {
    console.error('❌ Error in table creation process:', error.message);
    return false;
  }
}

async function main() {
  const success = await createCommunicationsTable();
  
  if (!success) {
    console.log('\n📋 MANUAL STEPS REQUIRED:');
    console.log('========================');
    console.log('1. Go to Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Execute the provided SQL script');
    console.log('4. Run verification queries to confirm table creation');
    console.log('5. Re-run this script to test table access\n');
  }
}

main().catch(console.error);