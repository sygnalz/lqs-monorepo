import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { Lead } from '../types/lead';
import axios from 'axios';

const API_URL = 'https://lqs-uat-worker.charlesheflin.workers.dev/api';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // State management for leads functionality
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  // Fetch leads when component mounts
  useEffect(() => {
    const fetchLeads = async () => {
      console.log("📋 [DASHBOARD] Starting to fetch leads...");
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

        console.log("📋 [DASHBOARD] Making GET request to /api/leads");
        console.log("📋 [DASHBOARD] Request URL:", `${API_URL}/leads`);
        
        // Make authenticated GET request to /api/leads
        const response = await axios.get(`${API_URL}/leads`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log("📋 [DASHBOARD] Leads fetch successful!");
        console.log("📋 [DASHBOARD] Response status:", response.status);
        console.log("📋 [DASHBOARD] Full response data:", response.data);

        // [CRITICAL LEARNING LQS-P2-LRN-001] Handle nested data structure
        let leadsArray: Lead[] = [];
        
        // Check for nested data structure
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
          console.log("📋 [DASHBOARD] Found nested data structure (response.data.data)");
          leadsArray = response.data.data;
        } else if (response.data && Array.isArray(response.data)) {
          console.log("📋 [DASHBOARD] Found direct array structure (response.data)");
          leadsArray = response.data;
        } else {
          console.warn("📋 [DASHBOARD] Unexpected response structure:", response.data);
          leadsArray = [];
        }

        console.log("📋 [DASHBOARD] Parsed leads array:", {
          leadsCount: leadsArray.length,
          firstLead: leadsArray.length > 0 ? leadsArray[0] : null
        });

        setLeads(leadsArray);
      } catch (err: any) {
        console.error("📋 [DASHBOARD] Failed to fetch leads:");
        console.error("📋 [DASHBOARD] Error type:", typeof err);
        console.error("📋 [DASHBOARD] Error constructor:", err?.constructor?.name);
        console.error("📋 [DASHBOARD] Full error object:", err);

        let errorMessage = 'Failed to fetch leads. Please try again.';

        if (err?.response) {
          console.error("📋 [DASHBOARD] Error response:", {
            status: err.response.status,
            statusText: err.response.statusText,
            data: err.response.data
          });

          if (err.response.status === 401) {
            errorMessage = 'Authentication failed. Please sign in again.';
            // Optionally redirect to login
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

    fetchLeads();
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
                <h1 className="text-3xl font-bold text-gray-900">Lead Management</h1>
                <button 
                  onClick={() => navigate('/leads/new')}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Add New Lead
                </button>
              </div>

              {/* Conditional Rendering based on state */}
              {isLoading && (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <p className="ml-3 text-gray-600">Loading leads...</p>
                </div>
              )}

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

              {!isLoading && !error && leads.length === 0 && (
                <div className="text-center py-8">
                  <div className="mx-auto h-12 w-12 text-gray-400">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No leads found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You haven't created any leads yet. Get started by adding your first lead!
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={() => navigate('/leads/new')}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <svg className="-ml-1 mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Add New Lead
                    </button>
                  </div>
                </div>
              )}

              {!isLoading && !error && leads.length > 0 && (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
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
                      {leads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {lead.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {lead.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {lead.phone || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              lead.status === 'active' ? 'bg-green-100 text-green-800' :
                              lead.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {lead.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(lead.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => navigate(`/leads/${lead.id}`)}
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

              {!isLoading && !error && leads.length > 0 && (
                <div className="mt-6 flex justify-between items-center">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{leads.length}</span> lead{leads.length !== 1 ? 's' : ''}
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