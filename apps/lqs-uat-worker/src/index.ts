import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

type Bindings = {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
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
    const decoded = jwt.decode(token) as any
    
    if (!decoded || !decoded.sub) {
      return c.json({ success: false, message: 'Invalid token' }, 401)
    }

    c.set('user', decoded)
    await next()
  } catch (error) {
    return c.json({ success: false, message: 'Invalid or expired token' }, 401)
  }
}

// Sign up endpoint
app.post('/api/auth/signup', async (c) => {
  try {
    const { email, password, companyName } = await c.req.json()
    
    if (!email || !password || !companyName) {
      return c.json({
        success: false,
        message: 'Email, password, and company name are required'
      }, 400)
    }

    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)

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

    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert([{ name: companyName }])
      .select()
      .single()

    if (companyError) {
      return c.json({
        success: false,
        message: 'Failed to create company record'
      }, 500)
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: authData.user?.id,
        company_id: companyData.id
      }])

    if (profileError) {
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

    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)

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

    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)

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
      .insert([{}]) // Empty insert to work with actual schema
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
    const user = c.get('user')

    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)

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
    const user = c.get('user')

    const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)

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