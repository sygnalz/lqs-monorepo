// Simple Worker to handle API endpoints

// Helper function to extract JWT payload
function getJWTPayload(token) {
  try {
    const payloadPart = token.split('.')[1];
    return JSON.parse(atob(payloadPart));
  } catch (error) {
    throw new Error('Invalid JWT token');
  }
}

// Centralized authentication helper function
async function getAuthenticatedProfile(request, env) {
  // Extract the Authorization header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return {
      error: new Response(JSON.stringify({
        success: false,
        error: 'Authorization token required'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    };
  }
  
  // Extract token from header string
  const token = authHeader.replace(/^bearer\s+/i, '').trim();
  
  // Use getJWTPayload utility to decode the token
  let payload;
  try {
    payload = getJWTPayload(token);
  } catch (jwtError) {
    return {
      error: new Response(JSON.stringify({
        success: false,
        error: 'Invalid authorization token'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    };
  }
  
  // Fetch user's profile from Supabase using the sub (user ID) from token payload
  const profileResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/profiles?id=eq.${payload.sub}&select=client_id`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'apikey': `${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!profileResponse.ok) {
    return {
      error: new Response(JSON.stringify({
        success: false,
        error: 'User profile not found'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    };
  }
  
  const profileData = await profileResponse.json();
  if (!profileData || profileData.length === 0) {
    console.error(`No profile found for user ${user.id}`);
    return {
      error: new Response(JSON.stringify({
        success: false,
        error: 'User profile not found',
        details: 'No profile record exists for this user',
        user_id: user.id
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    };
  }
  
  // Return successful profile data with client_id for API consistency
  return { profile: { client_id: profileData[0].client_id } };
}

async function aggregateProspectContext(prospectId, authProfile, env) {
  try {
    const clientId = authProfile.client_id;
    
    const prospectResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/leads?id=eq.${prospectId}&select=*,clients!inner(id,client_id)`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'apikey': `${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!prospectResponse.ok) {
      throw new Error('Failed to fetch prospect data');
    }
    
    const prospectData = await prospectResponse.json();
    if (!prospectData || prospectData.length === 0) {
      throw new Error('Prospect not found');
    }
    
    const prospect = prospectData[0];
    
    if (prospect.clients.client_id !== companyId) {
      throw new Error('Access denied: Prospect does not belong to your company');
    }
    
    const tagsResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/prospect_tags?prospect_id=eq.${prospectId}&client_id=eq.${companyId}&select=tag,applied_at,tags_taxonomy!inner(definition)`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'apikey': `${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const tagsData = tagsResponse.ok ? await tagsResponse.json() : [];
    
    const communicationsResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/communications?lead_id=eq.${prospectId}&client_id=eq.${companyId}&select=type,recipient,content,created_at,external_id&order=created_at.desc&limit=50`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'apikey': `${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    let communicationsData = [];
    if (communicationsResponse.ok) {
      try {
        const responseData = await communicationsResponse.json();
        communicationsData = Array.isArray(responseData) ? responseData : [];
      } catch (error) {
        communicationsData = [];
      }
    }
    
    const initiativeProspectResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/initiative_prospects?prospect_id=eq.${prospectId}&select=status,contact_attempts,initiatives!inner(id,name,status,environmental_settings,client_id,playbooks!inner(name,goal_description,ai_instructions_and_persona,constraints))&initiatives.client_id=eq.${clientId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'apikey': `${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const initiativeData = initiativeProspectResponse.ok ? await initiativeProspectResponse.json() : [];
    
    const context = {
      prospect: {
        id: prospect.id,
        first_name: prospect.name ? prospect.name.split(' ')[0] : '',
        last_name: prospect.name ? prospect.name.split(' ').slice(1).join(' ') : '',
        phone_e164: prospect.phone || '',
        email: prospect.email || '',
        timezone: '',
        consent_status: '',
        path_hint: prospect.notes || ''
      },
      tags: tagsData.map(tag => ({
        tag: tag.tag,
        definition: tag.tags_taxonomy?.definition || '',
        applied_at: tag.applied_at
      })),
      communications: communicationsData.map(comm => ({
        type: comm.type?.toUpperCase() || 'SMS',
        direction: 'OUTBOUND',
        content: comm.content || '',
        timestamp: comm.created_at,
        external_id: comm.external_id || ''
      })),
      playbook: initiativeData.length > 0 && initiativeData[0].initiatives?.playbooks ? {
        name: initiativeData[0].initiatives.playbooks.name || '',
        goal_description: initiativeData[0].initiatives.playbooks.goal_description || '',
        ai_instructions_and_persona: initiativeData[0].initiatives.playbooks.ai_instructions_and_persona || '',
        constraints: initiativeData[0].initiatives.playbooks.constraints || {}
      } : null,
      initiative: initiativeData.length > 0 ? {
        name: initiativeData[0].initiatives?.name || '',
        status: initiativeData[0].initiatives?.status || '',
        environmental_settings: initiativeData[0].initiatives?.environmental_settings || {},
        prospect_status: initiativeData[0].status || '',
        contact_attempts: initiativeData[0].contact_attempts || 0
      } : null
    };
    
    return { success: true, data: context };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function makeAIDecision(prospectContext, env) {
  try {
    if (!env.OPENAI_API_KEY) {
      return {
        success: false,
        error: 'OpenAI API key not configured'
      };
    }

    const prompt = `You are an AI assistant for a real estate lead management system. Based on the prospect context below, determine the next best action to take.

PROSPECT CONTEXT:
Name: ${prospectContext.prospect.first_name} ${prospectContext.prospect.last_name}
Phone: ${prospectContext.prospect.phone_e164}
Email: ${prospectContext.prospect.email}
Notes: ${prospectContext.prospect.path_hint}

APPLIED TAGS:
${prospectContext.tags.map(tag => `- ${tag.tag}: ${tag.definition} (applied: ${tag.applied_at})`).join('\n')}

RECENT COMMUNICATIONS:
${prospectContext.communications.slice(0, 5).map(comm => `- ${comm.type}: ${comm.content} (${comm.created_at})`).join('\n')}

ACTIVE INITIATIVES:
${prospectContext.initiatives.map(init => `- ${init.name}: ${init.goal_description}`).join('\n')}

Based on this context, determine the next action. Respond with a JSON object containing:
- action_type: one of "SMS", "CALL", "WAIT", "REVIEW", "COMPLETE"
- scheduled_for: ISO timestamp for when to execute (must be in the future)
- ai_rationale: brief explanation of why this action was chosen

Consider the prospect's engagement level, recent communications, and current initiative status.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant for real estate lead management. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      return {
        success: false,
        error: `OpenAI API error: ${response.status} ${response.statusText}`
      };
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    let aiDecision;
    try {
      aiDecision = JSON.parse(aiResponse);
    } catch (parseError) {
      return {
        success: false,
        error: 'Failed to parse AI response as JSON'
      };
    }

    const validActionTypes = ['SMS', 'CALL', 'WAIT', 'REVIEW', 'COMPLETE'];
    if (!validActionTypes.includes(aiDecision.action_type)) {
      return {
        success: false,
        error: 'Invalid action_type from AI response'
      };
    }

    const scheduledTime = new Date(aiDecision.scheduled_for);
    if (isNaN(scheduledTime.getTime()) || scheduledTime <= new Date()) {
      return {
        success: false,
        error: 'Invalid scheduled_for timestamp from AI response'
      };
    }

    if (!aiDecision.ai_rationale || typeof aiDecision.ai_rationale !== 'string') {
      return {
        success: false,
        error: 'Missing or invalid ai_rationale from AI response'
      };
    }

    return {
      success: true,
      data: {
        action_type: aiDecision.action_type,
        scheduled_for: aiDecision.scheduled_for,
        ai_rationale: aiDecision.ai_rationale
      }
    };

  } catch (error) {
    return {
      success: false,
      error: 'OpenAI API call failed: ' + error.message
    };
  }
}

async function scheduleProspectAction(prospectId, authProfile, env) {
  try {
    const clientId = authProfile.client_id;
    
    const prospectResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/leads?id=eq.${prospectId}&select=*,clients!inner(id,client_id)`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'apikey': `${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!prospectResponse.ok) {
      return {
        success: false,
        error: 'Failed to fetch prospect data'
      };
    }
    
    const prospectData = await prospectResponse.json();
    if (!prospectData || prospectData.length === 0) {
      return {
        success: false,
        error: 'Prospect not found'
      };
    }
    
    const prospect = prospectData[0];
    
    if (prospect.clients.client_id !== companyId) {
      return {
        success: false,
        error: 'Access denied: Prospect does not belong to your company'
      };
    }
    
    const rateLimitResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/task_queue?prospect_id=eq.${prospectId}&client_id=eq.${companyId}&status=eq.PENDING&created_at=gte.${new Date(Date.now() - 60 * 60 * 1000).toISOString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'apikey': `${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (rateLimitResponse.ok) {
      const existingTasks = await rateLimitResponse.json();
      if (existingTasks && existingTasks.length > 0) {
        return {
          success: false,
          error: 'Rate limit exceeded: Only one task per prospect per hour allowed'
        };
      }
    }
    
    const communicationsResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/communications?lead_id=eq.${prospectId}&client_id=eq.${companyId}&select=consent_status&order=created_at.desc&limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'apikey': `${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (communicationsResponse.ok) {
      const commData = await communicationsResponse.json();
      if (commData && commData.length > 0 && commData[0].consent_status === 'denied') {
        return {
          success: false,
          error: 'Cannot schedule action: Prospect has denied consent'
        };
      }
    }
    
    const contextResult = await aggregateProspectContext(prospectId, authProfile, env);
    if (!contextResult.success) {
      return {
        success: false,
        error: 'Failed to get prospect context: ' + contextResult.error
      };
    }
    
    const aiDecisionResult = await makeAIDecision(contextResult.data, env);
    if (!aiDecisionResult.success) {
      return {
        success: false,
        error: 'AI decision failed: ' + aiDecisionResult.error
      };
    }
    
    const aiDecision = aiDecisionResult.data;
    
    const taskData = {
      prospect_id: prospectId,
      client_id: companyId,
      action_type: aiDecision.action_type,
      scheduled_for: aiDecision.scheduled_for,
      ai_rationale: aiDecision.ai_rationale,
      status: 'PENDING'
    };
    
    const insertResponse = await fetch('https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/task_queue', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'apikey': `${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(taskData)
    });
    
    if (!insertResponse.ok) {
      return {
        success: false,
        error: 'Failed to create task'
      };
    }
    
    const taskResult = await insertResponse.json();
    
    const updateLeadData = {
      automation_status: 'ACTIVE',
      next_action_scheduled: aiDecision.scheduled_for
    };
    
    const updateLeadResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/leads?id=eq.${prospectId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'apikey': `${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateLeadData)
    });
    
    return {
      success: true,
      data: {
        task_id: taskResult[0].id,
        prospect_id: prospectId,
        action_type: aiDecision.action_type,
        scheduled_for: aiDecision.scheduled_for,
        ai_rationale: aiDecision.ai_rationale,
        status: 'PENDING'
      }
    };
    
  } catch (error) {
    return {
      success: false,
      error: 'Server error: ' + error.message
    };
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Health check endpoint
    if (url.pathname === '/api/health' && request.method === 'GET') {
      return new Response(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: 'UAT',
        message: 'LQS UAT Environment is operational',
        version: '2.0-final-test'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // Debug endpoint to check environment variables
    if (url.pathname === '/api/debug/env' && request.method === 'GET') {
      return new Response(JSON.stringify({
        available_vars: {
          SUPABASE_SERVICE_KEY: !!env.SUPABASE_SERVICE_KEY,
          SUPABASE_ANON_KEY: !!env.SUPABASE_ANON_KEY,
          SUPABASE_KEY: !!env.SUPABASE_KEY,
          ENVIRONMENT: env.ENVIRONMENT
        }
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // GET /api/playbooks endpoint (protected) - List all playbooks for authenticated user's company
    if (url.pathname === '/api/playbooks' && request.method === 'GET') {
      try {
        // Use centralized authentication
        const authResult = await getAuthenticatedProfile(request, env);
        if (authResult.error) {
          return authResult.error;
        }
        
        const { profile } = authResult;
        const clientId = profile.client_id;
        
        // Get query parameters for filtering
        const urlParams = new URLSearchParams(url.search);
        const search = urlParams.get('search');
        const limit = urlParams.get('limit') || '50';
        const offset = urlParams.get('offset') || '0';
        
        // Build query with client_id filter and optional search
        let playbooksQuery = `client_id=eq.${clientId}`;
        if (search) {
          playbooksQuery += `&or=(name.ilike.*${search}*,goal_description.ilike.*${search}*)`;
        }
        
        // Filter playbooks by client_id for multi-tenant security
        const playbooksResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/playbooks?${playbooksQuery}&select=*&limit=${limit}&offset=${offset}&order=created_at.desc`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!playbooksResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to fetch playbooks'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const playbooksData = await playbooksResponse.json();
        
        return new Response(JSON.stringify({
          success: true,
          data: playbooksData,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            count: playbooksData.length
          }
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid request or server error: ' + error.message
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    // POST /api/playbooks endpoint (protected) - Create new playbook
    if (url.pathname === '/api/playbooks' && request.method === 'POST') {
      try {
        // Use centralized authentication
        const authResult = await getAuthenticatedProfile(request, env);
        if (authResult.error) {
          return authResult.error;
        }
        
        const { profile } = authResult;
        const clientId = profile.client_id;
        
        // Parse request body
        const body = await request.json();
        const { name, goal_description, ai_instructions_and_persona, constraints } = body;
        
        if (!name) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Playbook name is required'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Validate constraints JSON if provided
        let parsedConstraints = {};
        if (constraints) {
          try {
            parsedConstraints = typeof constraints === 'string' ? JSON.parse(constraints) : constraints;
          } catch (error) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Invalid JSON format in constraints field'
            }), {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            });
          }
        }
        
        // Create the playbook record
        const playbookData = {
          name: name,
          goal_description: goal_description || null,
          ai_instructions_and_persona: ai_instructions_and_persona || null,
          constraints: parsedConstraints,
          client_id: clientId
        };
        
        const createResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/playbooks`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(playbookData)
        });
        
        if (!createResponse.ok) {
          const errorData = await createResponse.text();
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to create playbook: ' + errorData
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const newPlaybook = await createResponse.json();
        
        return new Response(JSON.stringify({
          success: true,
          data: newPlaybook[0],
          message: 'Playbook created successfully'
        }), {
          status: 201,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid request or server error: ' + error.message
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    // GET /api/playbooks/:id endpoint (protected) - Retrieve single playbook by ID
    if (url.pathname.startsWith('/api/playbooks/') && url.pathname.split('/').length === 4 && request.method === 'GET') {
      try {
        // Extract playbook ID from path
        const playbookId = url.pathname.split('/api/playbooks/')[1];
        if (!playbookId) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Playbook ID is required'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Use centralized authentication
        const authResult = await getAuthenticatedProfile(request, env);
        if (authResult.error) {
          return authResult.error;
        }
        
        const { profile } = authResult;
        const clientId = profile.client_id;
        
        // Execute query to retrieve single playbook with multi-tenant security
        const playbookResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/playbooks?id=eq.${playbookId}&client_id=eq.${clientId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!playbookResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to retrieve playbook'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const playbookData = await playbookResponse.json();
        
        if (!playbookData || playbookData.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Playbook not found'
          }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        return new Response(JSON.stringify({
          success: true,
          data: playbookData[0]
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid request or server error: ' + error.message
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    // PATCH /api/playbooks/:id endpoint (protected) - Update playbook
    if (url.pathname.startsWith('/api/playbooks/') && url.pathname.split('/').length === 4 && request.method === 'PATCH') {
      try {
        // Extract playbook ID from path
        const playbookId = url.pathname.split('/api/playbooks/')[1];
        if (!playbookId) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Playbook ID is required'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Use centralized authentication
        const authResult = await getAuthenticatedProfile(request, env);
        if (authResult.error) {
          return authResult.error;
        }
        
        const { profile } = authResult;
        const clientId = profile.client_id;
        
        // Verify playbook ownership
        const playbookResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/playbooks?id=eq.${playbookId}&client_id=eq.${clientId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!playbookResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to verify playbook ownership'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const playbookData = await playbookResponse.json();
        
        if (!playbookData || playbookData.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Playbook not found'
          }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Parse and validate request body
        const body = await request.json();
        const { name, goal_description, ai_instructions_and_persona, constraints } = body;
        
        if (!name) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Playbook name is required'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Validate constraints JSON if provided
        let parsedConstraints = {};
        if (constraints !== undefined) {
          try {
            parsedConstraints = typeof constraints === 'string' ? JSON.parse(constraints) : constraints;
          } catch (error) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Invalid JSON format in constraints field'
            }), {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            });
          }
        }
        
        const updateData = {
          name: name,
          goal_description: goal_description || null,
          ai_instructions_and_persona: ai_instructions_and_persona || null,
          constraints: parsedConstraints
        };
        
        const updateResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/playbooks?id=eq.${playbookId}&client_id=eq.${clientId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(updateData)
        });
        
        if (!updateResponse.ok) {
          const errorData = await updateResponse.text();
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to update playbook: ' + errorData
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const updatedPlaybook = await updateResponse.json();
        
        return new Response(JSON.stringify({
          success: true,
          data: updatedPlaybook[0],
          message: 'Playbook updated successfully'
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid request or server error: ' + error.message
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    // DELETE /api/playbooks/:id endpoint (protected) - Delete playbook
    if (url.pathname.startsWith('/api/playbooks/') && url.pathname.split('/').length === 4 && request.method === 'DELETE') {
      try {
        // Extract playbook ID from path
        const playbookId = url.pathname.split('/api/playbooks/')[1];
        if (!playbookId) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Playbook ID is required'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Use centralized authentication
        const authResult = await getAuthenticatedProfile(request, env);
        if (authResult.error) {
          return authResult.error;
        }
        
        const { profile } = authResult;
        const clientId = profile.client_id;
        
        // Verify playbook ownership before deletion
        const playbookResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/playbooks?id=eq.${playbookId}&client_id=eq.${clientId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!playbookResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to verify playbook ownership'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const playbookData = await playbookResponse.json();
        
        if (!playbookData || playbookData.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Playbook not found'
          }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Execute deletion with multi-tenant security
        const deleteResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/playbooks?id=eq.${playbookId}&client_id=eq.${clientId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!deleteResponse.ok) {
          const errorData = await deleteResponse.text();
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to delete playbook: ' + errorData
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Playbook deleted successfully'
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid request or server error: ' + error.message
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }

    // Auth signup endpoint - COMPLETE IMPLEMENTATION
    if (url.pathname === '/api/auth/signup' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { email, password, companyName, client_name } = body;
        
        if (!email || !password || !companyName) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Email, password, and company name are required'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }

        let createdUserId = null;
        let createdClientId = null;

        try {
          // STEP 1: Create user using Supabase Admin API
          const supabaseResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/auth/v1/admin/users`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
              'apikey': env.SUPABASE_SERVICE_KEY
            },
            body: JSON.stringify({
              email,
              password,
              email_confirm: true
            })
          });
          
          const supabaseData = await supabaseResponse.json();
          
          if (!supabaseResponse.ok) {
            return new Response(JSON.stringify({
              success: false,
              error: supabaseData.message || 'Failed to create user'
            }), {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            });
          }

          createdUserId = supabaseData.id;
          
          // STEP 2: Create company in companies table
          const clientResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/companies`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
              'apikey': env.SUPABASE_SERVICE_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              name: companyName || client_name || `${email.split('@')[0]}'s Organization`
            })
          });

          if (!clientResponse.ok) {
            // Rollback: Delete the created user
            await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/auth/v1/admin/users/${createdUserId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
                'apikey': env.SUPABASE_SERVICE_KEY
              }
            });
            
            const clientError = await clientResponse.json();
            return new Response(JSON.stringify({
              success: false,
              error: 'Failed to create company organization: ' + (clientError.message || 'Unknown error')
            }), {
              status: 500,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            });
          }

          const clientData = await clientResponse.json();
          createdClientId = Array.isArray(clientData) ? clientData[0].id : clientData.id;

          // STEP 3: Create profile link (user_id -> client_id mapping)
          const profileResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/profiles`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
              'apikey': env.SUPABASE_SERVICE_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              id: createdUserId,
              client_id: createdClientId
            })
          });

          if (!profileResponse.ok) {
            // Rollback: Delete company and user
            await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/companies?id=eq.${createdClientId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
                'apikey': env.SUPABASE_SERVICE_KEY
              }
            });

            await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/auth/v1/admin/users/${createdUserId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
                'apikey': env.SUPABASE_SERVICE_KEY
              }
            });

            const profileError = await profileResponse.json();
            return new Response(JSON.stringify({
              success: false,
              error: 'Failed to create user profile: ' + (profileError.message || 'Unknown error')
            }), {
              status: 500,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            });
          }

          const profileData = await profileResponse.json();

          // SUCCESS: All three steps completed
          return new Response(JSON.stringify({
            success: true,
            message: 'User account created successfully with company organization',
            data: {
              user: {
                id: createdUserId,
                email: supabaseData.email
              },
              company: {
                id: createdClientId,
                name: Array.isArray(clientData) ? clientData[0].name : clientData.name
              },
              profile: profileData[0]
            }
          }), {
            status: 201,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });

        } catch (transactionError) {
          // Rollback any created resources on transaction failure
          if (createdClientId) {
            try {
              await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/companies?id=eq.${createdClientId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
                  'apikey': env.SUPABASE_SERVICE_KEY
                }
              });
            } catch (rollbackError) {
              console.error('Company rollback failed:', rollbackError);
            }
          }

          if (createdUserId) {
            try {
              await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/auth/v1/admin/users/${createdUserId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
                  'apikey': env.SUPABASE_SERVICE_KEY
                }
              });
            } catch (rollbackError) {
              console.error('User rollback failed:', rollbackError);
            }
          }

          return new Response(JSON.stringify({
            success: false,
            error: 'Signup transaction failed: ' + transactionError.message
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body or server error'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    // Auth signin endpoint
    if (url.pathname === '/api/auth/signin' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { email, password } = body;
        
        if (!email || !password) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Email and password are required'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Sign in user using Supabase Auth API with ANON_KEY
        // TEMPORARY: Using SERVICE_KEY as fallback since ANON_KEY not configured in this environment
        const supabaseResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_KEY
          },
          body: JSON.stringify({
            email,
            password
          })
        });
        
        const supabaseData = await supabaseResponse.json();
        
        if (!supabaseResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: supabaseData.message || 'Invalid credentials'
          }), {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Sign-in successful',
          data: {
            user: supabaseData.user,
            session: {
              access_token: supabaseData.access_token,
              token_type: supabaseData.token_type,
              expires_in: supabaseData.expires_in,
              expires_at: supabaseData.expires_at,
              refresh_token: supabaseData.refresh_token
            }
          }
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    // POST /api/clients endpoint (protected) - Create new client
    if (url.pathname === '/api/clients' && request.method === 'POST') {
      try {
        // Use centralized authentication
        const authResult = await getAuthenticatedProfile(request, env);
        if (authResult.error) {
          return authResult.error;
        }
        
        const { profile } = authResult;
        const companyId = profile.client_id;
        
        // Parse request body
        const body = await request.json();
        const { name, primary_contact_name, primary_contact_email, primary_contact_phone } = body;
        
        if (!name) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Client name is required'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Create the client record
        const clientData = {
          name: name,
          primary_contact_name: primary_contact_name || null,
          primary_contact_email: primary_contact_email || null,
          primary_contact_phone: primary_contact_phone || null,
          client_id: companyId
        };
        
        const createResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/clients`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(clientData)
        });
        
        if (!createResponse.ok) {
          const errorData = await createResponse.text();
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to create client: ' + errorData
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const newClient = await createResponse.json();
        
        return new Response(JSON.stringify({
          success: true,
          data: newClient[0],
          message: 'Client created successfully'
        }), {
          status: 201,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid request or server error: ' + error.message
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    // GET /api/clients endpoint (protected) - List clients for the authenticated user's company
    if (url.pathname === '/api/clients' && request.method === 'GET') {
      try {
        // Use centralized authentication
        const authResult = await getAuthenticatedProfile(request, env);
        if (authResult.error) {
          return authResult.error;
        }
        
        const { profile } = authResult;
        const companyId = profile.client_id;
        
        // Filter clients by client_id for multi-tenant security
        const clientsResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/clients?client_id=eq.${companyId}&select=*`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!clientsResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to fetch clients'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const clientsData = await clientsResponse.json();
        
        // Return consistent response format with data key
        return new Response(JSON.stringify({
          success: true,
          data: clientsData,
          pagination: {
            limit: 50,
            offset: 0,
            count: clientsData.length
          }
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid request or server error: ' + error.message
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    // GET /api/clients/:id endpoint (protected) - Retrieve single client by ID
    if (url.pathname.startsWith('/api/clients/') && url.pathname.split('/').length === 4 && request.method === 'GET') {
      try {
        // Extract client ID from path
        const clientId = url.pathname.split('/api/clients/')[1];
        if (!clientId) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Client ID is required'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Use centralized authentication
        const authResult = await getAuthenticatedProfile(request, env);
        if (authResult.error) {
          return authResult.error;
        }
        
        const { profile } = authResult;
        const companyId = profile.client_id;
        
        // Execute query to retrieve single client with multi-tenant security
        // Filter by both client ID and client_id to ensure users can only access clients from their own company
        const clientResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/clients?id=eq.${clientId}&client_id=eq.${companyId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!clientResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to retrieve client'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const clientData = await clientResponse.json();
        
        // Check if client was found (validates both ID existence and company ownership)
        if (!clientData || clientData.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Client not found'
          }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Return successful response with client object
        return new Response(JSON.stringify({
          success: true,
          data: clientData[0]
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid request or server error: ' + error.message
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    // PATCH /api/clients/:id endpoint (protected) - Update client billing information
    if (url.pathname.startsWith('/api/clients/') && url.pathname.split('/').length === 4 && request.method === 'PATCH') {
      try {
        // Extract client ID from path
        const clientId = url.pathname.split('/api/clients/')[1];
        if (!clientId) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Client ID is required'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Use centralized authentication
        const authResult = await getAuthenticatedProfile(request, env);
        if (authResult.error) {
          return authResult.error;
        }
        
        const { profile } = authResult;
        const companyId = profile.client_id;
        
        // Parse request body
        const body = await request.json();
        const { billing_address, rate_per_minute, rate_per_sms, rate_per_lead } = body;
        
        // Build update object with only provided fields
        const updateData = {};
        if (billing_address !== undefined) updateData.billing_address = billing_address;
        if (rate_per_minute !== undefined) updateData.rate_per_minute = rate_per_minute;
        if (rate_per_sms !== undefined) updateData.rate_per_sms = rate_per_sms;
        if (rate_per_lead !== undefined) updateData.rate_per_lead = rate_per_lead;
        
        // Check if there are any fields to update
        if (Object.keys(updateData).length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'No valid fields provided for update'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Execute SQL UPDATE to modify client billing information
        // Filter by both client ID and client_id for security (multi-tenant isolation)
        const updateResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/clients?id=eq.${clientId}&client_id=eq.${companyId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(updateData)
        });
        
        if (!updateResponse.ok) {
          const errorData = await updateResponse.text();
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to update client: ' + errorData
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const updatedClient = await updateResponse.json();
        
        // Check if client was found and updated
        if (!updatedClient || updatedClient.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Client not found'
          }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Return successful response with updated client object
        return new Response(JSON.stringify({
          success: true,
          data: updatedClient[0],
          message: 'Client billing information updated successfully'
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid request or server error: ' + error.message
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    // DELETE /api/clients/:id endpoint (protected) - Delete client with cascading delete
    if (url.pathname.startsWith('/api/clients/') && url.pathname.split('/').length === 4 && request.method === 'DELETE') {
      console.log('🗑️ [DELETE_ENDPOINT] URL pathname:', url.pathname);
      console.log('🗑️ [DELETE_ENDPOINT] Split parts:', url.pathname.split('/'));
      console.log('🗑️ [DELETE_ENDPOINT] Split length:', url.pathname.split('/').length);
      try {
        // Extract client ID from path
        const clientId = url.pathname.split('/api/clients/')[1];
        if (!clientId) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Client ID is required'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Use centralized authentication
        const authResult = await getAuthenticatedProfile(request, env);
        if (authResult.error) {
          return authResult.error;
        }
        
        const { profile } = authResult;
        const companyId = profile.client_id;
        
        // First, verify that the client exists and belongs to the user's company
        const clientResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/clients?id=eq.${clientId}&client_id=eq.${companyId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!clientResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to verify client ownership'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const clientData = await clientResponse.json();
        
        // Check if client was found (validates both ID existence and company ownership)
        if (!clientData || clientData.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Client not found'
          }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Execute DELETE operation - the CASCADE DELETE constraint will automatically delete associated leads
        const deleteResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/clients?id=eq.${clientId}&client_id=eq.${companyId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!deleteResponse.ok) {
          const errorData = await deleteResponse.text();
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to delete client: ' + errorData
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Return successful response
        return new Response(JSON.stringify({
          success: true,
          message: 'Client and all associated leads deleted successfully'
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid request or server error: ' + error.message
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    // POST /api/clients/:clientId/leads endpoint (protected) - Create new lead for specific client
    if (url.pathname.match(/^\/api\/clients\/[^\/]+\/leads$/) && request.method === 'POST') {
      try {
        // Extract client ID from path
        const pathParts = url.pathname.split('/');
        const clientId = pathParts[3]; // /api/clients/{clientId}/leads
        
        if (!clientId) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Client ID is required'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Use centralized authentication
        const authResult = await getAuthenticatedProfile(request, env);
        if (authResult.error) {
          return authResult.error;
        }
        
        const { profile } = authResult;
        const companyId = profile.client_id;
        
        // Security Check: Verify that the client belongs to the authenticated user's company
        const clientResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/clients?id=eq.${clientId}&client_id=eq.${companyId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!clientResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to verify client ownership'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const clientData = await clientResponse.json();
        
        // If no client found, return 404 Not Found
        if (!clientData || clientData.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Client not found'
          }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Parse and validate request body
        const body = await request.json();
        const { name, email, phone, status, notes } = body;
        
        // Validate required fields
        if (!name || !email) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Name and email are required fields'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Invalid email format'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Construct lead data for database insertion with client_id
        const leadData = {
          client_id: clientId,
          name: name,
          email: email,
          phone: phone || null,
          status: status || 'new',
          notes: notes || null
        };
        
        // Execute SQL INSERT to create new lead
        const leadResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/leads`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(leadData)
        });
        
        // Handle database errors
        if (!leadResponse.ok) {
          const errorData = await leadResponse.json();
          return new Response(JSON.stringify({
            success: false,
            error: errorData.message || 'Failed to create lead'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Return successful response with created lead data
        const createdLead = await leadResponse.json();
        const leadRecord = createdLead[0] || createdLead;
        
        return new Response(JSON.stringify({
          success: true,
          data: leadRecord,
          message: 'Lead created successfully'
        }), {
          status: 201,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
        
      } catch (error) {
        // Handle JSON parsing errors and other exceptions
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body or server error: ' + error.message
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    // GET /api/clients/:clientId/leads endpoint (protected) - List all leads for specific client
    if (url.pathname.match(/^\/api\/clients\/[^\/]+\/leads$/) && request.method === 'GET') {
      try {
        // Extract client ID from path
        const pathParts = url.pathname.split('/');
        const clientId = pathParts[3]; // /api/clients/{clientId}/leads
        
        if (!clientId) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Client ID is required'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Use centralized authentication
        const authResult = await getAuthenticatedProfile(request, env);
        if (authResult.error) {
          return authResult.error;
        }
        
        const { profile } = authResult;
        const companyId = profile.client_id;
        
        // Security Check: Verify that the client belongs to the authenticated user's company
        const clientResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/clients?id=eq.${clientId}&client_id=eq.${companyId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!clientResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to verify client ownership'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const clientData = await clientResponse.json();
        
        // If no client found, return 404 Not Found
        if (!clientData || clientData.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Client not found'
          }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Get query parameters for filtering
        const urlParams = new URLSearchParams(url.search);
        const status = urlParams.get('status');
        const limit = urlParams.get('limit') || '50';
        const offset = urlParams.get('offset') || '0';
        
        // Build query with client_id filter and optional status filter
        let leadsQuery = `client_id=eq.${clientId}`;
        if (status) {
          leadsQuery += `&status=eq.${status}`;
        }
        
        // Get leads data for the specific client with associated tags
        const leadsResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/leads?${leadsQuery}&select=*,lead_tags(tags(*))&limit=${limit}&offset=${offset}&order=created_at.desc`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!leadsResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to retrieve leads'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const rawLeadsData = await leadsResponse.json();
        
        // Transform the nested lead_tags structure into a flat tags array for each lead
        const leadsData = rawLeadsData.map(lead => {
          // Extract tags from the nested lead_tags structure
          const tags = lead.lead_tags ? lead.lead_tags.map(leadTag => leadTag.tags).filter(tag => tag !== null) : [];
          
          // Remove the lead_tags property and add the flattened tags array
          const { lead_tags, ...leadWithoutJoinTable } = lead;
          
          return {
            ...leadWithoutJoinTable,
            tags: tags
          };
        });
        
        return new Response(JSON.stringify({
          success: true,
          data: leadsData,
          client: clientData[0], // Include client information for context
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            count: leadsData.length
          }
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid request or server error: ' + error.message
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    // GET /api/tags endpoint (protected) - Retrieve all tags ordered by step_id then id
    if (url.pathname === '/api/tags' && request.method === 'GET') {
      try {
        // Use centralized authentication
        const authResult = await getAuthenticatedProfile(request, env);
        if (authResult.error) {
          return authResult.error;
        }
        
        // Fetch all tags from the tags table ordered by step_id, then by id
        const tagsResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/tags?select=*&order=step_id.asc,id.asc`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!tagsResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to retrieve tags'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const tagsData = await tagsResponse.json();
        
        return new Response(JSON.stringify({
          success: true,
          data: tagsData
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid request or server error: ' + error.message
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    // POST /api/leads/:leadId/tags endpoint (protected) - Apply tags to leads
    if (url.pathname.match(/^\/api\/leads\/[^\/]+\/tags$/) && request.method === 'POST') {
      try {
        // Extract lead ID from path
        const pathParts = url.pathname.split('/');
        const leadId = pathParts[3]; // /api/leads/{leadId}/tags
        
        if (!leadId) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Lead ID is required'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Use centralized authentication
        const authResult = await getAuthenticatedProfile(request, env);
        if (authResult.error) {
          return authResult.error;
        }
        
        const { profile } = authResult;
        const companyId = profile.client_id;
        
        // Parse request body to get tag_id
        const body = await request.json();
        const { tag_id } = body;
        
        if (!tag_id) {
          return new Response(JSON.stringify({
            success: false,
            error: 'tag_id is required'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Security Check: First verify that the lead exists
        const leadResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/leads?id=eq.${leadId}&select=id,client_id`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!leadResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to verify lead existence'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const leadData = await leadResponse.json();
        
        // Check if lead exists
        if (!leadData || leadData.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Lead not found'
          }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Now verify that the client belongs to the user's company
        const clientId = leadData[0].client_id;
        const clientResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/clients?id=eq.${clientId}&client_id=eq.${companyId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!clientResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to verify client ownership'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const clientData = await clientResponse.json();
        
        // Verify company ownership through the client relationship
        if (!clientData || clientData.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Access denied: Lead does not belong to your company'
          }), {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Verify that the tag exists
        const tagResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/tags?id=eq.${tag_id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!tagResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to verify tag'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const tagData = await tagResponse.json();
        
        if (!tagData || tagData.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Tag not found'
          }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Insert lead-tag relationship into lead_tags table
        const leadTagData = {
          lead_id: leadId,
          tag_id: tag_id
        };
        
        const insertResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/lead_tags`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(leadTagData)
        });
        
        if (!insertResponse.ok) {
          const errorData = await insertResponse.json();
          
          // Handle duplicate key constraint violation (409 Conflict)
          if (errorData.code === '23505' || errorData.message?.includes('duplicate') || errorData.message?.includes('unique constraint')) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Tag already applied to this lead'
            }), {
              status: 409,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            });
          }
          
          return new Response(JSON.stringify({
            success: false,
            error: errorData.message || 'Failed to apply tag to lead'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const createdLeadTag = await insertResponse.json();
        
        return new Response(JSON.stringify({
          success: true,
          data: createdLeadTag[0] || createdLeadTag,
          message: 'Tag applied to lead successfully'
        }), {
          status: 201,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body or server error: ' + error.message
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    // DELETE /api/leads/:leadId/tags/:tagId endpoint (protected) - Remove tag from lead
    if (url.pathname.match(/^\/api\/leads\/[^\/]+\/tags\/[^\/]+$/) && request.method === 'DELETE') {
      try {
        // Extract lead ID and tag ID from path
        const pathParts = url.pathname.split('/');
        const leadId = pathParts[3]; // /api/leads/{leadId}/tags/{tagId}
        const tagId = pathParts[5];
        
        if (!leadId || !tagId) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Lead ID and Tag ID are required'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Use centralized authentication
        const authResult = await getAuthenticatedProfile(request, env);
        if (authResult.error) {
          return authResult.error;
        }
        
        const { profile } = authResult;
        const companyId = profile.client_id;
        
        // Security Check: First verify that the lead exists
        const leadResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/leads?id=eq.${leadId}&select=id,client_id`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!leadResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to verify lead existence'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const leadData = await leadResponse.json();
        
        // Check if lead exists
        if (!leadData || leadData.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Lead not found'
          }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Now verify that the client belongs to the user's company (multi-tenant security check)
        const clientId = leadData[0].client_id;
        const clientResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/clients?id=eq.${clientId}&client_id=eq.${companyId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!clientResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to verify client ownership'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const clientData = await clientResponse.json();
        
        // Verify company ownership through the client relationship
        if (!clientData || clientData.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Access denied: Lead does not belong to your company'
          }), {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Check if the tag association exists before attempting to delete
        const leadTagResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/lead_tags?lead_id=eq.${leadId}&tag_id=eq.${tagId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!leadTagResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to verify tag association'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const leadTagData = await leadTagResponse.json();
        
        // If no association found, return 404 Not Found
        if (!leadTagData || leadTagData.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Tag association not found'
          }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Delete the lead-tag relationship from lead_tags table
        const deleteResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/lead_tags?lead_id=eq.${leadId}&tag_id=eq.${tagId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!deleteResponse.ok) {
          const errorData = await deleteResponse.json();
          return new Response(JSON.stringify({
            success: false,
            error: errorData.message || 'Failed to remove tag from lead'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Return 204 No Content on successful deletion
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*'
          }
        });
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Server error: ' + error.message
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    // PATCH /api/leads/:leadId endpoint (protected) - Update a lead
    if (url.pathname.match(/^\/api\/leads\/[^\/]+$/) && request.method === 'PATCH') {
      try {
        // Extract lead ID from path
        const pathParts = url.pathname.split('/');
        const leadId = pathParts[3]; // /api/leads/{leadId}
        
        if (!leadId) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Lead ID is required'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Use centralized authentication
        const authResult = await getAuthenticatedProfile(request, env);
        if (authResult.error) {
          return authResult.error;
        }
        
        const { profile } = authResult;
        const companyId = profile.client_id;
        
        // Parse request body
        const body = await request.json();
        const { name, email, phone, status, notes } = body;
        
        // Security Check: First verify that the lead exists and belongs to the user's company
        const leadResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/leads?id=eq.${leadId}&select=id,client_id`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!leadResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to verify lead existence'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const leadData = await leadResponse.json();
        
        // Check if lead exists
        if (!leadData || leadData.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Lead not found'
          }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Now verify that the client belongs to the user's company (multi-tenant security check)
        const clientId = leadData[0].client_id;
        const clientResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/clients?id=eq.${clientId}&client_id=eq.${companyId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!clientResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to verify client ownership'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const clientData = await clientResponse.json();
        
        // Verify company ownership through the client relationship
        if (!clientData || clientData.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Access denied: Lead does not belong to your company'
          }), {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Build update object with only provided fields
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (status !== undefined) updateData.status = status;
        if (notes !== undefined) updateData.notes = notes;
        
        // Check if there are any fields to update
        if (Object.keys(updateData).length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'No valid fields provided for update'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Validate email format if email is being updated
        if (email !== undefined && email) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Invalid email format'
            }), {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            });
          }
        }
        
        // Execute SQL UPDATE to modify lead
        const updateResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/leads?id=eq.${leadId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(updateData)
        });
        
        if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          return new Response(JSON.stringify({
            success: false,
            error: errorData.message || 'Failed to update lead'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const updatedLead = await updateResponse.json();
        
        // Check if lead was found and updated
        if (!updatedLead || updatedLead.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Lead not found'
          }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Return successful response with complete updated lead object
        return new Response(JSON.stringify({
          success: true,
          data: updatedLead[0],
          message: 'Lead updated successfully'
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body or server error: ' + error.message
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    // DELETE /api/leads/:leadId endpoint (protected) - Delete a lead
    if (url.pathname.match(/^\/api\/leads\/[^\/]+$/) && request.method === 'DELETE') {
      try {
        // Extract lead ID from path
        const pathParts = url.pathname.split('/');
        const leadId = pathParts[3]; // /api/leads/{leadId}
        
        if (!leadId) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Lead ID is required'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Use centralized authentication
        const authResult = await getAuthenticatedProfile(request, env);
        if (authResult.error) {
          return authResult.error;
        }
        
        const { profile } = authResult;
        const companyId = profile.client_id;
        
        // Security Check: First verify that the lead exists and belongs to the user's company
        const leadResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/leads?id=eq.${leadId}&select=id,client_id`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!leadResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to verify lead existence'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const leadData = await leadResponse.json();
        
        // Check if lead exists
        if (!leadData || leadData.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Lead not found'
          }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Now verify that the client belongs to the user's company (multi-tenant security check)
        const clientId = leadData[0].client_id;
        const clientResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/clients?id=eq.${clientId}&client_id=eq.${companyId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!clientResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to verify client ownership'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const clientData = await clientResponse.json();
        
        // Verify company ownership through the client relationship
        if (!clientData || clientData.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Access denied: Lead does not belong to your company'
          }), {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Delete the lead from the leads table
        // Note: Due to database constraints, associated lead_tags will be automatically deleted via CASCADE
        const deleteResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/leads?id=eq.${leadId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!deleteResponse.ok) {
          const errorData = await deleteResponse.json();
          return new Response(JSON.stringify({
            success: false,
            error: errorData.message || 'Failed to delete lead'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Return 204 No Content on successful deletion
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*'
          }
        });
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Server error: ' + error.message
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    // GET /api/ai/context/:prospectId endpoint (protected) - Aggregate prospect context for AI decision-making
    if (url.pathname.match(/^\/api\/ai\/context\/[^\/]+$/) && request.method === 'GET') {
      try {
        const pathParts = url.pathname.split('/');
        const prospectId = pathParts[4];
        
        if (!prospectId) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Prospect ID is required'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const authResult = await getAuthenticatedProfile(request, env);
        if (authResult.error) {
          return authResult.error;
        }
        
        const contextResult = await aggregateProspectContext(prospectId, authResult.profile, env);
        
        if (!contextResult.success) {
          const statusCode = contextResult.error.includes('not found') ? 404 : 
                           contextResult.error.includes('Access denied') ? 403 : 500;
          
          return new Response(JSON.stringify({
            success: false,
            error: contextResult.error
          }), {
            status: statusCode,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        return new Response(JSON.stringify({
          success: true,
          data: contextResult.context
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Server error: ' + error.message
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }
    
    // Default 404 for unknown endpoints
    // GET /api/initiatives - List initiatives with prospect counts
    if (url.pathname === '/api/initiatives' && request.method === 'GET') {
      try {
        const authResult = await getAuthenticatedProfile(request, env);
        if (authResult.error) return authResult.error;
        
        const { profile } = authResult;
        const clientId = profile.client_id;
        
        const urlParams = new URLSearchParams(url.search);
        const limit = urlParams.get('limit') || '50';
        const offset = urlParams.get('offset') || '0';
        
        const initiativesResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/initiatives?client_id=eq.${clientId}&select=*,playbooks(name),initiative_prospects(count)&limit=${limit}&offset=${offset}&order=created_at.desc`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!initiativesResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to fetch initiatives'
          }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        
        const initiativesData = await initiativesResponse.json();
        return new Response(JSON.stringify({
          success: true,
          data: initiativesData,
          pagination: { limit: parseInt(limit), offset: parseInt(offset), count: initiativesData.length }
        }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid request or server error: ' + error.message
        }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
    }
    
    // POST /api/initiatives - Create new initiative
    if (url.pathname === '/api/initiatives' && request.method === 'POST') {
      try {
        const authResult = await getAuthenticatedProfile(request, env);
        if (authResult.error) return authResult.error;
        
        const { profile } = authResult;
        const clientId = profile.client_id;
        
        const body = await request.json();
        const { name, playbook_id, environmental_settings } = body;
        
        if (!name || !playbook_id) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Initiative name and playbook_id are required'
          }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        
        const initiativeData = {
          name,
          playbook_id,
          environmental_settings: environmental_settings || {},
          status: 'DRAFT',
          client_id: clientId
        };
        
        const createResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/initiatives`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(initiativeData)
        });
        
        if (!createResponse.ok) {
          const errorData = await createResponse.text();
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to create initiative: ' + errorData
          }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        
        const newInitiative = await createResponse.json();
        return new Response(JSON.stringify({
          success: true,
          data: newInitiative[0],
          message: 'Initiative created successfully'
        }), { status: 201, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid request or server error: ' + error.message
        }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
    }
    
    // GET /api/initiatives/:id - Retrieve single initiative with prospects
    if (url.pathname.startsWith('/api/initiatives/') && url.pathname.split('/').length === 4 && request.method === 'GET') {
      try {
        const initiativeId = url.pathname.split('/api/initiatives/')[1];
        if (!initiativeId) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Initiative ID is required'
          }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        
        const authResult = await getAuthenticatedProfile(request, env);
        if (authResult.error) return authResult.error;
        
        const { profile } = authResult;
        const clientId = profile.client_id;
        
        const initiativeResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/initiatives?id=eq.${initiativeId}&client_id=eq.${clientId}&select=*,playbooks(name,goal_description),initiative_prospects(prospect_id,status,contact_attempts,leads(name,phone,email))`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!initiativeResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to fetch initiative'
          }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        
        const initiativeData = await initiativeResponse.json();
        if (!initiativeData || initiativeData.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Initiative not found'
          }), { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        
        return new Response(JSON.stringify({
          success: true,
          data: initiativeData[0]
        }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid request or server error: ' + error.message
        }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
    }
    
    // PATCH /api/initiatives/:id - Update initiative status/settings
    if (url.pathname.startsWith('/api/initiatives/') && url.pathname.split('/').length === 4 && request.method === 'PATCH') {
      try {
        const initiativeId = url.pathname.split('/api/initiatives/')[1];
        if (!initiativeId) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Initiative ID is required'
          }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        
        const authResult = await getAuthenticatedProfile(request, env);
        if (authResult.error) return authResult.error;
        
        const { profile } = authResult;
        const clientId = profile.client_id;
        
        const body = await request.json();
        const { status, environmental_settings } = body;
        
        const updateData = {};
        if (status) updateData.status = status;
        if (environmental_settings) updateData.environmental_settings = environmental_settings;
        
        const updateResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/initiatives?id=eq.${initiativeId}&client_id=eq.${clientId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(updateData)
        });
        
        if (!updateResponse.ok) {
          const errorData = await updateResponse.text();
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to update initiative: ' + errorData
          }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        
        const updatedInitiative = await updateResponse.json();
        return new Response(JSON.stringify({
          success: true,
          data: updatedInitiative[0],
          message: 'Initiative updated successfully'
        }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid request or server error: ' + error.message
        }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
    }
    
    // DELETE /api/initiatives/:id - Delete initiative
    if (url.pathname.startsWith('/api/initiatives/') && url.pathname.split('/').length === 4 && request.method === 'DELETE') {
      try {
        const initiativeId = url.pathname.split('/api/initiatives/')[1];
        if (!initiativeId) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Initiative ID is required'
          }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        
        const authResult = await getAuthenticatedProfile(request, env);
        if (authResult.error) return authResult.error;
        
        const { profile } = authResult;
        const clientId = profile.client_id;
        
        const deleteResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/initiatives?id=eq.${initiativeId}&client_id=eq.${clientId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!deleteResponse.ok) {
          const errorData = await deleteResponse.text();
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to delete initiative: ' + errorData
          }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Initiative deleted successfully'
        }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid request or server error: ' + error.message
        }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
    }
    
    // POST /api/initiatives/:id/prospects - Add prospects to initiative
    if (url.pathname.match(/^\/api\/initiatives\/[^\/]+\/prospects$/) && request.method === 'POST') {
      try {
        const initiativeId = url.pathname.split('/')[3];
        if (!initiativeId) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Initiative ID is required'
          }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        
        const authResult = await getAuthenticatedProfile(request, env);
        if (authResult.error) return authResult.error;
        
        const { profile } = authResult;
        const clientId = profile.client_id;
        
        const body = await request.json();
        const { prospect_ids } = body;
        
        if (!prospect_ids || !Array.isArray(prospect_ids)) {
          return new Response(JSON.stringify({
            success: false,
            error: 'prospect_ids array is required'
          }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        
        // Verify initiative ownership
        const initiativeResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/initiatives?id=eq.${initiativeId}&client_id=eq.${clientId}&select=id`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        const initiativeData = await initiativeResponse.json();
        if (!initiativeData || initiativeData.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Initiative not found or access denied'
          }), { status: 404, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        
        // Create initiative_prospects records
        const prospectRecords = prospect_ids.map(prospect_id => ({
          initiative_id: initiativeId,
          prospect_id,
          status: 'ACTIVE',
          contact_attempts: 0
        }));
        
        const insertResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/initiative_prospects`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(prospectRecords)
        });
        
        if (!insertResponse.ok) {
          const errorData = await insertResponse.text();
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to add prospects to initiative: ' + errorData
          }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        
        const insertedRecords = await insertResponse.json();
        return new Response(JSON.stringify({
          success: true,
          data: insertedRecords,
          message: `${prospect_ids.length} prospects added to initiative successfully`
        }), { status: 201, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid request or server error: ' + error.message
        }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
    }
    
    // GET /api/initiatives/:id/prospects - List initiative prospects with status
    if (url.pathname.match(/^\/api\/initiatives\/[^\/]+\/prospects$/) && request.method === 'GET') {
      try {
        const initiativeId = url.pathname.split('/')[3];
        if (!initiativeId) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Initiative ID is required'
          }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        
        const authResult = await getAuthenticatedProfile(request, env);
        if (authResult.error) return authResult.error;
        
        const { profile } = authResult;
        const clientId = profile.client_id;
        
        const urlParams = new URLSearchParams(url.search);
        const limit = urlParams.get('limit') || '50';
        const offset = urlParams.get('offset') || '0';
        
        const prospectsResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/initiative_prospects?initiative_id=eq.${initiativeId}&select=*,leads(id,name,phone,email,status),initiatives!inner(client_id)&initiatives.client_id=eq.${clientId}&limit=${limit}&offset=${offset}&order=created_at.desc`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
            'apikey': `${env.SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!prospectsResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to fetch initiative prospects'
          }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }
        
        const prospectsData = await prospectsResponse.json();
        return new Response(JSON.stringify({
          success: true,
          data: prospectsData,
          pagination: { limit: parseInt(limit), offset: parseInt(offset), count: prospectsData.length }
        }), { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid request or server error: ' + error.message
        }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
    }

    return new Response(JSON.stringify({
      success: false,
      error: 'Endpoint not found'
    }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};
