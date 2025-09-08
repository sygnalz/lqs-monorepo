import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { Client } from '../types/client';
import { Lead } from '../types/lead';
import axios from 'axios';

const API_URL = 'https://lqs-uat-worker.charlesheflin.workers.dev/api';

const ClientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State management
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Leads state management
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsIsLoading, setLeadsIsLoading] = useState<boolean>(true);
  const [leadsError, setLeadsError] = useState<string | null>(null);

  // Form data state - initialized with empty values
  const [formData, setFormData] = useState({
    name: '',
    primary_contact_name: '',
    primary_contact_email: '',
    primary_contact_phone: '',
    billing_address: '',
    rate_per_minute: '',
    rate_per_sms: '',
    rate_per_lead: ''
  });

  // Fetch client data when component mounts
  useEffect(() => {
    const fetchClient = async () => {
      if (!id) {
        setError('Client ID is required');
        setIsLoading(false);
        return;
      }

      console.log(`📄 [CLIENT_DETAIL] Fetching client with ID: ${id}`);
      setIsLoading(true);
      setError(null);

      try {
        // Get JWT token from localStorage
        const token = authService.getAuthToken();

        if (!token) {
          throw new Error('No authentication token found. Please sign in again.');
        }

        console.log(`📄 [CLIENT_DETAIL] Making GET request to /api/clients/${id}`);
        
        // Make authenticated GET request to fetch single client
        const response = await axios.get(`${API_URL}/clients/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('📄 [CLIENT_DETAIL] Response:', response.data);

        if (response.data.success && response.data.data) {
          const clientData = response.data.data;
          setClient(clientData);
          
          // Initialize form data with client data
          setFormData({
            name: clientData.name || '',
            primary_contact_name: clientData.primary_contact_name || '',
            primary_contact_email: clientData.primary_contact_email || '',
            primary_contact_phone: clientData.primary_contact_phone || '',
            billing_address: clientData.billing_address || '',
            rate_per_minute: clientData.rate_per_minute ? clientData.rate_per_minute.toString() : '',
            rate_per_sms: clientData.rate_per_sms ? clientData.rate_per_sms.toString() : '',
            rate_per_lead: clientData.rate_per_lead ? clientData.rate_per_lead.toString() : ''
          });

          // Fetch leads for this client after client data is successfully loaded
          await fetchClientLeads(id, token);
        } else {
          throw new Error('Failed to fetch client data');
        }

      } catch (err: any) {
        console.error('📄 [CLIENT_DETAIL] Failed to fetch client:', err);

        let errorMessage = 'Failed to fetch client details. Please try again.';

        if (err?.response) {
          console.error('📄 [CLIENT_DETAIL] Error response:', {
            status: err.response.status,
            statusText: err.response.statusText,
            data: err.response.data
          });

          if (err.response.status === 401) {
            errorMessage = 'Authentication failed. Please sign in again.';
          } else if (err.response.status === 404) {
            errorMessage = 'Client not found.';
          } else if (err.response.data?.error) {
            errorMessage = err.response.data.error;
          } else {
            errorMessage = `HTTP ${err.response.status}: ${err.response.statusText}`;
          }
        } else if (err?.request) {
          console.error('📄 [CLIENT_DETAIL] No response received:', err.request);
          errorMessage = 'Network error: Unable to connect to server.';
        } else if (err?.message) {
          console.error('📄 [CLIENT_DETAIL] Error message:', err.message);
          errorMessage = err.message;
        }

        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    // Helper function to fetch leads for a client
    const fetchClientLeads = async (clientId: string, token: string) => {
      console.log(`📊 [CLIENT_LEADS] Fetching leads for client ID: ${clientId}`);
      setLeadsIsLoading(true);
      setLeadsError(null);

      try {
        // Make authenticated GET request to fetch client leads
        const leadsResponse = await axios.get(`${API_URL}/clients/${clientId}/leads`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('📊 [CLIENT_LEADS] Response:', leadsResponse.data);

        if (leadsResponse.data.success && Array.isArray(leadsResponse.data.data)) {
          setLeads(leadsResponse.data.data);
        } else {
          throw new Error('Failed to fetch leads data');
        }

      } catch (err: any) {
        console.error('📊 [CLIENT_LEADS] Failed to fetch leads:', err);

        let leadsErrorMessage = 'Failed to fetch leads. Please try again.';

        if (err?.response) {
          console.error('📊 [CLIENT_LEADS] Error response:', {
            status: err.response.status,
            statusText: err.response.statusText,
            data: err.response.data
          });

          if (err.response.status === 401) {
            leadsErrorMessage = 'Authentication failed while fetching leads.';
          } else if (err.response.status === 404) {
            leadsErrorMessage = 'Client not found or no leads available.';
          } else if (err.response.data?.error) {
            leadsErrorMessage = err.response.data.error;
          } else {
            leadsErrorMessage = `HTTP ${err.response.status}: ${err.response.statusText}`;
          }
        } else if (err?.request) {
          console.error('📊 [CLIENT_LEADS] No response received:', err.request);
          leadsErrorMessage = 'Network error: Unable to connect to server.';
        } else if (err?.message) {
          console.error('📊 [CLIENT_LEADS] Error message:', err.message);
          leadsErrorMessage = err.message;
        }

        setLeadsError(leadsErrorMessage);
      } finally {
        setLeadsIsLoading(false);
      }
    };

    fetchClient();
  }, [id]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle edit mode toggle
  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset form data to original client data
      if (client) {
        setFormData({
          name: client.name || '',
          primary_contact_name: client.primary_contact_name || '',
          primary_contact_email: client.primary_contact_email || '',
          primary_contact_phone: client.primary_contact_phone || '',
          billing_address: client.billing_address || '',
          rate_per_minute: client.rate_per_minute ? client.rate_per_minute.toString() : '',
          rate_per_sms: client.rate_per_sms ? client.rate_per_sms.toString() : '',
          rate_per_lead: client.rate_per_lead ? client.rate_per_lead.toString() : ''
        });
      }
      setError(null);
    }
    setIsEditing(!isEditing);
  };

  // Handle form submission (update client)
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Get JWT token from localStorage
      const token = authService.getAuthToken();

      if (!token) {
        throw new Error('No authentication token found. Please sign in again.');
      }

      console.log(`📄 [CLIENT_DETAIL] Updating client with ID: ${id}`);
      console.log('📄 [CLIENT_DETAIL] Form data:', formData);

      // Build update payload with only billing information (current backend only supports billing updates)
      const updatePayload = {
        billing_address: formData.billing_address || null,
        rate_per_minute: formData.rate_per_minute ? parseFloat(formData.rate_per_minute) : null,
        rate_per_sms: formData.rate_per_sms ? parseFloat(formData.rate_per_sms) : null,
        rate_per_lead: formData.rate_per_lead ? parseFloat(formData.rate_per_lead) : null
      };

      console.log('📄 [CLIENT_DETAIL] Update payload:', updatePayload);
      
      // Execute authenticated PATCH request to update client
      const response = await axios.patch(`${API_URL}/clients/${id}`, updatePayload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📄 [CLIENT_DETAIL] Update successful!');
      console.log('📄 [CLIENT_DETAIL] Response:', response.data);

      if (response.data.success && response.data.data) {
        // Update client state with response data
        const updatedClient = response.data.data;
        setClient(updatedClient);
        
        // Update form data to reflect saved changes
        setFormData({
          name: updatedClient.name || '',
          primary_contact_name: updatedClient.primary_contact_name || '',
          primary_contact_email: updatedClient.primary_contact_email || '',
          primary_contact_phone: updatedClient.primary_contact_phone || '',
          billing_address: updatedClient.billing_address || '',
          rate_per_minute: updatedClient.rate_per_minute ? updatedClient.rate_per_minute.toString() : '',
          rate_per_sms: updatedClient.rate_per_sms ? updatedClient.rate_per_sms.toString() : '',
          rate_per_lead: updatedClient.rate_per_lead ? updatedClient.rate_per_lead.toString() : ''
        });

        // Exit editing mode
        setIsEditing(false);
      } else {
        throw new Error('Failed to update client data');
      }

    } catch (err: any) {
      console.error('📄 [CLIENT_DETAIL] Failed to update client:', err);

      let errorMessage = 'Failed to update client. Please try again.';

      if (err?.response) {
        console.error('📄 [CLIENT_DETAIL] Error response:', {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data
        });

        if (err.response.status === 401) {
          errorMessage = 'Authentication failed. Please sign in again.';
        } else if (err.response.status === 404) {
          errorMessage = 'Client not found.';
        } else if (err.response.data?.error) {
          errorMessage = err.response.data.error;
        } else {
          errorMessage = `HTTP ${err.response.status}: ${err.response.statusText}`;
        }
      } else if (err?.request) {
        console.error('📄 [CLIENT_DETAIL] No response received:', err.request);
        errorMessage = 'Network error: Unable to connect to server.';
      } else if (err?.message) {
        console.error('📄 [CLIENT_DETAIL] Error message:', err.message);
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle back to dashboard
  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  // Handle add new lead navigation
  const handleAddNewLead = () => {
    navigate(`/clients/${id}/leads/new`);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-4"></div>
          <span className="text-gray-600">Loading client details...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !client) {
    return (
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <span className="text-xl font-bold text-indigo-600">LQS</span>
                </div>
              </div>
              <div className="flex items-center">
                <button
                  onClick={handleBackToDashboard}
                  className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main>
          <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <strong className="font-bold">Error:</strong>
                <span className="block sm:inline"> {error}</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Main component render
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold text-indigo-600">LQS</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {!isEditing && (
                <button
                  onClick={handleEditToggle}
                  className="px-3 py-2 border border-indigo-300 text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                >
                  Edit Client
                </button>
              )}
              <button
                onClick={handleBackToDashboard}
                className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Page Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">
                {isEditing ? 'Edit Client' : 'Client Details'}
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                {isEditing 
                  ? 'Update billing information and client details below.'
                  : 'View and manage client information and billing settings.'
                }
              </p>
            </div>

            {/* Error State */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
                <strong className="font-bold">Error:</strong>
                <span className="block sm:inline"> {error}</span>
              </div>
            )}

            {/* Client Information Card */}
            <div className="bg-white shadow rounded-lg">
              {isEditing ? (
                /* Edit Form */
                <form onSubmit={handleSubmit} className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Information Section */}
                    <div className="md:col-span-2">
                      <h2 className="text-lg font-medium text-gray-900 mb-4 border-b border-gray-200 pb-2">
                        Basic Information
                      </h2>
                    </div>

                    {/* Client Name - Read Only for now (not supported by current backend) */}
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Client Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        readOnly
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
                        title="Client name cannot be edited at this time"
                      />
                      <p className="mt-1 text-xs text-gray-500">Basic client information is read-only</p>
                    </div>

                    {/* Primary Contact Name - Read Only for now */}
                    <div>
                      <label htmlFor="primary_contact_name" className="block text-sm font-medium text-gray-700">
                        Primary Contact Name
                      </label>
                      <input
                        type="text"
                        id="primary_contact_name"
                        name="primary_contact_name"
                        value={formData.primary_contact_name}
                        readOnly
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
                      />
                    </div>

                    {/* Primary Contact Email - Read Only for now */}
                    <div>
                      <label htmlFor="primary_contact_email" className="block text-sm font-medium text-gray-700">
                        Primary Contact Email
                      </label>
                      <input
                        type="email"
                        id="primary_contact_email"
                        name="primary_contact_email"
                        value={formData.primary_contact_email}
                        readOnly
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
                      />
                    </div>

                    {/* Primary Contact Phone - Read Only for now */}
                    <div>
                      <label htmlFor="primary_contact_phone" className="block text-sm font-medium text-gray-700">
                        Primary Contact Phone
                      </label>
                      <input
                        type="tel"
                        id="primary_contact_phone"
                        name="primary_contact_phone"
                        value={formData.primary_contact_phone}
                        readOnly
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
                      />
                    </div>

                    {/* Billing Information Section */}
                    <div className="md:col-span-2 mt-8">
                      <h2 className="text-lg font-medium text-gray-900 mb-4 border-b border-gray-200 pb-2">
                        Billing Information
                      </h2>
                    </div>

                    {/* Billing Address */}
                    <div className="md:col-span-2">
                      <label htmlFor="billing_address" className="block text-sm font-medium text-gray-700">
                        Billing Address
                      </label>
                      <textarea
                        id="billing_address"
                        name="billing_address"
                        rows={3}
                        value={formData.billing_address}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Enter the billing address for this client"
                      />
                    </div>

                    {/* Rate Per Minute */}
                    <div>
                      <label htmlFor="rate_per_minute" className="block text-sm font-medium text-gray-700">
                        Rate Per Minute ($)
                      </label>
                      <input
                        type="number"
                        id="rate_per_minute"
                        name="rate_per_minute"
                        step="0.0001"
                        min="0"
                        value={formData.rate_per_minute}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Rate Per SMS */}
                    <div>
                      <label htmlFor="rate_per_sms" className="block text-sm font-medium text-gray-700">
                        Rate Per SMS ($)
                      </label>
                      <input
                        type="number"
                        id="rate_per_sms"
                        name="rate_per_sms"
                        step="0.0001"
                        min="0"
                        value={formData.rate_per_sms}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Rate Per Lead */}
                    <div>
                      <label htmlFor="rate_per_lead" className="block text-sm font-medium text-gray-700">
                        Rate Per Lead ($)
                      </label>
                      <input
                        type="number"
                        id="rate_per_lead"
                        name="rate_per_lead"
                        step="0.0001"
                        min="0"
                        value={formData.rate_per_lead}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex items-center justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={handleEditToggle}
                      disabled={isSubmitting}
                      className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {isSubmitting && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      )}
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              ) : (
                /* View Mode */
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Information Section */}
                    <div className="md:col-span-2">
                      <h2 className="text-lg font-medium text-gray-900 mb-4 border-b border-gray-200 pb-2">
                        Basic Information
                      </h2>
                    </div>

                    {/* Client Name */}
                    <div>
                      <dt className="text-sm font-medium text-gray-700">Client Name</dt>
                      <dd className="mt-1 text-sm text-gray-900">{client?.name || 'Not specified'}</dd>
                    </div>

                    {/* Primary Contact Name */}
                    <div>
                      <dt className="text-sm font-medium text-gray-700">Primary Contact Name</dt>
                      <dd className="mt-1 text-sm text-gray-900">{client?.primary_contact_name || 'Not specified'}</dd>
                    </div>

                    {/* Primary Contact Email */}
                    <div>
                      <dt className="text-sm font-medium text-gray-700">Primary Contact Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">{client?.primary_contact_email || 'Not specified'}</dd>
                    </div>

                    {/* Primary Contact Phone */}
                    <div>
                      <dt className="text-sm font-medium text-gray-700">Primary Contact Phone</dt>
                      <dd className="mt-1 text-sm text-gray-900">{client?.primary_contact_phone || 'Not specified'}</dd>
                    </div>

                    {/* Created Date */}
                    <div>
                      <dt className="text-sm font-medium text-gray-700">Created</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {client?.created_at ? new Date(client.created_at).toLocaleDateString() : 'Not available'}
                      </dd>
                    </div>

                    {/* Client ID */}
                    <div>
                      <dt className="text-sm font-medium text-gray-700">Client ID</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-mono">{client?.id || 'Not available'}</dd>
                    </div>

                    {/* Billing Information Section */}
                    <div className="md:col-span-2 mt-8">
                      <h2 className="text-lg font-medium text-gray-900 mb-4 border-b border-gray-200 pb-2">
                        Billing Information
                      </h2>
                    </div>

                    {/* Billing Address */}
                    <div className="md:col-span-2">
                      <dt className="text-sm font-medium text-gray-700">Billing Address</dt>
                      <dd className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                        {client?.billing_address || 'Not specified'}
                      </dd>
                    </div>

                    {/* Rate Per Minute */}
                    <div>
                      <dt className="text-sm font-medium text-gray-700">Rate Per Minute</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {client?.rate_per_minute ? `$${client.rate_per_minute.toFixed(4)}` : 'Not set'}
                      </dd>
                    </div>

                    {/* Rate Per SMS */}
                    <div>
                      <dt className="text-sm font-medium text-gray-700">Rate Per SMS</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {client?.rate_per_sms ? `$${client.rate_per_sms.toFixed(4)}` : 'Not set'}
                      </dd>
                    </div>

                    {/* Rate Per Lead */}
                    <div>
                      <dt className="text-sm font-medium text-gray-700">Rate Per Lead</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {client?.rate_per_lead ? `$${client.rate_per_lead.toFixed(4)}` : 'Not set'}
                      </dd>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Leads Section */}
            <div className="mt-8 bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">Leads</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Manage leads associated with this client
                    </p>
                  </div>
                  <button
                    onClick={handleAddNewLead}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Add New Lead
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Leads Loading State */}
                {leadsIsLoading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mr-3"></div>
                      <span className="text-gray-600">Loading leads...</span>
                    </div>
                  </div>
                )}

                {/* Leads Error State */}
                {leadsError && !leadsIsLoading && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <strong className="font-bold">Error:</strong>
                    <span className="block sm:inline"> {leadsError}</span>
                  </div>
                )}

                {/* Leads Empty State */}
                {!leadsIsLoading && !leadsError && leads.length === 0 && (
                  <div className="text-center py-8">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No leads</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      No leads have been created for this client.
                    </p>
                    <div className="mt-6">
                      <button
                        onClick={handleAddNewLead}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Add your first lead
                      </button>
                    </div>
                  </div>
                )}

                {/* Leads Data State - Table Display */}
                {!leadsIsLoading && !leadsError && leads.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Lead Name
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Email
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Phone
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Status
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Created
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {leads.map((lead) => (
                          <tr key={lead.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {lead.name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {lead.email || 'Not provided'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {lead.phone || 'Not provided'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 text-xs font-semibold rounded-full ${
                                  lead.status === 'new'
                                    ? 'bg-green-100 text-green-800'
                                    : lead.status === 'contacted'
                                    ? 'bg-blue-100 text-blue-800'
                                    : lead.status === 'qualified'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : lead.status === 'converted'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {lead.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(lead.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClientDetailPage;