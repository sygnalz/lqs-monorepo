import apiClient from '../lib/api'
import { SignUpRequest, SignInRequest, AuthResponse } from '../types/auth'

export const authService = {
  async signUp(data: SignUpRequest): Promise<AuthResponse> {
    const response = await apiClient.post('/api/auth/signup', data)
    return response.data
  },

  async signIn(data: SignInRequest): Promise<AuthResponse> {
    const response = await apiClient.post('/api/auth/signin', data)
    return response.data
  },

  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    const response = await apiClient.get('/api/health')
    return response.data
  },

  setAuthToken(token: string): void {
    localStorage.setItem('auth_token', token)
  },

  getAuthToken(): string | null {
    return localStorage.getItem('auth_token')
  },

  clearAuthToken(): void {
    localStorage.removeItem('auth_token')
  },

  isAuthenticated(): boolean {
    return !!this.getAuthToken()
  }
}