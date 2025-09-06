import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { leadsService } from '../services/leads'
import type { Lead } from '../types/lead'
import HealthCheck from './HealthCheck'

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Check for success message from navigation state
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message)
      // Clear the navigation state
      navigate(location.pathname, { replace: true })
      
      // Auto-hide success message after 5 seconds
      const timer = setTimeout(() => {
        setSuccessMessage('')
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [location.state, navigate, location.pathname])

  // Fetch leads on component mount
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setIsLoading(true)
        setError('')
        const response = await leadsService.getLeads()
        setLeads(response.leads)
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to fetch leads. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchLeads()
  }, [])

  const handleLogout = () => {
    logout()
    window.location.href = '/signin'
  }

  const handleCreateNewLead = () => {
    navigate('/leads/new')
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      qualified: 'bg-green-100 text-green-800',
      unqualified: 'bg-red-100 text-red-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      converted: 'bg-purple-100 text-purple-800',
      processing: 'bg-yellow-100 text-yellow-800'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    )
  }

  const renderLeadsContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-gray-600">Loading leads...</span>
        </div>
      )
    }

    if (error) {
      return (
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <div className="text-sm text-red-600">{error}</div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
          >
            Try again
          </button>
        </div>
      )
    }

    if (leads.length === 0) {
      return (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M34 40h10v-4a6 6 0 00-10.712-3.714M34 40H14m20 0v-4a9.971 9.971 0 00-.712-3.714M14 40H4v-4a6 6 0 0110.713-3.714M14 40v-4c0-1.313.253-2.566.713-3.714m0 0A9.971 9.971 0 0124 24c4.004 0 7.625 2.371 9.287 6M4 32l44-24"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No leads yet</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first lead.</p>
          <div className="mt-6">
            <button
              onClick={handleCreateNewLead}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg
                className="-ml-1 mr-2 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              Add New Lead
            </button>
          </div>
        </div>
      )
    }

    return (
      <ul className="divide-y divide-gray-200">
        {leads.map((lead) => (
          <li key={lead.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center">
                  <h3 className="text-lg font-medium text-gray-900">{lead.name}</h3>
                  <div className="ml-3">{getStatusBadge(lead.status)}</div>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  <p>Email: {lead.email}</p>
                  {lead.phone && <p>Phone: {lead.phone}</p>}
                  <p>Source: {lead.source}</p>
                  <p>Created: {new Date(lead.created_at).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center">
                <button
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
                >
                  View Details
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Lead Management Dashboard</h1>
              <p className="mt-1 text-sm text-gray-600">Welcome back, {user?.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleCreateNewLead}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg
                  className="-ml-1 mr-2 h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                New Lead
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Success</h3>
                <div className="mt-2 text-sm text-green-700">{successMessage}</div>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    onClick={() => setSuccessMessage('')}
                    className="inline-flex bg-green-50 rounded-md p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-600"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* API Health Check */}
        <HealthCheck />

        {/* Leads List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Your Leads</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Leads are automatically qualified in the background within 60-90 seconds.
                </p>
              </div>
              {leads.length > 0 && (
                <button
                  onClick={handleCreateNewLead}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg
                    className="-ml-1 mr-2 h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Add Lead
                </button>
              )}
            </div>
          </div>
          
          {renderLeadsContent()}
        </div>
      </main>
    </div>
  )
}

export default Dashboard