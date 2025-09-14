import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth';
import { Initiative } from '../types/initiative';
import InitiativeList from '../components/InitiativeList';
import InitiativeWizard from '../components/InitiativeWizard';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://lqs-uat-worker.charlesheflin.workers.dev/api';

const InitiativesPage: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState<boolean>(false);

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  const fetchInitiatives = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = authService.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found. Please sign in again.');
      }

      const response = await axios.get(`${API_URL}/initiatives`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      let initiativesArray: Initiative[] = [];
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        initiativesArray = response.data.data;
      } else if (response.data && Array.isArray(response.data)) {
        initiativesArray = response.data;
      }

      setInitiatives(initiativesArray);
    } catch (err: any) {
      let errorMessage = 'Failed to fetch initiatives. Please try again.';
      if (err?.response?.status === 401) {
        errorMessage = 'Authentication failed. Please sign in again.';
        logout();
        navigate('/signin');
        return;
      } else if (err?.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err?.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitiatives();
  }, [logout, navigate]);

  const handleInitiativeCreated = () => {
    setShowWizard(false);
    fetchInitiatives();
  };

  const handleStatusUpdate = async (initiativeId: string, newStatus: string) => {
    try {
      const token = authService.getAuthToken();
      if (!token) throw new Error('No authentication token found');

      await axios.patch(`${API_URL}/initiatives/${initiativeId}`, 
        { status: newStatus },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      fetchInitiatives();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to update initiative status');
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
                  className="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 text-sm font-medium"
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
                  className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Initiatives
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                Refresh
              </button>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
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
                <h1 className="text-3xl font-bold text-gray-900">Initiative Management</h1>
                <button 
                  onClick={() => setShowWizard(true)}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Create Initiative
                </button>
              </div>

              {showWizard && (
                <InitiativeWizard
                  onClose={() => setShowWizard(false)}
                  onSuccess={handleInitiativeCreated}
                />
              )}

              <InitiativeList
                initiatives={initiatives}
                isLoading={isLoading}
                error={error}
                onStatusUpdate={handleStatusUpdate}
                onRefresh={fetchInitiatives}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default InitiativesPage;
