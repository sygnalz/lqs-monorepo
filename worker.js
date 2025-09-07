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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Health check endpoint
    if (url.pathname === '/api/health' && request.method === 'GET') {
      return new Response(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: 'UAT',
        message: 'LQS UAT Environment is operational'
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
        const { email, password, client_name } = body;
        
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

        const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw';
        let createdUserId = null;
        let createdClientId = null;

        try {
          // STEP 1: Create user using Supabase Admin API
          const supabaseResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/auth/v1/admin/users`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SERVICE_KEY}`,
              'apikey': SERVICE_KEY
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
              'Authorization': `Bearer ${SERVICE_KEY}`,
              'apikey': SERVICE_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify({
              name: client_name || `${email.split('@')[0]}'s Organization`
            })
          });

          if (!clientResponse.ok) {
            // Rollback: Delete the created user
            await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/auth/v1/admin/users/${createdUserId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'apikey': SERVICE_KEY
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
              'Authorization': `Bearer ${SERVICE_KEY}`,
              'apikey': SERVICE_KEY,
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
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'apikey': SERVICE_KEY
              }
            });

            await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/auth/v1/admin/users/${createdUserId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'apikey': SERVICE_KEY
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
                  'Authorization': `Bearer ${SERVICE_KEY}`,
                  'apikey': SERVICE_KEY
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
                  'Authorization': `Bearer ${SERVICE_KEY}`,
                  'apikey': SERVICE_KEY
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
        
        // Sign in user using Supabase Auth API
        const supabaseResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw`
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
    
    // Create Lead endpoint (protected)
    if (url.pathname === '/api/leads' && request.method === 'POST') {
      try {
        // Extract and validate JWT token (with robust parsing)
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
        
        // Robust token extraction: case-insensitive Bearer, whitespace tolerant
        const authHeaderTrimmed = authHeader.trim();
        const bearerPrefix = /^bearer\s+/i; // Case insensitive Bearer + whitespace
        
        if (!bearerPrefix.test(authHeaderTrimmed)) {
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
        
        // Extract token with whitespace tolerance
        const token = authHeaderTrimmed.replace(bearerPrefix, '').trim();
        
        // INSTRUMENTATION: Log JWT validation details
        const timestamp = new Date().toISOString();
        const tokenPrefix = token.substring(0, 20);
        console.log(`[${timestamp}] JWT_VALIDATION_START:`, {
          endpoint: '/api/leads',
          token_prefix: tokenPrefix,
          token_length: token.length,
          auth_header_present: !!authHeader
        });
        
        // Decode JWT payload to check expiration (for logging only)
        let decodedPayload = null;
        try {
          const payloadPart = token.split('.')[1];
          decodedPayload = JSON.parse(atob(payloadPart));
          const currentTime = Math.floor(Date.now() / 1000);
          console.log(`[${timestamp}] JWT_PAYLOAD_DECODED:`, {
            token_prefix: tokenPrefix,
            issued_at: decodedPayload.iat,
            expires_at: decodedPayload.exp,
            current_time: currentTime,
            is_expired: currentTime > decodedPayload.exp,
            time_to_expiry: decodedPayload.exp - currentTime,
            user_id: decodedPayload.sub,
            email: decodedPayload.email
          });
        } catch (decodeError) {
          console.log(`[${timestamp}] JWT_DECODE_ERROR:`, {
            token_prefix: tokenPrefix,
            error: decodeError.message
          });
        }
        
        // Verify JWT with Supabase
        const supabaseStartTime = Date.now();
        console.log(`[${timestamp}] SUPABASE_VALIDATION_REQUEST:`, {
          token_prefix: tokenPrefix,
          endpoint: 'https://kwebsccgtmntljdrzwet.supabase.co/auth/v1/user',
          method: 'GET'
        });
        
        const userResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/auth/v1/user`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw`
          }
        });
        
        const supabaseEndTime = Date.now();
        console.log(`[${timestamp}] SUPABASE_VALIDATION_RESPONSE:`, {
          token_prefix: tokenPrefix,
          status: userResponse.status,
          status_text: userResponse.statusText,
          response_time_ms: supabaseEndTime - supabaseStartTime,
          headers: {
            content_type: userResponse.headers.get('content-type'),
            content_length: userResponse.headers.get('content-length')
          }
        });
        
        if (!userResponse.ok) {
          // Log the actual error response from Supabase
          let errorResponseText = '';
          try {
            errorResponseText = await userResponse.text();
            console.log(`[${timestamp}] SUPABASE_ERROR_RESPONSE:`, {
              token_prefix: tokenPrefix,
              status: userResponse.status,
              error_body: errorResponseText
            });
          } catch (e) {
            console.log(`[${timestamp}] SUPABASE_ERROR_READ_FAILED:`, {
              token_prefix: tokenPrefix,
              error: e.message
            });
          }
          
          return new Response(JSON.stringify({
            success: false,
            error: 'Invalid or expired token',
            debug_info: {
              timestamp,
              token_prefix: tokenPrefix,
              status: userResponse.status,
              decoded_payload: decodedPayload ? {
                exp: decodedPayload.exp,
                iat: decodedPayload.iat,
                is_expired: decodedPayload ? (Math.floor(Date.now() / 1000) > decodedPayload.exp) : 'unknown'
              } : null
            }
          }), {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const userData = await userResponse.json();
        const userId = userData.id;
        
        // Log successful validation
        console.log(`[${timestamp}] JWT_VALIDATION_SUCCESS:`, {
          token_prefix: tokenPrefix,
          user_id: userId,
          email: userData.email,
          validation_time_ms: Date.now() - supabaseStartTime
        });
        
        // Get request body
        const body = await request.json();
        const { lead_name, lead_email, phone, custom_data } = body;
        
        if (!lead_name || !lead_email) {
          return new Response(JSON.stringify({
            success: false,
            error: 'lead_name and lead_email are required'
          }), {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        // Look up company_id from profiles table using user_id
        const profileResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/profiles?id=eq.${userId}&select=company_id`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw`,
            'apikey': `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!profileResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to lookup client information'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const profileData = await profileResponse.json();
        
        if (!profileData || profileData.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'No client found for this user'
          }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const clientId = profileData[0].company_id;
        
        // Log successful profile lookup
        console.log(`[${timestamp}] PROFILE_LOOKUP_SUCCESS:`, {
          token_prefix: tokenPrefix,
          user_id: userId,
          company_id: clientId,
          profile_data: profileData[0]
        });
        
        // Create lead in database
        const leadData = {
          company_id: clientId,
          lead_name,
          lead_email,
          phone: phone || null,
          custom_data: custom_data || null,
          status: 'new'
        };
        
        const leadResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/leads`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw`,
            'apikey': `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(leadData)
        });
        
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
        
        const createdLead = await leadResponse.json();
        const leadRecord = createdLead[0] || createdLead;
        
        // Log successful lead creation
        console.log(`[${timestamp}] LEAD_CREATED_SUCCESS:`, {
          token_prefix: tokenPrefix,
          lead_id: leadRecord.id,
          company_id: leadRecord.company_id,
          status: leadRecord.status
        });
        
        // NOTE: Lead will be automatically processed by the scheduled lead-processor worker
        console.log(`[${timestamp}] LEAD_READY_FOR_PROCESSING:`, {
          lead_id: leadRecord.id,
          status: leadRecord.status,
          message: 'Lead created with status "new" - will be processed by scheduled worker within 30 seconds'
        });
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Lead created successfully',
          data: leadRecord
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
    
    // Get All Leads endpoint (protected) - List leads for authenticated company
    if (url.pathname === '/api/leads' && request.method === 'GET') {
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
        
        // Get user profile to find company_id
        const profileResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/profiles?id=eq.${getJWTPayload(token).sub}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw`,
            'apikey': `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!profileResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: 'User profile not found'
          }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const profileData = await profileResponse.json();
        if (!profileData || profileData.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'User profile not found'
          }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const companyId = profileData[0].company_id; // Updated to use company_id
        
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
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw`,
            'apikey': `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw`,
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
        
        // Extract and validate JWT token (with robust parsing)
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
        
        // Robust token extraction: case-insensitive Bearer, whitespace tolerant
        const authHeaderTrimmed = authHeader.trim();
        const bearerPrefix = /^bearer\s+/i; // Case insensitive Bearer + whitespace
        
        if (!bearerPrefix.test(authHeaderTrimmed)) {
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
        
        // Extract token with whitespace tolerance
        const token = authHeaderTrimmed.replace(bearerPrefix, '').trim();
        
        // Verify JWT with Supabase
        const userResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/auth/v1/user`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw`
          }
        });
        
        if (!userResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Invalid or expired token'
          }), {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const userData = await userResponse.json();
        const userId = userData.id;
        
        // Look up company_id from profiles table using user_id
        const profileResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/profiles?id=eq.${userId}&select=company_id`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw`,
            'apikey': `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!profileResponse.ok) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to lookup client information'
          }), {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const profileData = await profileResponse.json();
        
        if (!profileData || profileData.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'No client found for this user'
          }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });
        }
        
        const clientId = profileData[0].company_id;
        
        // Get lead data with company tenancy check
        const leadResponse = await fetch(`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/leads?id=eq.${leadId}&company_id=eq.${clientId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw`,
            'apikey': `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw`,
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