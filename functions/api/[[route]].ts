import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createClient } from '@supabase/supabase-js'

type Bindings = {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS
app.use('/api/*', cors())

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: 'UAT'
  })
})

// Auth signup endpoint
app.post('/api/auth/signup', async (c) => {
  try {
    const { email, password } = await c.req.json()
    
    if (!email || !password) {
      return c.json({ 
        success: false, 
        error: 'Email and password are required' 
      }, 400)
    }

    // Initialize Supabase client
    const supabase = createClient(
      c.env.SUPABASE_URL || 'https://kwebsccgtmntljdrzwet.supabase.co',
      c.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create user using Admin API
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })
    
    if (userError) {
      return c.json({ 
        success: false, 
        error: userError.message 
      }, 400)
    }

    // Create client record
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .insert({
        user_id: userData.user.id,
        name: `Client for ${email}`
      })
      .select()
      .single()

    if (clientError) {
      console.error('Client creation error:', clientError)
      // User was created successfully, but client creation failed
      // This is still a successful signup from user perspective
    }

    return c.json({ 
      success: true, 
      data: {
        user: userData.user,
        client: clientData || null
      }
    }, 201)

  } catch (error) {
    console.error('Signup error:', error)
    return c.json({ 
      success: false, 
      error: 'Internal server error' 
    }, 500)
  }
})

// Leads endpoint for testing async processing
app.post('/api/leads', async (c) => {
  try {
    const { client_id, lead_name, lead_email } = await c.req.json()
    
    if (!client_id || !lead_name || !lead_email) {
      return c.json({ 
        success: false, 
        error: 'client_id, lead_name, and lead_email are required' 
      }, 400)
    }

    // Initialize Supabase client
    const supabase = createClient(
      c.env.SUPABASE_URL || 'https://kwebsccgtmntljdrzwet.supabase.co',
      c.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw'
    )

    // Insert lead into database
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .insert({
        client_id,
        lead_name,
        lead_email,
        status: 'new'
      })
      .select()
      .single()

    if (leadError) {
      return c.json({ 
        success: false, 
        error: leadError.message 
      }, 400)
    }

    return c.json({ 
      success: true, 
      data: leadData
    }, 201)

  } catch (error) {
    console.error('Lead creation error:', error)
    return c.json({ 
      success: false, 
      error: 'Internal server error' 
    }, 500)
  }
})

// Get lead status endpoint
app.get('/api/leads/:id', async (c) => {
  try {
    const leadId = c.req.param('id')
    
    // Initialize Supabase client
    const supabase = createClient(
      c.env.SUPABASE_URL || 'https://kwebsccgtmntljdrzwet.supabase.co',
      c.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3ZWJzY2NndG1udGxqZHJ6d2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA4ODg3OCwiZXhwIjoyMDcyNjY0ODc4fQ.PaljHYSMCIjjqgTtInOszP0jF1sTFkixowNFQfN--tw'
    )

    // Get lead data
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError) {
      return c.json({ 
        success: false, 
        error: leadError.message 
      }, 404)
    }

    return c.json({ 
      success: true, 
      data: leadData
    })

  } catch (error) {
    console.error('Lead fetch error:', error)
    return c.json({ 
      success: false, 
      error: 'Internal server error' 
    }, 500)
  }
})

export default app