// Setup database-based queue system using Supabase
const SUPABASE_URL = 'https://kwebsccgtmntljdrzwet.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw';

async function createQueueTable() {
  console.log('🔄 Creating database-based queue table for lead processing...');

  // Create lead_processing_queue table
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS lead_processing_queue (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      message_data JSONB NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 3,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      processed_at TIMESTAMP WITH TIME ZONE,
      error_message TEXT,
      
      -- Indexes for efficient processing
      INDEX idx_queue_status_created (status, created_at),
      INDEX idx_queue_lead_id (lead_id)
    );
    
    -- Add RLS policy for queue table
    ALTER TABLE lead_processing_queue ENABLE ROW LEVEL SECURITY;
    
    -- Policy to allow service role full access
    CREATE POLICY "Service role can manage queue" ON lead_processing_queue
    FOR ALL USING (auth.role() = 'service_role');
  `;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql: createTableSQL
      })
    });

    if (!response.ok) {
      // Try alternative approach - create table via raw SQL execution
      const tableResponse = await fetch(`${SUPABASE_URL}/rest/v1/lead_processing_queue`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({}) // This will fail but help us understand the schema
      });
      
      console.log('Table creation attempt response:', response.status, await response.text());
      console.log('Direct table access attempt:', tableResponse.status, await tableResponse.text());
    } else {
      console.log('✅ Queue table created successfully');
    }
  } catch (error) {
    console.error('❌ Error creating queue table:', error.message);
  }

  // Test queue table access
  console.log('\n🧪 Testing queue table access...');
  try {
    const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/lead_processing_queue?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY
      }
    });
    
    console.log(`Queue table access test: ${testResponse.status} ${testResponse.statusText}`);
    
    if (testResponse.ok) {
      const data = await testResponse.json();
      console.log('✅ Queue table is accessible, current records:', data.length);
    } else {
      const errorData = await testResponse.text();
      console.log('❌ Queue table access failed:', errorData);
      
      // Try to create a simple version manually
      console.log('\n🔧 Attempting to create minimal queue structure...');
      await createMinimalQueue();
    }
  } catch (error) {
    console.error('❌ Error testing queue table:', error.message);
  }
}

async function createMinimalQueue() {
  // Since we can't create tables directly, we'll use the existing leads table 
  // and add processing fields to it
  console.log('🔧 Setting up queue processing using leads table extensions...');
  
  // Check if we can add columns to leads table
  try {
    // Test updating a lead with processing fields
    const testLead = await fetch(`${SUPABASE_URL}/rest/v1/leads?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY
      }
    });
    
    if (testLead.ok) {
      const leads = await testLead.json();
      if (leads.length > 0) {
        const leadId = leads[0].id;
        
        // Test adding processing fields to existing lead
        const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${leadId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'apikey': SERVICE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            processing_status: 'pending',
            processing_attempts: 0,
            last_processing_attempt: new Date().toISOString()
          })
        });
        
        console.log(`Leads table processing fields test: ${updateResponse.status}`);
        
        if (updateResponse.ok) {
          console.log('✅ Can use leads table for queue processing');
          return true;
        } else {
          const errorData = await updateResponse.text();
          console.log('❌ Cannot add processing fields to leads table:', errorData);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error setting up minimal queue:', error.message);
  }
  
  return false;
}

createQueueTable().catch(console.error);