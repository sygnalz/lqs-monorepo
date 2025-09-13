import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Initiative } from '../types/initiative';

interface InitiativeListProps {
  initiatives: Initiative[];
  isLoading: boolean;
  error: string | null;
  onStatusUpdate: (initiativeId: string, newStatus: string) => void;
  onRefresh: () => void;
}

const InitiativeList: React.FC<InitiativeListProps> = ({
  initiatives,
  isLoading,
  error,
  onStatusUpdate,
  onRefresh
}) => {
  const navigate = useNavigate();

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'RUNNING':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

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

  const getQuickActions = (initiative: Initiative) => {
    const actions = [];
    
    if (initiative.status === 'DRAFT') {
      actions.push(
        <button
          key="start"
          onClick={() => onStatusUpdate(initiative.id, 'RUNNING')}
          className="text-green-600 hover:text-green-900 text-sm font-medium"
        >
          Start
        </button>
      );
    }
    
    if (initiative.status === 'RUNNING') {
      actions.push(
        <button
          key="pause"
          onClick={() => onStatusUpdate(initiative.id, 'PAUSED')}
          className="text-yellow-600 hover:text-yellow-900 text-sm font-medium"
        >
          Pause
        </button>
      );
      actions.push(
        <button
          key="complete"
          onClick={() => onStatusUpdate(initiative.id, 'COMPLETED')}
          className="text-blue-600 hover:text-blue-900 text-sm font-medium ml-2"
        >
          Complete
        </button>
      );
    }
    
    if (initiative.status === 'PAUSED') {
      actions.push(
        <button
          key="resume"
          onClick={() => onStatusUpdate(initiative.id, 'RUNNING')}
          className="text-green-600 hover:text-green-900 text-sm font-medium"
        >
          Resume
        </button>
      );
    }
    
    return actions;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <p className="ml-3 text-gray-600">Loading initiatives...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline"> {error}</span>
        <button 
          onClick={onRefresh}
          className="ml-4 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (initiatives.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No initiatives found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating your first initiative.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
      <table className="min-w-full divide-y divide-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Initiative Name
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Playbook
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Prospects
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {initiatives.map((initiative) => (
            <tr key={initiative.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                <button
                  onClick={() => navigate(`/initiatives/${initiative.id}`)}
                  className="text-indigo-600 hover:text-indigo-900 hover:underline cursor-pointer"
                >
                  {initiative.name}
                </button>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {initiative.playbooks?.name || 'N/A'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(initiative.status)}`}>
                  {initiative.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {initiative.initiative_prospects?.length || 0}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(initiative.created_at)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                {getQuickActions(initiative)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="mt-6 flex justify-between items-center">
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">{initiatives.length}</span> initiative{initiatives.length !== 1 ? 's' : ''}
        </div>
        <button
          onClick={onRefresh}
          className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>
    </div>
  );
};

export default InitiativeList;
