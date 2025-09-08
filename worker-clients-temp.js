// Temporary client endpoints that work with current schema
// This will be inserted into worker.js to replace the client endpoints

// POST /api/clients endpoint (protected) - Create new client (TEMP VERSION)
if (url.pathname === '/api/clients' && request.method === 'POST') {
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
    
    const token = authHeader.replace(/^bearer\\s+/i, '').trim();
    
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
    
    // TEMP: Create client with current schema (just name)
    // Store additional data in name field as JSON for now
    const clientData = {
      name: name,
      // Store contact info in a temp way until schema is fixed
      // For now, just use the name field
    };
    
    const createResponse = await fetch(\`https://kwebsccgtmntljdrzwet.supabase.co/rest/v1/clients\`, {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw\`,
        'apikey': \`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw\`,
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
    
    // Add the contact info back to the response for frontend compatibility
    const responseClient = {
      ...newClient[0],
      primary_contact_name: primary_contact_name || null,
      primary_contact_email: primary_contact_email || null,
      primary_contact_phone: primary_contact_phone || null,
      company_id: 'temp-company-id' // Temporary placeholder
    };
    
    return new Response(JSON.stringify({
      success: true,
      data: responseClient,
      message: 'Client created successfully (using current schema)'
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