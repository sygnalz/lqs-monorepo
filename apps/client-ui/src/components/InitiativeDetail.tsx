import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { Initiative, InitiativeProspect } from '../types/initiative';
import axios from 'axios';

const API_URL = (import.meta as any).env.VITE_API_URL || 'https://lqs-uat-worker.charlesheflin.workers.dev/api';

const InitiativeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [initiative, setInitiative] = useState<Initiative | null>(null);
  const [prospects, setProspects] = useState<InitiativeProspect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchInitiativeDetail();
      fetchInitiativeProspects();
    }
  }, [id]);

  const fetchInitiativeDetail = async () => {
    try {
      const token = authService.getAuthToken();
      const response = await axios.get(`${API_URL}/initiatives/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setInitiative(response.data.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to fetch initiative details');
    }
  };

  const fetchInitiativeProspects = async () => {
    try {
      const token = authService.getAuthToken();
      const response = await axios.get(`${API_URL}/initiatives/${id}/prospects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setProspects(response.data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch prospects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'GOAL_ACHIEVED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'REVIEW_BIN':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'DNC':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'ERROR':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'PAUSED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'RUNNING':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusCounts = () => {
    const counts = {
      ACTIVE: 0,
      GOAL_ACHIEVED: 0,
      REVIEW_BIN: 0,
      DNC: 0,
      ERROR: 0,
      PAUSED: 0
    };
    
    prospects.forEach(prospect => {
      if (counts.hasOwnProperty(prospect.status)) {
        counts[prospect.status as keyof typeof counts]++;
      }
    });
    
    return counts;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="ml-3 text-gray-600">Loading initiative details...</p>
      </div>
    );
  }

  if (error || !initiative) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error || 'Initiative not found'}
        </div>
      </div>
    );
  }

  const statusCounts = getStatusCounts();

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/initiatives')}
                className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
              >
                ← Back to Initiatives
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{initiative.name}</h1>
                  <p className="text-sm text-gray-600 mt-2">
                    Playbook: {initiative.playbooks?.name || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {initiative.playbooks?.goal_description || 'No description available'}
                  </p>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeClass(initiative.status)}`}>
                  {initiative.status}
                </span>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Prospect Status Breakdown</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <div key={status} className="text-center">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeClass(status)}`}>
                      {status.replace('_', ' ')}
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{count}</p>
                  </div>
                ))}
              </div>
            </div>

            {initiative.environmental_settings && Object.keys(initiative.environmental_settings).length > 0 && (
              <div className="bg-white shadow rounded-lg p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Environmental Settings</h2>
                <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-x-auto">
                  {JSON.stringify(initiative.environmental_settings, null, 2)}
                </pre>
              </div>
            )}

            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Prospects ({prospects.length})
              </h2>
              
              {prospects.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No prospects assigned to this initiative.</p>
                </div>
              ) : (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Prospect Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact Info
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact Attempts
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Lead Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {prospects.map((prospect) => (
                        <tr key={prospect.prospect_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            <button
                              onClick={() => navigate(`/prospect/${prospect.prospect_id}`)}
                              className="text-indigo-600 hover:text-indigo-900 hover:underline"
                            >
                              {prospect.leads?.name || 'N/A'}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>
                              <div>{prospect.leads?.phone || 'N/A'}</div>
                              <div>{prospect.leads?.email || 'N/A'}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(prospect.status)}`}>
                              {prospect.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {prospect.contact_attempts}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {prospect.leads?.status || 'N/A'}
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
      </main>
    </div>
  );
};

export default InitiativeDetail;
