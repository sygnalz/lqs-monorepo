export interface SignUpRequest {
  email: string
  password: string
  companyName: string
}

export interface SignInRequest {
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: {
    id: string
    email: string
  }
  client: {
    id: string
    name: string
  }
}

export interface User {
  id: string
  email: string
}