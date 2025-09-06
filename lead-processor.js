// Lead Processing Worker - Polls for new leads and processes them
// This runs as a scheduled worker to simulate queue processing

export default {
  async scheduled(event, env, ctx) {
    console.log(`[${new Date().toISOString()}] LEAD_PROCESSOR_TRIGGERED:`, {
      cron: event.cron,
      scheduledTime: new Date(event.scheduledTime).toISOString(),
      environment: env?.ENVIRONMENT || 'UAT'
    });

    try {
      await processNewLeads(env);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] LEAD_PROCESSOR_ERROR:`, {
        error: error.message,
        stack: error.stack
      });
    }
  },

  // Also handle manual trigger via HTTP for testing
  async fetch(request, env, ctx) {
    if (request.method === 'POST' && new URL(request.url).pathname === '/process') {
      console.log(`[${new Date().toISOString()}] MANUAL_PROCESSING_TRIGGERED`);
      
      try {
        const result = await processNewLeads(env);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Lead Processor Worker', { status: 200 });
  }
};

async function processNewLeads(env) {
  const timestamp = new Date().toISOString();
  const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw';

  console.log(`[${timestamp}] POLLING_FOR_NEW_LEADS`);

  // Fetch leads with status 'new' that need processing
  const leadsResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/leads?status=eq.new&order=created_at.asc&limit=20`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY
    }
  });

  if (!leadsResponse.ok) {
    throw new Error(`Failed to fetch leads: ${leadsResponse.status} ${await leadsResponse.text()}`);
  }

  const newLeads = await leadsResponse.json();
  
  console.log(`[${timestamp}] FOUND_NEW_LEADS:`, {
    count: newLeads.length,
    lead_ids: newLeads.map(lead => lead.id)
  });

  const processedResults = [];

  // Process each new lead
  for (const lead of newLeads) {
    try {
      const result = await processLead(lead, SERVICE_KEY);
      processedResults.push({
        lead_id: lead.id,
        success: true,
        new_status: result.status,
        processing_time_ms: result.processing_time_ms
      });
    } catch (error) {
      console.error(`[${timestamp}] LEAD_PROCESSING_FAILED:`, {
        lead_id: lead.id,
        error: error.message
      });
      
      processedResults.push({
        lead_id: lead.id,
        success: false,
        error: error.message
      });
    }
  }

  const summary = {
    timestamp,
    total_leads_found: newLeads.length,
    successfully_processed: processedResults.filter(r => r.success).length,
    failed_processing: processedResults.filter(r => !r.success).length,
    results: processedResults
  };

  console.log(`[${timestamp}] PROCESSING_COMPLETE:`, summary);
  
  return summary;
}

async function processLead(leadData, serviceKey) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] PROCESSING_LEAD:`, {
    lead_id: leadData.id,
    lead_email: leadData.lead_email,
    client_id: leadData.client_id,
    current_status: leadData.status,
    created_at: leadData.created_at
  });

  // Simulate lead qualification logic
  const qualificationResult = await qualifyLead(leadData);
  
  console.log(`[${timestamp}] QUALIFICATION_RESULT:`, {
    lead_id: leadData.id,
    qualification_result: qualificationResult,
    new_status: qualificationResult.status
  });

  // Update lead status in database
  const updateResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/leads?id=eq.${leadData.id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      status: qualificationResult.status
      // Note: No updated_at column exists in the leads table schema
    })
  });

  if (!updateResponse.ok) {
    const errorData = await updateResponse.json();
    throw new Error(`Failed to update lead status: ${JSON.stringify(errorData)}`);
  }

  const updatedLead = await updateResponse.json();
  const processingTime = Date.now() - startTime;
  
  console.log(`[${timestamp}] LEAD_STATUS_UPDATED:`, {
    lead_id: leadData.id,
    old_status: leadData.status,
    new_status: qualificationResult.status,
    updated_data: updatedLead[0] || updatedLead,
    processing_time_ms: processingTime
  });

  return {
    ...qualificationResult,
    processing_time_ms: processingTime,
    updated_lead: updatedLead[0] || updatedLead
  };
}

async function qualifyLead(leadData) {
  // Simple qualification logic for UAT testing
  const leadEmail = leadData.lead_email || '';
  const leadName = leadData.lead_name || '';
  
  // Basic qualification rules
  const hasValidEmail = leadEmail.includes('@') && leadEmail.includes('.');
  const hasValidName = leadName.length >= 2;
  const isBusinessDomain = leadEmail.includes('.com') || leadEmail.includes('.org') || leadEmail.includes('.net');
  
  // Simulate processing delay (1-3 seconds)
  const processingDelay = Math.floor(Math.random() * 2000) + 1000;
  await new Promise(resolve => setTimeout(resolve, processingDelay));
  
  if (hasValidEmail && hasValidName && isBusinessDomain) {
    return {
      status: 'qualified',
      notes: `Lead qualified after ${processingDelay}ms processing. Valid email domain and complete information.`,
      qualification_score: 85
    };
  } else if (hasValidEmail && hasValidName) {
    return {
      status: 'review',
      notes: `Lead requires manual review. Email domain: ${leadEmail.split('@')[1] || 'unknown'}`,
      qualification_score: 60
    };
  } else {
    return {
      status: 'rejected',
      notes: 'Lead rejected due to incomplete or invalid information.',
      qualification_score: 25
    };
  }
}