// lqs-queue-consumer: Background worker for processing lead qualification
export default {
  async queue(batch, env, ctx) {
    console.log(`[${new Date().toISOString()}] QUEUE_CONSUMER_TRIGGERED:`, {
      batch_size: batch.messages.length,
      queue_name: 'lqs-lead-processing-queue',
      environment: env.ENVIRONMENT || 'UAT'
    });

    // Process each message in the batch
    for (const message of batch.messages) {
      try {
        await processLeadMessage(message, env);
        message.ack(); // Acknowledge successful processing
      } catch (error) {
        console.error(`[${new Date().toISOString()}] QUEUE_MESSAGE_ERROR:`, {
          message_id: message.id,
          error: error.message,
          lead_data: message.body
        });
        message.retry(); // Retry failed messages
      }
    }
  }
};

async function processLeadMessage(message, env) {
  const timestamp = new Date().toISOString();
  const leadData = message.body;
  
  console.log(`[${timestamp}] PROCESSING_LEAD:`, {
    message_id: message.id,
    lead_id: leadData.id,
    lead_email: leadData.lead_email,
    client_id: leadData.client_id,
    current_status: leadData.status
  });

  // Simulate lead qualification logic
  // In a real system, this might involve:
  // - Email validation
  // - Credit checks
  // - Business rules evaluation
  // - External API calls
  
  const qualificationResult = await qualifyLead(leadData);
  
  console.log(`[${timestamp}] QUALIFICATION_RESULT:`, {
    lead_id: leadData.id,
    qualification_result: qualificationResult,
    new_status: qualificationResult.status
  });

  // Update lead status in database
  const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw';
  
  const updateResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/leads?id=eq.${leadData.id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      status: qualificationResult.status,
      qualification_notes: qualificationResult.notes,
      processed_at: timestamp
    })
  });

  if (!updateResponse.ok) {
    const errorData = await updateResponse.json();
    throw new Error(`Failed to update lead status: ${JSON.stringify(errorData)}`);
  }

  const updatedLead = await updateResponse.json();
  
  console.log(`[${timestamp}] LEAD_STATUS_UPDATED:`, {
    lead_id: leadData.id,
    old_status: leadData.status,
    new_status: qualificationResult.status,
    updated_data: updatedLead[0] || updatedLead,
    processing_time_ms: Date.now() - new Date(leadData.created_at).getTime()
  });

  return updatedLead;
}

async function qualifyLead(leadData) {
  // Simple qualification logic for UAT testing
  // In production, this would be more sophisticated
  
  const leadEmail = leadData.lead_email || '';
  const leadName = leadData.lead_name || '';
  
  // Basic qualification rules
  const hasValidEmail = leadEmail.includes('@') && leadEmail.includes('.');
  const hasValidName = leadName.length >= 2;
  const isBusinessDomain = leadEmail.includes('.com') || leadEmail.includes('.org') || leadEmail.includes('.net');
  
  // Simulate processing delay (1-5 seconds)
  const processingDelay = Math.floor(Math.random() * 4000) + 1000;
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