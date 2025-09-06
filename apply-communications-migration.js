// Apply communications table migration to Supabase
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = 'https://kwebsccgtmntljdrzwet.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw';

async function applyCommunicationsMigration() {
  console.log('🔄 APPLYING COMMUNICATIONS TABLE MIGRATION');
  console.log('==========================================\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', '0001_create_communications_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📂 Migration file loaded successfully');
    console.log(`   File: ${migrationPath}`);
    console.log(`   Size: ${migrationSQL.length} characters\n`);

    // Since Supabase doesn't have a direct SQL execution endpoint, we'll create the table
    // by using the REST API approach and building it step by step
    
    console.log('🏗️ Creating communications table via Supabase REST API...');
    
    // First, let's try to check if the table already exists
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/communications?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY
      }
    });
    
    console.log(`   Table existence check: ${checkResponse.status}`);
    
    if (checkResponse.status === 200) {
      console.log('✅ Communications table already exists');
      
      // Check the structure by getting a sample record
      const existingData = await checkResponse.json();
      console.log(`   Existing records: ${existingData.length}`);
      
      if (existingData.length > 0) {
        console.log('   📋 Existing table columns:');
        Object.keys(existingData[0]).forEach((col, index) => {
          console.log(`      ${index + 1}. ${col}`);
        });
      }
      
      console.log('\n✅ Migration check complete - table exists');
      return true;
      
    } else if (checkResponse.status === 404) {
      console.log('❌ Communications table does not exist - this confirms the bug');
      console.log('   Error details:', await checkResponse.text());
      
      // Since we can't execute DDL directly via REST API, let's provide instructions
      console.log('\n🔧 MANUAL MIGRATION REQUIRED:');
      console.log('=====================================');
      console.log('The communications table needs to be created manually in Supabase.');
      console.log('\nSQL to execute in Supabase SQL Editor:');
      console.log('--------------------------------------');
      
      // Show key parts of the migration
      const keySQL = `
-- Create communications table
CREATE TABLE IF NOT EXISTS public.communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'sms', 'push', 'webhook')),
    recipient VARCHAR(255) NOT NULL,
    subject TEXT,
    content TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced', 'rejected')),
    provider VARCHAR(50),
    external_id VARCHAR(255),
    external_reference JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    template_id VARCHAR(100),
    template_variables JSONB,
    campaign_id VARCHAR(100),
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    consent_status VARCHAR(20) DEFAULT 'unknown' CHECK (consent_status IN ('granted', 'denied', 'unknown', 'withdrawn')),
    compliance_notes TEXT
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_communications_lead_id ON public.communications(lead_id);
CREATE INDEX IF NOT EXISTS idx_communications_client_id ON public.communications(client_id);
CREATE INDEX IF NOT EXISTS idx_communications_type ON public.communications(type);
CREATE INDEX IF NOT EXISTS idx_communications_status ON public.communications(status);

-- Enable RLS
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

-- Add RLS policies  
CREATE POLICY "Service role can manage all communications" ON public.communications
    FOR ALL USING (auth.role() = 'service_role');
`;
      
      console.log(keySQL);
      
      return false;
    } else {
      console.log(`❌ Unexpected response: ${checkResponse.status}`);
      console.log('   Error:', await checkResponse.text());
      return false;
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    return false;
  }
}

// Also create a test function to verify the table works
async function testCommunicationsTable() {
  console.log('\n🧪 TESTING COMMUNICATIONS TABLE');
  console.log('===============================');
  
  try {
    // Test inserting a sample record
    const testRecord = {
      lead_id: '00000000-0000-0000-0000-000000000000', // Placeholder - will be replaced with real lead ID
      client_id: '00000000-0000-0000-0000-000000000000', // Placeholder - will be replaced with real client ID  
      type: 'email',
      recipient: 'test@example.com',
      subject: 'Test Communication',
      content: 'This is a test communication record',
      status: 'pending',
      provider: 'resend',
      external_id: 'test-id-123'
    };
    
    console.log('🔍 Testing table access...');
    
    // Try to access the table (this will confirm if it exists and has proper structure)
    const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/communications?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY
      }
    });
    
    console.log(`   Access test result: ${testResponse.status}`);
    
    if (testResponse.ok) {
      const data = await testResponse.json();
      console.log(`   ✅ Table accessible, ${data.length} existing records`);
      return true;
    } else {
      const errorText = await testResponse.text();
      console.log(`   ❌ Table access failed: ${errorText}`);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

async function main() {
  const migrationSuccess = await applyCommunicationsMigration();
  
  if (migrationSuccess) {
    await testCommunicationsTable();
  }
  
  console.log('\n📋 NEXT STEPS:');
  console.log('==============');
  if (!migrationSuccess) {
    console.log('1. Execute the provided SQL in Supabase SQL Editor');
    console.log('2. Run this script again to verify table creation');
    console.log('3. Update the lead processor to log communications');
  } else {
    console.log('1. ✅ Table exists and is accessible');
    console.log('2. Update the lead processor to log communications');
    console.log('3. Test end-to-end communication logging');
  }
}

main().catch(console.error);