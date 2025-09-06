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
    const initAuth = () => {
      const token = authService.getAuthToken()
      // In a real app, you might want to validate the token with the server
      // For now, we'll just check if the token exists
      if (token) {
        // TODO: Decode token or fetch user data from server
        // For now, we'll set a placeholder user
        setUser({ id: 'placeholder', email: 'placeholder@example.com' })
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