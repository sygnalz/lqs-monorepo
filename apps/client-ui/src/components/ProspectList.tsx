import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { Prospect } from '../types/prospect';

const API_URL = import.meta.env.VITE_API_URL || 'https://lqs-uat-worker.charlesheflin.workers.dev/api';

interface ProspectListProps {
  onProspectSelect?: (prospect: Prospect) => void;
  refreshTrigger?: number;
}

const ProspectList: React.FC<ProspectListProps> = ({ onProspectSelect, refreshTrigger }) => {
  const navigate = useNavigate();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProspects, setFilteredProspects] = useState<Prospect[]>([]);

  const fetchProspects = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = authService.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const searchParams = new URLSearchParams();
      if (searchTerm) {
        searchParams.append('search', searchTerm);
      }

      const response = await fetch(`${API_URL}/prospects?${searchParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please sign in again.');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch prospects');
      }

      const result = await response.json();
      const prospectsData = result.data || [];
      
      setProspects(prospectsData);
      setFilteredProspects(prospectsData);

    } catch (err: any) {
      console.error('Error fetching prospects:', err);
      setError(err.message || 'Failed to fetch prospects');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProspects();
  }, [refreshTrigger]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = prospects.filter(prospect =>
        prospect.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prospect.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prospect.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prospect.phone_e164?.includes(searchTerm)
      );
      setFilteredProspects(filtered);
    } else {
      setFilteredProspects(prospects);
    }
  }, [searchTerm, prospects]);

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

  const getConsentStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border";
    
    switch (status) {
      case 'granted':
        return `${baseClasses} bg-green-100 text-green-800 border-green-200`;
      case 'denied':
        return `${baseClasses} bg-red-100 text-red-800 border-red-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 border-gray-200`;
    }
  };

  const handleProspectClick = (prospect: Prospect) => {
    if (onProspectSelect) {
      onProspectSelect(prospect);
    } else {
      navigate(`/prospects/${prospect.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">Loading prospects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline"> {error}</span>
        <button 
          onClick={fetchProspects}
          className="ml-4 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Prospects</h2>
          <button
            onClick={fetchProspects}
            className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search prospects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="text-sm text-gray-500">
            {filteredProspects.length} of {prospects.length} prospects
          </div>
        </div>
      </div>

      {filteredProspects.length === 0 ? (
        <div className="text-center py-8">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {searchTerm ? 'No prospects found' : 'No prospects yet'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm 
              ? 'Try adjusting your search terms.' 
              : 'Upload a CSV file to get started with prospect management.'
            }
          </p>
        </div>
      ) : (
        <div className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Consent
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProspects.map((prospect) => (
                  <tr key={prospect.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {prospect.first_name} {prospect.last_name || ''}
                          </div>
                          {prospect.notes && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {prospect.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{prospect.phone_e164}</div>
                      {prospect.email && (
                        <div className="text-sm text-gray-500">{prospect.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getConsentStatusBadge(prospect.consent_status)}>
                        {prospect.consent_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {prospect.lead_source || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(prospect.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleProspectClick(prospect)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProspectList;
