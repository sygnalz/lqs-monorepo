import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import axios from 'axios';

import { API_URL } from '../config/api';

const CreateLeadPage: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  // Form state management
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'new',
    notes: ''
  });

  // Submission tracking state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle cancel navigation
  const handleCancel = () => {
    navigate(`/clients/${clientId}`);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error('Lead name is required');
      }
      if (!formData.status) {
        throw new Error('Lead status is required');
      }

      // Get JWT token from localStorage
      const token = authService.getAuthToken();

      if (!token) {
        throw new Error('No authentication token found. Please sign in again.');
      }

      console.log(`📄 [CREATE_LEAD] Creating lead for client ID: ${clientId}`);
      console.log('📄 [CREATE_LEAD] Form data:', formData);

      // Construct JSON payload
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        status: formData.status,
        notes: formData.notes.trim() || null
      };

      console.log('📄 [CREATE_LEAD] Payload:', payload);

      // Execute authenticated POST request to create lead
      const response = await axios.post(`${API_URL}/clients/${clientId}/leads`, payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📄 [CREATE_LEAD] Lead created successfully!');
      console.log('📄 [CREATE_LEAD] Response:', response.data);

      if (response.data.success) {
        // On success, redirect back to client detail page
        navigate(`/clients/${clientId}`);
      } else {
        throw new Error('Failed to create lead');
      }

    } catch (err: any) {
      console.error('📄 [CREATE_LEAD] Failed to create lead:', err);

      let errorMessage = 'Failed to create lead. Please try again.';

      if (err?.response) {
        console.error('📄 [CREATE_LEAD] Error response:', {
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
        console.error('📄 [CREATE_LEAD] No response received:', err.request);
        errorMessage = 'Network error: Unable to connect to server.';
      } else if (err?.message) {
        console.error('📄 [CREATE_LEAD] Error message:', err.message);
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validate clientId from URL
  if (!clientId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> Client ID is required to create a lead.</span>
        </div>
      </div>
    );
  }

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
                onClick={handleCancel}
                disabled={isSubmitting}
                className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back to Client
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <div className="max-w-2xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Page Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Create New Lead</h1>
              <p className="mt-2 text-sm text-gray-600">
                Add a new lead for this client. Fill out the form below with the lead's information.
              </p>
            </div>

            {/* Error State */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
                <strong className="font-bold">Error:</strong>
                <span className="block sm:inline"> {error}</span>
              </div>
            )}

            {/* Create Lead Form */}
            <div className="bg-white shadow rounded-lg">
              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-6">
                  {/* Lead Name (Required) */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Lead Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Enter the lead's full name"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Enter the lead's email address"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Enter the lead's phone number"
                    />
                  </div>

                  {/* Status (Required) */}
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="status"
                      name="status"
                      required
                      value={formData.status}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="unqualified">Unqualified</option>
                    </select>
                  </div>

                  {/* Notes */}
                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                      Notes
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      rows={4}
                      value={formData.notes}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      placeholder="Add any additional notes about this lead..."
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !formData.name.trim()}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isSubmitting && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    )}
                    {isSubmitting ? 'Saving Lead...' : 'Save Lead'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateLeadPage;
