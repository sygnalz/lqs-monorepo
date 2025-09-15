import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '../types/auth'
import { authService } from '../services/auth'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      console.log('🔐 [AUTH CONTEXT] Starting token validation...');
      const token = authService.getAuthToken()
      console.log('🔐 [AUTH CONTEXT] Retrieved token:', { hasToken: !!token, tokenLength: token ? token.length : 0 });
      
      if (token) {
        try {
          console.log('🔐 [AUTH CONTEXT] Making token validation request via /api/clients...');
          const response = await fetch('https://lqs-uat-worker.charlesheflin.workers.dev/api/clients', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('🔐 [AUTH CONTEXT] Token validation response:', { 
            status: response.status, 
            ok: response.ok 
          });
          
          if (response.ok) {
            const userData = await response.json();
            console.log('🔐 [AUTH CONTEXT] Token validation successful via /api/clients:', { 
              hasSuccess: !!userData.success, 
              hasData: !!userData.data 
            });
            setUser({ id: 'authenticated-user', email: 'authenticated@user.com' });
          } else {
            console.error('🔐 [AUTH CONTEXT] Token validation failed with status:', response.status);
            const errorData = await response.text();
            console.error('🔐 [AUTH CONTEXT] Error response:', errorData);
            authService.clearAuthToken();
            setUser(null);
          }
        } catch (error) {
          console.error('🔐 [AUTH CONTEXT] Token validation failed:', error);
          authService.clearAuthToken();
          setUser(null);
        }
      } else {
        console.log('🔐 [AUTH CONTEXT] No token found in localStorage');
      }
      console.log('🔐 [AUTH CONTEXT] Setting loading to false');
      setIsLoading(false)
    }
    initAuth()
  }, [])

  const login = (token: string, userData: User) => {
    authService.setAuthToken(token)
    setUser(userData)
  }

  const logout = () => {
    authService.clearAuthToken()
    setUser(null)
  }

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
