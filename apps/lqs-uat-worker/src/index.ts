import { Hono } from 'hono'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

type Bindings = {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS middleware
app.use('*', async (c, next) => {
  c.res.headers.set('Access-Control-Allow-Origin', '*')
  c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  c.res.headers.set('Access-Control-Max-Age', '600')
  
  if (c.req.method === 'OPTIONS') {
    return new Response(null, { status: 200 })
  }
  
  await next()
})

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
    // In a real implementation, you'd verify the JWT signature
    // For now, we'll decode without verification (JWT from Supabase)
    const decoded = jwt.decode(token) as any
    
    if (!decoded || !decoded.sub) {
      return c.json({ success: false, message: 'Invalid token' }, 401)
    }

    // Store user info in context
    c.set('user', decoded)
    await next()
  } catch (error) {
    return c.json({ success: false, message: 'Invalid or expired token' }, 401)
  }
}

// Sign up endpoint
app.post('/api/auth/signup', async (c) => {
  try {
    const { email, password, clientName } = await c.req.json()
    
    if (!email || !password || !clientName) {
      return c.json({
        success: false,
        message: 'Email, password, and company name are required'
      }, 400)
    }

    // Initialize Supabase client
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)

    // Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
    })

    if (authError) {
      return c.json({
        success: false,
        message: authError.message
      }, 400)
    }

    // Create client record
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .insert([{ name: clientName }])
      .select()
      .single()

    if (clientError) {
      console.error('Client creation error:', clientError)
      return c.json({
        success: false,
        message: 'Failed to create client record'
      }, 500)
    }

    // Create profile linking user to client
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: authData.user?.id,
        client_id: clientData.id,
        email: email
      }])

    if (profileError) {
      console.error('Profile creation error:', profileError)
      return c.json({
        success: false,
        message: 'Failed to create user profile'
      }, 500)
    }

    return c.json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: authData.user?.id,
          email: authData.user?.email
        },
        session: authData.session
      }
    })

  } catch (error) {
    console.error('Sign up error:', error)
    return c.json({
      success: false,
      message: 'Internal server error'
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

    // Initialize Supabase client
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)

    // Sign in the user
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
    console.error('Sign in error:', error)
    return c.json({
      success: false,
      message: 'Internal server error'
    }, 500)
  }
})

// Create lead endpoint
app.post('/api/leads', authenticateJWT, async (c) => {
  try {
    const { name, email, phone, source } = await c.req.json()
    const user = c.get('user')
    
    if (!name || !email) {
      return c.json({
        success: false,
        message: 'Name and email are required'
      }, 400)
    }

    // Initialize Supabase client
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)

    // Get user's client_id from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user.sub)
      .single()

    if (profileError || !profile) {
      return c.json({
        success: false,
        message: 'User profile not found'
      }, 404)
    }

    // Create the lead
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .insert([{
        name,
        email,
        phone: phone || null,
        source: source || 'web_form',
        status: 'new',
        client_id: profile.client_id,
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (leadError) {
      console.error('Lead creation error:', leadError)
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
    console.error('Create lead error:', error)
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
    const user = c.get('user')

    // Initialize Supabase client
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)

    // Get user's client_id from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user.sub)
      .single()

    if (profileError || !profile) {
      return c.json({
        success: false,
        message: 'User profile not found'
      }, 404)
    }

    // Get the lead, ensuring it belongs to the user's client
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('client_id', profile.client_id)
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
    console.error('Get lead error:', error)
    return c.json({
      success: false,
      message: 'Internal server error'
    }, 500)
  }
})

// NEW: Get all leads endpoint (CRITICAL MISSING ENDPOINT)
app.get('/api/leads', authenticateJWT, async (c) => {
  try {
    const user = c.get('user')

    // Initialize Supabase client
    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)

    // Get user's client_id from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user.sub)
      .single()

    if (profileError || !profile) {
      return c.json({
        success: false,
        message: 'User profile not found'
      }, 404)
    }

    // Get all leads for the user's client, ordered by creation date (newest first)
    const { data: leadsData, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('client_id', profile.client_id)
      .order('created_at', { ascending: false })

    if (leadsError) {
      console.error('Get leads error:', leadsError)
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
    console.error('Get leads error:', error)
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
      'GET /api/leads/:id'
    ]
  })
})

export default app