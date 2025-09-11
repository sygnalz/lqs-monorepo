import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth';
import { Client } from '../types/client';
import { Lead } from '../types/lead';
import axios from 'axios';

const API_URL = 'https://lqs-uat-worker.charlesheflin.workers.dev/api';

type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: 'name' | 'created_at' | null;
  direction: SortDirection;
}

const AdminDashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [prospects, setProspects] = useState<Lead[]>([]);
  const [firstAgent, setFirstAgent] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });
  const [selectedProspects, setSelectedProspects] = useState<Set<string>>(new Set());
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showBulkActions, setShowBulkActions] = useState<boolean>(false);
  const [isPerformingAction, setIsPerformingAction] = useState<boolean>(false);

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  // Fetch agents (clients) and prospects (leads)
  const fetchAdminData = async () => {
    console.log("🏢 [ADMIN DASHBOARD] Starting to fetch admin data...");
    setIsLoading(true);
    setError(null);

    try {
      // Get JWT token from localStorage
      const token = authService.getAuthToken();
      console.log("🏢 [ADMIN DASHBOARD] Retrieved token:", {
        hasToken: !!token,
        tokenLength: token ? token.length : 0
      });

      if (!token) {
        throw new Error('No authentication token found. Please sign in again.');
      }

      console.log("🏢 [ADMIN DASHBOARD] Making GET request to /api/clients");
      
      // Fetch all agents (clients)
      const clientsResponse = await axios.get(`${API_URL}/clients`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log("🏢 [ADMIN DASHBOARD] Clients fetch successful!");
      console.log("🏢 [ADMIN DASHBOARD] Response status:", clientsResponse.status);
      console.log("🏢 [ADMIN DASHBOARD] Full response data:", clientsResponse.data);

      // Handle nested data structure
      let clientsArray: Client[] = [];
      
      if (clientsResponse.data && clientsResponse.data.data && Array.isArray(clientsResponse.data.data)) {
        console.log("🏢 [ADMIN DASHBOARD] Found nested data structure (response.data.data)");
        clientsArray = clientsResponse.data.data;
      } else if (clientsResponse.data && Array.isArray(clientsResponse.data)) {
        console.log("🏢 [ADMIN DASHBOARD] Found direct array structure (response.data)");
        clientsArray = clientsResponse.data;
      } else {
        console.warn("🏢 [ADMIN DASHBOARD] Unexpected response structure:", clientsResponse.data);
        clientsArray = [];
      }

      console.log("🏢 [ADMIN DASHBOARD] Parsed clients array:", {
        clientsCount: clientsArray.length,
        firstClient: clientsArray.length > 0 ? clientsArray[0] : null
      });

      if (clientsArray.length === 0) {
        setError('No agents found. Please create an agent first.');
        return;
      }

      // Get first agent (client)
      const firstClient = clientsArray[0];
      setFirstAgent(firstClient);

      console.log(`🎯 [ADMIN DASHBOARD] Using first agent: ${firstClient.name} (ID: ${firstClient.id})`);
      console.log(`🎯 [ADMIN DASHBOARD] Making GET request to /api/clients/${firstClient.id}/leads`);

      // Fetch prospects (leads) for the first agent
      const leadsResponse = await axios.get(`${API_URL}/clients/${firstClient.id}/leads`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log("🎯 [ADMIN DASHBOARD] Leads fetch successful!");
      console.log("🎯 [ADMIN DASHBOARD] Response status:", leadsResponse.status);
      console.log("🎯 [ADMIN DASHBOARD] Full leads response:", leadsResponse.data);

      // Handle leads data structure
      let leadsArray: Lead[] = [];
      
      if (leadsResponse.data && leadsResponse.data.data && Array.isArray(leadsResponse.data.data)) {
        console.log("🎯 [ADMIN DASHBOARD] Found nested leads data structure (response.data.data)");
        leadsArray = leadsResponse.data.data;
      } else if (leadsResponse.data && Array.isArray(leadsResponse.data)) {
        console.log("🎯 [ADMIN DASHBOARD] Found direct leads array structure (response.data)");
        leadsArray = leadsResponse.data;
      } else {
        console.warn("🎯 [ADMIN DASHBOARD] Unexpected leads response structure:", leadsResponse.data);
        leadsArray = [];
      }

      console.log("🎯 [ADMIN DASHBOARD] Parsed leads array:", {
        leadsCount: leadsArray.length,
        firstLead: leadsArray.length > 0 ? leadsArray[0] : null
      });

      setProspects(leadsArray);

    } catch (err: any) {
      console.error("🏢 [ADMIN DASHBOARD] Failed to fetch admin data:");
      console.error("🏢 [ADMIN DASHBOARD] Error type:", typeof err);
      console.error("🏢 [ADMIN DASHBOARD] Error constructor:", err?.constructor?.name);
      console.error("🏢 [ADMIN DASHBOARD] Full error object:", err);

      let errorMessage = 'Failed to fetch admin data. Please try again.';

      if (err?.response) {
        console.error("🏢 [ADMIN DASHBOARD] Error response:", {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data
        });

        if (err.response.status === 401) {
          errorMessage = 'Authentication failed. Please sign in again.';
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
        console.error("🏢 [ADMIN DASHBOARD] No response received:", err.request);
        errorMessage = 'Network error: Unable to connect to server.';
      } else if (err?.message) {
        console.error("🏢 [ADMIN DASHBOARD] Error message:", err.message);
        errorMessage = err.message;
      }

      console.error("🏢 [ADMIN DASHBOARD] Final error message:", errorMessage);
      setError(errorMessage);
    } finally {
      console.log("🏢 [ADMIN DASHBOARD] Setting loading to false");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData, logout, navigate]);

  const handleProspectAction = async (prospectId: string, action: string) => {
    try {
      setIsPerformingAction(true);
      setError(null);
      
      const token = authService.getAuthToken();
      if (!token) {
        setError('No authentication token found. Please sign in again.');
        return;
      }

      const response = await axios.post(`${API_URL}/leads/${prospectId}/${action}`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        await fetchAdminData();
        setOpenDropdown(null);
      } else {
        setError(response.data.error || `Failed to ${action} prospect`);
      }
    } catch (err: any) {
      console.error(`Error performing ${action} action:`, err);
      if (err.response?.status === 401) {
        setError('Authentication failed. Please sign in again.');
      } else {
        setError(`Failed to ${action} prospect. Please try again.`);
      }
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleBulkAction = async (action: string) => {
    try {
      setIsPerformingAction(true);
      setError(null);
      
      const token = authService.getAuthToken();
      if (!token) {
        setError('No authentication token found. Please sign in again.');
        return;
      }

      const leadIds = Array.from(selectedProspects);
      const response = await axios.post(`${API_URL}/leads/bulk-action`, {
        action,
        leadIds
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        await fetchAdminData();
        setSelectedProspects(new Set());
        setShowBulkActions(false);
      } else {
        setError(response.data.error || `Failed to perform bulk ${action}`);
      }
    } catch (err: any) {
      console.error(`Error performing bulk ${action}:`, err);
      if (err.response?.status === 401) {
        setError('Authentication failed. Please sign in again.');
      } else {
        setError(`Failed to perform bulk ${action}. Please try again.`);
      }
    } finally {
      setIsPerformingAction(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedProspects.size === prospects.length) {
      setSelectedProspects(new Set());
      setShowBulkActions(false);
    } else {
      const allIds = new Set(prospects.map(lead => lead.id));
      setSelectedProspects(allIds);
      setShowBulkActions(true);
    }
  };

  const handleSelectProspect = (prospectId: string) => {
    const newSelected = new Set(selectedProspects);
    if (newSelected.has(prospectId)) {
      newSelected.delete(prospectId);
    } else {
      newSelected.add(prospectId);
    }
    setSelectedProspects(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const formatAction = (actionType: string | null | undefined, timestamp: string | null | undefined) => {
    if (!actionType || !timestamp) return '-';
    
    const date = new Date(timestamp);
    const formattedDate = date.toLocaleDateString();
    const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const actionLabels: { [key: string]: string } = {
      'pause': 'Paused',
      'resume': 'Resumed',
      'review-bin': 'Moved to Review'
    };
    
    return `${actionLabels[actionType] || actionType} (${formattedDate} ${formattedTime})`;
  };

  const getAutomationStatusBadge = (status: string | undefined) => {
    const statusConfig = {
      'active': { label: 'Active', className: 'bg-green-100 text-green-800' },
      'paused': { label: 'Paused', className: 'bg-yellow-100 text-yellow-800' },
      'review': { label: 'Review', className: 'bg-red-100 text-red-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || { label: 'Active', className: 'bg-green-100 text-green-800' };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  // Status badge color mapping
  const getStatusBadgeClass = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'new':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'contacted':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'qualified':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'interested':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'not_interested':
      case 'not interested':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'converted':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

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

  // Handle sorting
  const handleSort = (key: 'name' | 'created_at') => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Sort prospects based on current sort config
  const sortedProspects = React.useMemo(() => {
    if (!sortConfig.key) return prospects;

    return [...prospects].sort((a, b) => {
      const aValue = sortConfig.key === 'name' ? a.name : a.created_at;
      const bValue = sortConfig.key === 'name' ? b.name : b.created_at;

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [prospects, sortConfig]);

  // Handle prospect name click
  const handleProspectClick = (prospectId: string) => {
    navigate(`/prospect/${prospectId}`);
  };

  // Render sort icon
  const renderSortIcon = (key: 'name' | 'created_at') => {
    if (sortConfig.key !== key) {
      return <span className="ml-1 text-gray-400">↕</span>;
    }
    return (
      <span className="ml-1">
        {sortConfig.direction === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold text-indigo-600">LQS Admin</span>
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
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard - Prospect Management</h1>
                  {firstAgent && (
                    <p className="text-sm text-gray-600 mt-2">
                      Displaying prospects for agent: <span className="font-medium">{firstAgent.name}</span> ({firstAgent.id.substring(0, 8)})
                    </p>
                  )}
                </div>
                {showBulkActions && (
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">
                      {selectedProspects.size} selected
                    </span>
                    <div className="relative">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleBulkAction(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        disabled={isPerformingAction}
                      >
                        <option value="">Bulk Actions</option>
                        <option value="pause">Pause Automation</option>
                        <option value="resume">Resume Automation</option>
                        <option value="review-bin">Move to Review Bin</option>
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedProspects(new Set());
                        setShowBulkActions(false);
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Clear Selection
                    </button>
                  </div>
                )}
              </div>

              {/* Loading State */}
              {isLoading && (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <p className="ml-3 text-gray-600">Loading prospects...</p>
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
              {!isLoading && !error && sortedProspects.length === 0 && (
                <div className="text-center py-8">
                  <div className="mx-auto h-12 w-12 text-gray-400">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No prospects found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {firstAgent 
                      ? `No prospects found for agent "${firstAgent.name}".` 
                      : 'No prospects available.'
                    }
                  </p>
                </div>
              )}

              {/* Data State - Prospects Table */}
              {!isLoading && !error && sortedProspects.length > 0 && (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              checked={selectedProspects.size === prospects.length && prospects.length > 0}
                              onChange={handleSelectAll}
                            />
                            <span className="ml-2">Select</span>
                          </div>
                        </th>
                        <th 
                          scope="col" 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('name')}
                        >
                          Full Name
                          {renderSortIcon('name')}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone Number
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status Badge
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Automation
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Action
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Next Action
                        </th>
                        <th 
                          scope="col" 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('created_at')}
                        >
                          Created Date
                          {renderSortIcon('created_at')}
                        </th>
                        <th scope="col" className="relative px-6 py-3">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedProspects.map((prospect) => (
                        <tr key={prospect.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              checked={selectedProspects.has(prospect.id)}
                              onChange={() => handleSelectProspect(prospect.id)}
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <button
                              onClick={() => handleProspectClick(prospect.id)}
                              className="text-indigo-600 hover:text-indigo-900 hover:underline cursor-pointer"
                            >
                              {prospect.name}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {prospect.phone || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(prospect.status)}`}>
                              {prospect.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getAutomationStatusBadge(prospect.automation_status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatAction(prospect.last_action_type, prospect.last_action_timestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatAction(prospect.next_action_type, prospect.next_action_scheduled)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(prospect.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleProspectClick(prospect.id)}
                                className="text-indigo-600 hover:text-indigo-900"
                              >
                                View
                              </button>
                              <div className="relative">
                                <button
                                  onClick={() => setOpenDropdown(openDropdown === prospect.id ? null : prospect.id)}
                                  className="text-gray-400 hover:text-gray-600 p-1"
                                  disabled={isPerformingAction}
                                  aria-label="Actions menu"
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                  </svg>
                                </button>
                                {openDropdown === prospect.id && (
                                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                                    <div className="py-1">
                                      {prospect.automation_status !== 'paused' && (
                                        <button
                                          onClick={() => handleProspectAction(prospect.id, 'pause')}
                                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                          disabled={isPerformingAction}
                                        >
                                          Pause Automation
                                        </button>
                                      )}
                                      {prospect.automation_status === 'paused' && (
                                        <button
                                          onClick={() => handleProspectAction(prospect.id, 'resume')}
                                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                          disabled={isPerformingAction}
                                        >
                                          Resume Automation
                                        </button>
                                      )}
                                      {prospect.automation_status !== 'review' && (
                                        <button
                                          onClick={() => handleProspectAction(prospect.id, 'review-bin')}
                                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                          disabled={isPerformingAction}
                                        >
                                          Move to Review Bin
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!isLoading && !error && sortedProspects.length > 0 && (
                <div className="mt-6 flex justify-between items-center">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{sortedProspects.length}</span> prospect{sortedProspects.length !== 1 ? 's' : ''}
                    {firstAgent && (
                      <span> for agent <span className="font-medium">{firstAgent.name}</span></span>
                    )}
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

export default AdminDashboardPage;
