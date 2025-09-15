import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createClient } from '@supabase/supabase-js'
function getJWTPayload(token: string): any {
  try {
    const payloadPart = token.split('.')[1];
    return JSON.parse(atob(payloadPart));
  } catch (error) {
    throw new Error('Invalid JWT token');
  }
}

type Bindings = {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_KEY?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Apply CORS middleware globally at the top
app.use('*', cors({
  origin: '*', // Accept requests from any origin
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['POST', 'GET', 'OPTIONS', 'DELETE', 'PUT'],
  maxAge: 600,
}))

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'lqs-uat-worker'
  })
})

// Authentication middleware
async function authenticateJWT(c: any, next: () => Promise<void>) {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, message: 'Missing or invalid authorization header' }, 401)
  }

  const token = authHeader.substring(7) // Remove 'Bearer ' prefix
  
  try {
    const decoded = getJWTPayload(token)
    
    if (!decoded || !decoded.sub) {
      return c.json({ success: false, message: 'Invalid token' }, 401)
    }

    c.set('user', decoded as any)
    await next()
  } catch (error) {
    return c.json({ success: false, message: 'Invalid or expired token' }, 401)
  }
}

// Sign up endpoint - FIXED VERSION
app.post('/api/auth/signup', async (c) => {
  try {
    const requestBody = await c.req.json()
    const { email, password, companyName } = requestBody
    
    // Enhanced validation with debugging info
    if (!email || !password || !companyName) {
      return c.json({
        success: false,
        message: 'Email, password, and company name are required',
        debug: { receivedBody: requestBody }
      }, 400)
    }

    // Validate companyName is a non-empty string
    if (typeof companyName !== 'string' || companyName.trim().length === 0) {
      return c.json({
        success: false,
        message: 'Company name must be a valid non-empty string',
        debug: { companyName: companyName, type: typeof companyName }
      }, 400)
    }

    // Use SERVICE_ROLE_KEY for trusted backend operations, fallback to ANON_KEY
    const supabaseKey = c.env.SUPABASE_SERVICE_KEY || c.env.SUPABASE_SERVICE_ROLE_KEY || c.env.SUPABASE_ANON_KEY
    const supabase = createClient(c.env.SUPABASE_URL, supabaseKey)

    // Step 1: Create user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
    })

    if (authError) {
      return c.json({
        success: false,
        message: authError.message,
        debug: { step: 'auth_signup', error: authError }
      }, 400)
    }

    if (!authData.user) {
      return c.json({
        success: false,
        message: 'User creation failed - no user data returned'
      }, 500)
    }

    // Step 2: Create company record with explicit name field
    const companyPayload = { 
      name: companyName.trim(),
      // Explicitly set created_at to prevent any auto-naming
      created_at: new Date().toISOString()
    }

    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert([companyPayload])
      .select('id, name, created_at')
      .single()

    if (companyError) {
      return c.json({
        success: false,
        message: 'Failed to create company record',
        debug: { 
          step: 'company_creation', 
          error: companyError,
          payload: companyPayload
        }
      }, 500)
    }

    // Verify company was created with correct name
    if (!companyData || companyData.name !== companyName.trim()) {
      return c.json({
        success: false,
        message: 'Company created but name was modified by database',
        debug: {
          expected: companyName.trim(),
          actual: companyData?.name,
          companyData: companyData
        }
      }, 500)
    }

    // Step 3: Create user profile linking to company
    const profilePayload = {
      id: authData.user.id,
      company_id: companyData.id
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert([profilePayload])

    if (profileError) {
      return c.json({
        success: false,
        message: 'Failed to create user profile',
        debug: { 
          step: 'profile_creation', 
          error: profileError,
          payload: profilePayload
        }
      }, 500)
    }

    return c.json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: authData.user.id,
          email: authData.user.email
        },
        company: {
          id: companyData.id,
          name: companyData.name
        },
        session: authData.session
      }
    })

  } catch (error) {
    return c.json({
      success: false,
      message: 'Internal server error',
      debug: { error: error instanceof Error ? error.message : String(error) }
    }, 500)
  }
})

// Sign in endpoint
app.post('/api/auth/signin', async (c) => {
  try {
    const { email, password } = await c.req.json()
    
    if (!email || !password) {
      return c.json({
        success: false,
        message: 'Email and password are required'
      }, 400)
    }

    // Use SERVICE_ROLE_KEY for trusted backend operations, fallback to ANON_KEY
    const supabaseKey = c.env.SUPABASE_SERVICE_KEY || c.env.SUPABASE_SERVICE_ROLE_KEY || c.env.SUPABASE_ANON_KEY
    const supabase = createClient(c.env.SUPABASE_URL, supabaseKey)

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (authError) {
      return c.json({
        success: false,
        message: authError.message
      }, 400)
    }

    return c.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: authData.user?.id,
          email: authData.user?.email
        },
        session: authData.session
      }
    })

  } catch (error) {
    return c.json({
      success: false,
      message: 'Internal server error'
    }, 500)
  }
})

