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

  // SEND EMAIL NOTIFICATION AND LOG TO COMMUNICATIONS TABLE
  let emailResult = null;
  if (qualificationResult.status === 'qualified') {
    try {
      emailResult = await sendQualificationEmail(leadData, qualificationResult, serviceKey);
      console.log(`[${timestamp}] EMAIL_NOTIFICATION_RESULT:`, {
        lead_id: leadData.id,
        email_success: emailResult.success,
        communication_id: emailResult.communication_id,
        external_id: emailResult.external_id
      });
    } catch (emailError) {
      console.error(`[${timestamp}] EMAIL_NOTIFICATION_ERROR:`, {
        lead_id: leadData.id,
        error: emailError.message
      });
    }
  }

  return {
    ...qualificationResult,
    processing_time_ms: processingTime,
    updated_lead: updatedLead[0] || updatedLead,
    email_result: emailResult
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

async function sendQualificationEmail(leadData, qualificationResult, serviceKey) {
  const timestamp = new Date().toISOString();
  
  console.log(`[${timestamp}] SENDING_QUALIFICATION_EMAIL:`, {
    lead_id: leadData.id,
    recipient: leadData.lead_email,
    qualification_status: qualificationResult.status
  });

  // Email content based on qualification result
  const emailSubject = `Welcome ${leadData.lead_name} - Your Lead Status Update`;
  const emailContent = generateEmailContent(leadData, qualificationResult);
  
  // Log communication attempt to database BEFORE sending
  const communicationRecord = {
    lead_id: leadData.id,
    client_id: leadData.client_id,
    type: 'email',
    recipient: leadData.lead_email,
    subject: emailSubject,
    content: emailContent,
    status: 'pending',
    provider: 'resend',
    template_id: 'lead-qualification-notification',
    template_variables: {
      lead_name: leadData.lead_name,
      lead_email: leadData.lead_email,
      qualification_status: qualificationResult.status,
      qualification_score: qualificationResult.qualification_score,
      notes: qualificationResult.notes
    },
    priority: 5,
    consent_status: 'granted' // Assuming consent for lead notifications
  };

  // Create communication record
  let communicationId = null;
  try {
    const logResponse = await logCommunication(communicationRecord, serviceKey);
    communicationId = logResponse.id;
    console.log(`[${timestamp}] COMMUNICATION_LOGGED:`, {
      lead_id: leadData.id,
      communication_id: communicationId,
      status: 'pending'
    });
  } catch (logError) {
    console.error(`[${timestamp}] COMMUNICATION_LOG_ERROR:`, {
      lead_id: leadData.id,
      error: logError.message
    });
    // Continue with email sending even if logging fails
  }

  // Send email via Resend API (simulated for UAT - would use real API in production)
  let emailResult;
  try {
    emailResult = await sendEmailViaResend(emailSubject, emailContent, leadData.lead_email);
    
    // Update communication record with success
    if (communicationId) {
      await updateCommunicationStatus(communicationId, {
        status: emailResult.success ? 'sent' : 'failed',
        external_id: emailResult.external_id,
        sent_at: timestamp,
        error_message: emailResult.error || null,
        external_reference: emailResult.response
      }, serviceKey);
    }

    console.log(`[${timestamp}] EMAIL_SENT_RESULT:`, {
      lead_id: leadData.id,
      success: emailResult.success,
      external_id: emailResult.external_id,
      communication_id: communicationId
    });

    return {
      success: emailResult.success,
      communication_id: communicationId,
      external_id: emailResult.external_id,
      provider: 'resend',
      error: emailResult.error
    };

  } catch (emailError) {
    // Update communication record with failure
    if (communicationId) {
      await updateCommunicationStatus(communicationId, {
        status: 'failed',
        error_message: emailError.message,
        external_reference: { error: emailError.message }
      }, serviceKey);
    }

    console.error(`[${timestamp}] EMAIL_SEND_ERROR:`, {
      lead_id: leadData.id,
      error: emailError.message,
      communication_id: communicationId
    });

    return {
      success: false,
      communication_id: communicationId,
      external_id: null,
      provider: 'resend',
      error: emailError.message
    };
  }
}

async function logCommunication(communicationData, serviceKey) {
  // Insert communication record into communications table
  const response = await fetch('https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/communications', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(communicationData)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to log communication: ${JSON.stringify(errorData)}`);
  }

  const result = await response.json();
  return result[0] || result;
}

async function updateCommunicationStatus(communicationId, updateData, serviceKey) {
  // Update communication record status
  const response = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/communications?id=eq.${communicationId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(updateData)
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Failed to update communication status:', errorData);
  }

  return response.ok;
}

async function sendEmailViaResend(subject, content, recipient) {
  // Simulated Resend API integration for UAT
  // In production, this would use actual Resend API with proper API key
  
  console.log(`SIMULATED_RESEND_API_CALL:`, {
    to: recipient,
    subject: subject,
    content_length: content.length
  });

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

  // Simulate success/failure (95% success rate for testing)
  const success = Math.random() > 0.05;
  
  if (success) {
    const mockExternalId = `resend_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    return {
      success: true,
      external_id: mockExternalId,
      response: {
        id: mockExternalId,
        to: [recipient],
        subject: subject,
        created_at: new Date().toISOString(),
        status: 'sent'
      }
    };
  } else {
    return {
      success: false,
      external_id: null,
      error: 'Simulated API error: Rate limit exceeded',
      response: {
        error: 'rate_limit_exceeded',
        message: 'Too many requests'
      }
    };
  }
}

function generateEmailContent(leadData, qualificationResult) {
  // Generate personalized email content
  const { lead_name, lead_email } = leadData;
  const { status, qualification_score, notes } = qualificationResult;
  
  const statusMessages = {
    qualified: `Congratulations! Your lead has been qualified and you'll hear from our team soon.`,
    review: `Thank you for your interest. Your lead is under review and we'll get back to you within 24 hours.`,
    rejected: `Thank you for your interest. Unfortunately, your lead doesn't meet our current criteria.`
  };

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Lead Status Update</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2c5282;">Hello ${lead_name}!</h2>
        
        <p>Thank you for your interest in our services. We've reviewed your information and wanted to update you on your status.</p>
        
        <div style="background-color: #f7fafc; padding: 15px; border-left: 4px solid #4299e1; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2c5282;">Status Update</h3>
            <p><strong>Status:</strong> ${status.toUpperCase()}</p>
            <p><strong>Qualification Score:</strong> ${qualification_score}/100</p>
            <p>${statusMessages[status]}</p>
        </div>
        
        <p><strong>Details:</strong> ${notes}</p>
        
        <p>If you have any questions, please don't hesitate to contact our support team.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
        
        <p style="font-size: 12px; color: #718096;">
            This is an automated notification from our lead management system.<br>
            Lead ID: ${leadData.id}<br>
            Sent: ${new Date().toISOString()}
        </p>
    </div>
</body>
</html>
  `.trim();
}