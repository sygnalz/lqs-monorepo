import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import axios from 'axios';
import { API_URL } from '../config/api';

const CreateClient: React.FC = () => {
  const navigate = useNavigate();

  // Form state management
  const [formData, setFormData] = useState({
    name: '',
    primary_contact_name: '',
    primary_contact_email: '',
    primary_contact_phone: ''
  });

  // Submission state management
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle cancel button - navigate back to dashboard
  const handleCancel = () => {
    navigate('/dashboard');
  };

  // Form submission logic
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

      console.log("📝 [CREATE_CLIENT] Starting client creation...");
      console.log("📝 [CREATE_CLIENT] Form data:", formData);

      // Construct JSON payload from form state
      const payload = {
        name: formData.name,
        primary_contact_name: formData.primary_contact_name || null,
        primary_contact_email: formData.primary_contact_email || null,
        primary_contact_phone: formData.primary_contact_phone || null
      };

      console.log("📝 [CREATE_CLIENT] Sending POST request to /api/clients");
      
      // Execute authenticated POST request to /api/clients endpoint
      const response = await axios.post(`${API_URL}/clients`, payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log("📝 [CREATE_CLIENT] Client creation successful!");
      console.log("📝 [CREATE_CLIENT] Response:", response.data);

      // On successful response, redirect user to dashboard
      navigate('/dashboard');

    } catch (err: any) {
      console.error("📝 [CREATE_CLIENT] Failed to create client:", err);

      let errorMessage = 'Failed to create client. Please try again.';

      if (err?.response) {
        console.error("📝 [CREATE_CLIENT] Error response:", {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data
        });

        if (err.response.status === 401) {
          errorMessage = 'Authentication failed. Please sign in again.';
        } else if (err.response.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.response.data?.error) {
          errorMessage = err.response.data.error;
        } else {
          errorMessage = `HTTP ${err.response.status}: ${err.response.statusText}`;
        }
      } else if (err?.request) {
        console.error("📝 [CREATE_CLIENT] No response received:", err.request);
        errorMessage = 'Network error: Unable to connect to server.';
      } else if (err?.message) {
        console.error("📝 [CREATE_CLIENT] Error message:", err.message);
        errorMessage = err.message;
      }

      // Update error state with user-friendly message
      setError(errorMessage);
    } finally {
      // Set isSubmitting back to false
      setIsSubmitting(false);
    }
  };

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
                className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <div className="max-w-2xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Create New Client</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Add a new client to your organization. Required fields are marked with an asterisk (*).
                </p>
              </div>

              {/* Error State */}
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
                  <strong className="font-bold">Error:</strong>
                  <span className="block sm:inline"> {error}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Client Name - Required */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Enter the client organization name"
                  />
                </div>

                {/* Primary Contact Name */}
                <div>
                  <label htmlFor="primary_contact_name" className="block text-sm font-medium text-gray-700">
                    Primary Contact Name
                  </label>
                  <input
                    type="text"
                    id="primary_contact_name"
                    name="primary_contact_name"
                    value={formData.primary_contact_name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Enter the primary contact's full name"
                  />
                </div>

                {/* Primary Contact Email */}
                <div>
                  <label htmlFor="primary_contact_email" className="block text-sm font-medium text-gray-700">
                    Primary Contact Email
                  </label>
                  <input
                    type="email"
                    id="primary_contact_email"
                    name="primary_contact_email"
                    value={formData.primary_contact_email}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Enter the primary contact's email address"
                  />
                </div>

                {/* Primary Contact Phone */}
                <div>
                  <label htmlFor="primary_contact_phone" className="block text-sm font-medium text-gray-700">
                    Primary Contact Phone
                  </label>
                  <input
                    type="tel"
                    id="primary_contact_phone"
                    name="primary_contact_phone"
                    value={formData.primary_contact_phone}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Enter the primary contact's phone number"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end space-x-4 pt-6">
                  {/* Cancel Button */}
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting || !formData.name.trim()}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isSubmitting && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    )}
                    {isSubmitting ? 'Saving...' : 'Save Client'}
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

export default CreateClient;
