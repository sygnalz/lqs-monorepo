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
    
    // GET /api/clients endpoint (protected) - List clients for the authenticated user's company
    if (url.pathname === '/api/clients' && request.method === 'GET') {
      try {
        // Use centralized authentication
        const authResult = await getAuthenticatedProfile(request, env);
        if (authResult.error) {
          return authResult.error;
        }
        
        const { profile } = authResult;
        const companyId = profile.company_id;
        
        // Filter clients by company_id for multi-tenant security
        const clientsResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/clients?company_id=eq.${companyId}&select=*`, {
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
        const companyId = profile.company_id;
        
        // Execute query to retrieve single client with multi-tenant security
        // Filter by both client ID and company_id to ensure users can only access clients from their own company
        const clientResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/clients?id=eq.${clientId}&company_id=eq.${companyId}`, {
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
        const companyId = profile.company_id;
        
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
        // Filter by both client ID and company_id for security (multi-tenant isolation)
        const updateResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/clients?id=eq.${clientId}&company_id=eq.${companyId}`, {
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
        const companyId = profile.company_id;
        
        // First, verify that the client exists and belongs to the user's company
        const clientResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/clients?id=eq.${clientId}&company_id=eq.${companyId}`, {
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
        const deleteResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/clients?id=eq.${clientId}&company_id=eq.${companyId}`, {
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
        const companyId = profile.company_id;
        
        // Security Check: Verify that the client belongs to the authenticated user's company
        const clientResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/clients?id=eq.${clientId}&company_id=eq.${companyId}`, {
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
        const companyId = profile.company_id;
        
        // Security Check: Verify that the client belongs to the authenticated user's company
        const clientResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/clients?id=eq.${clientId}&company_id=eq.${companyId}`, {
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
        const companyId = profile.company_id;
        
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
        const clientResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/clients?id=eq.${clientId}&company_id=eq.${companyId}`, {
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
        const companyId = profile.company_id;
        
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
        const clientResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/clients?id=eq.${clientId}&company_id=eq.${companyId}`, {
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
        const companyId = profile.company_id;
        
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
        const clientResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/clients?id=eq.${clientId}&company_id=eq.${companyId}`, {
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
        const companyId = profile.company_id;
        
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
        const clientResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/clients?id=eq.${clientId}&company_id=eq.${companyId}`, {
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
