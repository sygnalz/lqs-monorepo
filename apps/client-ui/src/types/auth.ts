export interface SignUpRequest {
  email: string
  password: string
  companyName: string
}

export interface SignInRequest {
  email: string
  password: string
}

export interface SignInResponse {
  success: boolean
  message: string
  data: {
    user: {
      id: string
      email: string
      aud?: string
      role?: string
      email_confirmed_at?: string
      phone?: string
      confirmed_at?: string
      last_sign_in_at?: string
      app_metadata?: any
      user_metadata?: any
      identities?: any[]
      created_at?: string
      updated_at?: string
      is_anonymous?: boolean
    }
    session: {
      access_token: string
      token_type: string
      expires_in: number
      expires_at: number
      refresh_token: string
    }
  }
}

export interface SignUpResponse {
  success: boolean
  message: string
  data: {
    user: {
      id: string
      email: string
    }
    company: {
      id: string
      name: string
    }
    profile: {
      id: string
      company_id: string
      updated_at: string
    }
  }
}

export interface User {
  id: string
  email: string
}