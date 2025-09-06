import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { leadsService } from '../services/leads'
import type { Lead } from '../types/lead'

const LeadDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [lead, setLead] = useState<Lead | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchLead = async () => {
      if (!id) {
        setError('No lead ID provided')
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError('')
        const response = await leadsService.getLead(id)
        setLead(response.lead)
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to fetch lead details. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchLead()
  }, [id])

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
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const handleBackToDashboard = () => {
    navigate('/dashboard')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Loading lead details...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-md p-6 mb-4">
            <div className="text-sm text-red-600">{error}</div>
          </div>
          <button
            onClick={handleBackToDashboard}
            className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Lead not found</h3>
          <p className="text-gray-600 mb-4">The requested lead could not be found.</p>
          <button
            onClick={handleBackToDashboard}
            className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2">
                  <li>
                    <button
                      onClick={handleBackToDashboard}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      Dashboard
                    </button>
                  </li>
                  <li className="flex items-center">
                    <svg
                      className="flex-shrink-0 h-5 w-5 text-gray-300"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                    </svg>
                    <span className="ml-2 text-sm font-medium text-gray-500">Lead Details</span>
                  </li>
                </ol>
              </nav>
              <h1 className="mt-2 text-3xl font-bold text-gray-900">{lead.name}</h1>
              <div className="mt-2 flex items-center">
                {getStatusBadge(lead.status)}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToDashboard}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{lead.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <a href={`mailto:${lead.email}`} className="text-indigo-600 hover:text-indigo-500">
                        {lead.email}
                      </a>
                    </dd>
                  </div>
                  {lead.phone && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Phone</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <a href={`tel:${lead.phone}`} className="text-indigo-600 hover:text-indigo-500">
                          {lead.phone}
                        </a>
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Source</dt>
                    <dd className="mt-1 text-sm text-gray-900 capitalize">{lead.source.replace('_', ' ')}</dd>
                  </div>
                </dl>
              </div>

              {/* Status & Timeline */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Status & Timeline</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Current Status</dt>
                    <dd className="mt-1">{getStatusBadge(lead.status)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(lead.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(lead.updated_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Status Information */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Lead Status Information</h3>
              <div className="mt-2 text-sm text-blue-700">
                {lead.status === 'new' && (
                  <p>This lead is newly created and will be automatically processed within 60-90 seconds.</p>
                )}
                {lead.status === 'processing' && (
                  <p>This lead is currently being processed by our qualification system.</p>
                )}
                {lead.status === 'qualified' && (
                  <p>This lead has been automatically qualified and is ready for follow-up.</p>
                )}
                {lead.status === 'unqualified' && (
                  <p>This lead has been reviewed and marked as unqualified based on our criteria.</p>
                )}
                {lead.status === 'contacted' && (
                  <p>This lead has been contacted and is in the communication pipeline.</p>
                )}
                {lead.status === 'converted' && (
                  <p>Congratulations! This lead has been successfully converted to a customer.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default LeadDetail