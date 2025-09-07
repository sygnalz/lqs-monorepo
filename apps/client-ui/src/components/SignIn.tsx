import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authService } from '../services/auth'
import { useAuth } from '../contexts/AuthContext'

const SignIn: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message)
      if (location.state.email) {
        setFormData(prev => ({ ...prev, email: location.state.email }))
      }
      // Clear the state from navigation to prevent message from reappearing on refresh
      navigate(location.pathname, { replace: true })
    }
  }, [location.state, navigate, location.pathname])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("🔐 [SIGNIN COMPONENT] Form submitted");
    console.log("🔐 [SIGNIN COMPONENT] Form data:", {
      email: formData.email,
      password: formData.password ? '[REDACTED]' : 'undefined',
      hasPassword: !!formData.password
    });
    
    setIsLoading(true)
    setError('')

    try {
      console.log("🔐 [SIGNIN COMPONENT] Calling authService.signIn...");
      const response = await authService.signIn(formData)
      
      console.log("🔐 [SIGNIN COMPONENT] Auth service returned successful response");
      console.log("🔐 [SIGNIN COMPONENT] Response structure:", {
        hasData: !!response.data,
        hasNestedData: !!response.data?.data,
        hasSession: !!response.data?.data?.session,
        hasAccessToken: !!response.data?.data?.session?.access_token,
        hasUser: !!response.data?.data?.user,
        hasUserId: !!response.data?.data?.user?.id,
        hasUserEmail: !!response.data?.data?.user?.email
      });
      
      const token = response.data.data.session.access_token
      const user = {
        id: response.data.data.user.id,
        email: response.data.data.user.email
      }
      
      console.log("🔐 [SIGNIN COMPONENT] Extracted token and user:", {
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        userId: user.id,
        userEmail: user.email
      });
      
      console.log("🔐 [SIGNIN COMPONENT] Calling login function...");
      login(token, user)
      console.log("🔐 [SIGNIN COMPONENT] Navigating to dashboard...");
      navigate('/dashboard')
    } catch (err: any) {
      console.error("🔐 [SIGNIN COMPONENT] Sign-in error occurred:");
      console.error("🔐 [SIGNIN COMPONENT] Error type:", typeof err);
      console.error("🔐 [SIGNIN COMPONENT] Error constructor:", err?.constructor?.name);
      console.error("🔐 [SIGNIN COMPONENT] Full error object:", err);
      
      // Enhanced error parsing
      let errorMessage = 'Sign in failed. Please try again.';
      
      if (err?.response) {
        console.error("🔐 [SIGNIN COMPONENT] Error response:", {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data,
          headers: err.response.headers
        });
        
        // Try multiple paths for error message
        if (err.response.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.response.data?.error) {
          errorMessage = err.response.data.error;
        } else if (err.response.data?.error_description) {
          errorMessage = err.response.data.error_description;
        } else if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else {
          errorMessage = `HTTP ${err.response.status}: ${err.response.statusText}`;
        }
      } else if (err?.request) {
        console.error("🔐 [SIGNIN COMPONENT] No response received:", err.request);
        errorMessage = 'Network error: Unable to connect to server. Please check your internet connection.';
      } else if (err?.message) {
        console.error("🔐 [SIGNIN COMPONENT] Error message:", err.message);
        errorMessage = `Request failed: ${err.message}`;
      }
      
      console.error("🔐 [SIGNIN COMPONENT] Final error message:", errorMessage);
      setError(errorMessage)
    } finally {
      console.log("🔐 [SIGNIN COMPONENT] Setting loading to false");
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <button
              onClick={() => navigate('/signup')}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              create a new account
            </button>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {successMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{successMessage}</span>
            </div>
          )}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SignIn