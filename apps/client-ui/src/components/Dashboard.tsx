import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { Client } from '../types/client';
import axios from 'axios';
import { API_URL } from '../config/api';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // State management for clients functionality
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  // Fetch clients when component mounts
  useEffect(() => {
    const fetchClients = async () => {
      console.log("📋 [DASHBOARD] Starting to fetch clients...");
      setIsLoading(true);
      setError(null);

      try {
        // Get JWT token from localStorage
        const token = authService.getAuthToken();
        console.log("📋 [DASHBOARD] Retrieved token:", {
          hasToken: !!token,
          tokenLength: token ? token.length : 0
        });

        if (!token) {
          throw new Error('No authentication token found. Please sign in again.');
        }

        console.log("📋 [DASHBOARD] Making GET request to /api/clients");
        console.log("📋 [DASHBOARD] Request URL:", `${API_URL}/clients`);
        
        // Make authenticated GET request to /api/clients
        const response = await axios.get(`${API_URL}/clients`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log("📋 [DASHBOARD] Clients fetch successful!");
        console.log("📋 [DASHBOARD] Response status:", response.status);
        console.log("📋 [DASHBOARD] Full response data:", response.data);

        // Handle nested data structure (response.data.data)
        let clientsArray: Client[] = [];
        
        // Check for nested data structure
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
          console.log("📋 [DASHBOARD] Found nested data structure (response.data.data)");
          clientsArray = response.data.data;
        } else if (response.data && Array.isArray(response.data)) {
          console.log("📋 [DASHBOARD] Found direct array structure (response.data)");
          clientsArray = response.data;
        } else {
          console.warn("📋 [DASHBOARD] Unexpected response structure:", response.data);
          clientsArray = [];
        }

        console.log("📋 [DASHBOARD] Parsed clients array:", {
          clientsCount: clientsArray.length,
          firstClient: clientsArray.length > 0 ? clientsArray[0] : null
        });

        setClients(clientsArray);
      } catch (err: any) {
        console.error("📋 [DASHBOARD] Failed to fetch clients:");
        console.error("📋 [DASHBOARD] Error type:", typeof err);
        console.error("📋 [DASHBOARD] Error constructor:", err?.constructor?.name);
        console.error("📋 [DASHBOARD] Full error object:", err);

        let errorMessage = 'Failed to fetch clients. Please try again.';

        if (err?.response) {
          console.error("📋 [DASHBOARD] Error response:", {
            status: err.response.status,
            statusText: err.response.statusText,
            data: err.response.data
          });

          if (err.response.status === 401) {
            errorMessage = 'Authentication failed. Please sign in again.';
            // Redirect to login on authentication failure
            logout();
            navigate('/signin');
            return;
          } else if (err.response.data?.message) {
            errorMessage = err.response.data.message;
          } else if (err.response.data?.error) {
            errorMessage = err.response.data.error;
          } else {
            errorMessage = `HTTP ${err.response.status}: ${err.response.statusText}`;
          }
        } else if (err?.request) {
          console.error("📋 [DASHBOARD] No response received:", err.request);
          errorMessage = 'Network error: Unable to connect to server.';
        } else if (err?.message) {
          console.error("📋 [DASHBOARD] Error message:", err.message);
          errorMessage = err.message;
        }

        console.error("📋 [DASHBOARD] Final error message:", errorMessage);
        setError(errorMessage);
      } finally {
        console.log("📋 [DASHBOARD] Setting loading to false");
        setIsLoading(false);
      }
    };

    fetchClients();
  }, [logout, navigate]);

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
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
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/admin')}
                  className="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 text-sm font-medium"
                >
                  Admin
                </button>
                <button
                  onClick={() => navigate('/playbooks')}
                  className="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 text-sm font-medium"
                >
                  Playbooks
                </button>
                <button
                  onClick={() => navigate('/initiatives')}
                  className="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 text-sm font-medium"
                >
                  Initiatives
                </button>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 mr-4">
                Logged in as: {user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Client Management</h1>
                <button 
                  onClick={() => navigate('/clients/new')}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Add New Client
                </button>
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <p className="ml-3 text-gray-600">Loading clients...</p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                  <strong className="font-bold">Error:</strong>
                  <span className="block sm:inline"> {error}</span>
                  <button 
                    onClick={() => window.location.reload()}
                    className="ml-4 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Empty State */}
              {!isLoading && !error && clients.length === 0 && (
                <div className="text-center py-8">
                  <div className="mx-auto h-12 w-12 text-gray-400">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No clients found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No clients found. Click here to create your first client.
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={() => navigate('/clients/new')}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <svg className="-ml-1 mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Add New Client
                    </button>
                  </div>
                </div>
              )}

              {/* Data State - Client Table */}
              {!isLoading && !error && clients.length > 0 && (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Client Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Primary Contact
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date Created
                        </th>
                        <th scope="col" className="relative px-6 py-3">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {clients.map((client) => (
                        <tr key={client.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <a 
                              href={`/clients/${client.id}`}
                              className="text-indigo-600 hover:text-indigo-900 hover:underline"
                            >
                              {client.name}
                            </a>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {client.primary_contact_name || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {client.primary_contact_email || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(client.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => navigate(`/clients/${client.id}`)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!isLoading && !error && clients.length > 0 && (
                <div className="mt-6 flex justify-between items-center">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{clients.length}</span> client{clients.length !== 1 ? 's' : ''}
                  </div>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Refresh
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