// Create lead endpoint - FIXED VERSION
app.post('/api/leads', authenticateJWT, async (c) => {
  try {
    const { name, email, phone, source } = await c.req.json()
    const user = c.get('user') as any
    
    if (!name || !email) {
      return c.json({
        success: false,
        message: 'Name and email are required'
      }, 400)
    }

    // Use SERVICE_ROLE_KEY for trusted backend operations, fallback to ANON_KEY
    const supabaseKey = c.env.SUPABASE_SERVICE_KEY || c.env.SUPABASE_SERVICE_ROLE_KEY || c.env.SUPABASE_ANON_KEY
    const supabase = createClient(c.env.SUPABASE_URL, supabaseKey)

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.sub)
      .single()

    if (profileError || !profile) {
      return c.json({
        success: false,
        message: 'User profile not found'
      }, 404)
    }

    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .insert([{
        company_id: profile.company_id,
        name: name,
        email: email,
        phone: phone || null,
        source: source || 'API',
        notes: null
      }])
      .select()
      .single()

    if (leadError) {
      return c.json({
        success: false,
        message: 'Failed to create lead'
      }, 500)
    }

    return c.json({
      success: true,
      message: 'Lead created successfully',
      data: leadData
    })

  } catch (error) {
    return c.json({
      success: false,
      message: 'Internal server error'
    }, 500)
  }
})

// Get specific lead endpoint
app.get('/api/leads/:id', authenticateJWT, async (c) => {
  try {
    const leadId = c.req.param('id')
    const user = c.get('user') as any

    // Use SERVICE_ROLE_KEY for trusted backend operations, fallback to ANON_KEY
    const supabaseKey = c.env.SUPABASE_SERVICE_KEY || c.env.SUPABASE_SERVICE_ROLE_KEY || c.env.SUPABASE_ANON_KEY
    const supabase = createClient(c.env.SUPABASE_URL, supabaseKey)

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.sub)
      .single()

    if (profileError || !profile) {
      return c.json({
        success: false,
        message: 'User profile not found'
      }, 404)
    }

    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('company_id', profile.company_id)
      .single()

    if (leadError || !leadData) {
      return c.json({
        success: false,
        message: 'Lead not found'
      }, 404)
    }

    return c.json({
      success: true,
      data: leadData
    })

  } catch (error) {
    return c.json({
      success: false,
      message: 'Internal server error'
    }, 500)
  }
})

// Get all leads endpoint
app.get('/api/leads', authenticateJWT, async (c) => {
  try {
    const user = c.get('user') as any

    // Use SERVICE_ROLE_KEY for trusted backend operations, fallback to ANON_KEY
    const supabaseKey = c.env.SUPABASE_SERVICE_KEY || c.env.SUPABASE_SERVICE_ROLE_KEY || c.env.SUPABASE_ANON_KEY
    const supabase = createClient(c.env.SUPABASE_URL, supabaseKey)

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.sub)
      .single()

    if (profileError || !profile) {
      return c.json({
        success: false,
        message: 'User profile not found'
      }, 404)
    }

    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })

    if (leadsError) {
      return c.json({
        success: false,
        message: 'Failed to fetch leads'
      }, 500)
    }

    return c.json({
      success: true,
      leads: leadsData || []
    })

  } catch (error) {
    return c.json({
      success: false,
      message: 'Internal server error'
    }, 500)
  }
})

app.get('/api/clients', authenticateJWT, async (c) => {
  try {
    const user = c.get('user') as any

    // Use SERVICE_ROLE_KEY for trusted backend operations, fallback to ANON_KEY
    const supabaseKey = c.env.SUPABASE_SERVICE_KEY || c.env.SUPABASE_SERVICE_ROLE_KEY || c.env.SUPABASE_ANON_KEY
    const supabase = createClient(c.env.SUPABASE_URL, supabaseKey)

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.sub)
      .single()

    if (profileError || !profile) {
      return c.json({
        success: false,
        message: 'User profile not found'
      }, 404)
    }

    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .single()

    if (companyError || !companyData) {
      return c.json({
        success: false,
        message: 'Company not found'
      }, 404)
    }

    return c.json({
      success: true,
      data: [{
        id: companyData.id,
        name: companyData.name,
        primary_contact_name: null,
        primary_contact_email: null,
        primary_contact_phone: null,
        company_id: companyData.id,
        billing_address: null,
        rate_per_minute: null,
        rate_per_sms: null,
        created_at: companyData.created_at
      }]
    })

  } catch (error) {
    return c.json({
      success: false,
      message: 'Internal server error'
    }, 500)
  }
})

// Default route
app.get('/', (c) => {
  return c.json({ 
    message: 'LQS UAT Worker API',
    version: '1.0.0',
    endpoints: [
      'GET /api/health',
      'POST /api/auth/signup',
      'POST /api/auth/signin', 
      'POST /api/leads',
      'GET /api/leads',
      'GET /api/leads/:id',
      'GET /api/clients'
    ]
  })
})

export default app
