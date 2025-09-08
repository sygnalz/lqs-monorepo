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
  const profileResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/profiles?id=eq.${payload.sub}`, {
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
  
  // Return successful profile data
  return { profile: profileData[0] };
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

          // STEP 3: Create profile link (user_id -> company_id mapping)
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
              company_id: createdClientId
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
        const supabaseResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': env.SUPABASE_ANON_KEY
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
    
    // Create Lead endpoint (protected) - POST /api/leads
    if (url.pathname === '/api/leads' && request.method === 'POST') {
      try {
        // Use centralized authentication
        const authResult = await getAuthenticatedProfile(request, env);
        if (authResult.error) {
          return authResult.error;
        }
        
        const { profile } = authResult;
        const companyId = profile.company_id;
        
        // Parse and validate request body
        const body = await request.json();
        const { name, email, phone, notes } = body;
        
        // Validate required fields
        if (!name || !email) {
          return new Response(JSON.stringify({
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
            error: 'Invalid email format'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Construct lead data for database insertion
        const leadData = {
          company_id: companyId,
          name: name,
          email: email,
          phone: phone || null,
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
        
        return new Response(JSON.stringify(leadRecord), {
          status: 201,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
        
      } catch (error) {
        // Handle JSON parsing errors and other exceptions
        return new Response(JSON.stringify({
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
    
    // Get All Leads endpoint (protected) - List leads for authenticated company
    if (url.pathname === '/api/leads' && request.method === 'GET') {
      try {
        // Use centralized authentication
        const authResult = await getAuthenticatedProfile(request, env);
        if (authResult.error) {
          return authResult.error;
        }
        
        const { profile } = authResult;
        const companyId = profile.company_id;
        
        // Get query parameters for filtering
        const urlParams = new URLSearchParams(url.search);
        const status = urlParams.get('status');
        const limit = urlParams.get('limit') || '50';
        const offset = urlParams.get('offset') || '0';
        
        // Build query with filters
        let leadsQuery = `company_id=eq.${companyId}`;
        if (status) {
          leadsQuery += `&status=eq.${status}`;
        }
        
        // Get leads data with company tenancy check
        const leadsResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/leads?${leadsQuery}&limit=${limit}&offset=${offset}&order=created_at.desc`, {
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
        
        const leadsData = await leadsResponse.json();
        
        return new Response(JSON.stringify({
          success: true,
          data: leadsData,
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
          error: 'Failed to retrieve leads: ' + error.message
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
    
    // Get Lead endpoint (protected)
    if (url.pathname.startsWith('/api/leads/') && request.method === 'GET') {
      try {
        // Extract lead ID from path
        const leadId = url.pathname.split('/api/leads/')[1];
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
        const companyId = profile.company_id;
        
        // Get lead data with company tenancy check
        const leadResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/leads?id=eq.${leadId}&company_id=eq.${companyId}`, {
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
            error: 'Failed to retrieve lead'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const leadData = await leadResponse.json();
        
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
        
        return new Response(JSON.stringify({
          success: true,
          data: leadData[0]
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
          error: 'Invalid request or server error'
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
        const companyId = profile.company_id;
        
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
          company_id: companyId
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
    
    // GET /api/clients endpoint (protected) - List ALL clients (admin view)
    if (url.pathname === '/api/clients' && request.method === 'GET') {
      try {
        // Extract and validate JWT token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Authorization token required'
          }), {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const token = authHeader.replace(/^bearer\s+/i, '').trim();
        
        // Validate JWT token (basic validation)
        try {
          getJWTPayload(token);
        } catch (jwtError) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Invalid authorization token'
          }), {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // [CRITICAL IMPLEMENTATION] Fetch ALL clients (admin view per directive)
        // Do not filter by company_id as all users are admins with universal visibility
        const clientsResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/clients?select=*`, {
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
    
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }
    
    // Default 404 for unknown endpoints
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