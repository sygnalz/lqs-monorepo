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
      const token = authService.getAuthToken()
      if (token) {
        try {
          const response = await fetch('https://lqs-uat-worker.charlesheflin.workers.dev/api/profile', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser({ id: userData.id || 'authenticated-user', email: userData.email || 'authenticated@user.com' });
          } else {
            authService.clearAuthToken();
            setUser(null);
          }
        } catch (error) {
          console.error('Token validation failed:', error);
          authService.clearAuthToken();
          setUser(null);
        }
      }
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
