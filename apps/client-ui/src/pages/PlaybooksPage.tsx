import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth';
import PlaybookForm from '../components/PlaybookForm';
import PlaybookList from '../components/PlaybookList';
import PlaybookWizard from '../components/PlaybookWizard';
import axios from 'axios';

const API_URL = 'https://lqs-uat-worker.charlesheflin.workers.dev/api';

interface Playbook {
  id: string;
  name: string;
  goal_description: string;
  ai_instructions_and_persona: string;
  constraints: any;
  created_at: string;
  updated_at: string;
}

const PlaybooksPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [editingPlaybook, setEditingPlaybook] = useState<Playbook | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPlaybooks = async (search?: string) => {
    try {
      const token = authService.getAuthToken();
      if (!token) {
        navigate('/signin');
        return;
      }

      const params = new URLSearchParams();
      if (search) {
        params.append('search', search);
      }

      const response = await axios.get(`${API_URL}/playbooks?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setPlaybooks(response.data.data);
        setError('');
      } else {
        setError(response.data.error || 'Failed to fetch playbooks');
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        authService.clearAuthToken();
        navigate('/signin');
      } else {
        setError('Failed to fetch playbooks');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaybooks();
  }, []);

  const handleSearch = (search: string) => {
    setSearchTerm(search);
    fetchPlaybooks(search);
  };

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    setShowCreateWizard(false);
    fetchPlaybooks(searchTerm);
  };

  const handleEditSuccess = () => {
    setEditingPlaybook(null);
    fetchPlaybooks(searchTerm);
  };

  const handleEdit = (playbook: Playbook) => {
    setEditingPlaybook(playbook);
  };

  const handleDelete = async (playbookId: string) => {
    if (!window.confirm('Are you sure you want to delete this playbook? This action cannot be undone.')) {
      return;
    }

    try {
      const token = authService.getAuthToken();
      if (!token) {
        navigate('/signin');
        return;
      }

      const response = await axios.delete(`${API_URL}/playbooks/${playbookId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        fetchPlaybooks(searchTerm);
      } else {
        setError(response.data.error || 'Failed to delete playbook');
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        authService.clearAuthToken();
        navigate('/signin');
      } else {
        setError('Failed to delete playbook');
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchPlaybooks(searchTerm);
  };

  if (showCreateForm) {
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
                    className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
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

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <PlaybookForm
              onSuccess={handleCreateSuccess}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        </main>
      </div>
    );
  }

  if (editingPlaybook) {
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
                    className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
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

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <PlaybookForm
              playbook={editingPlaybook}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditingPlaybook(null)}
              isEdit={true}
            />
          </div>
        </main>
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
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 text-sm font-medium"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/playbooks')}
                  className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Playbooks
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
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

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Playbooks</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Manage AI decision-making strategies and personas for lead management
                </p>
              </div>
              <button
                onClick={() => setShowCreateWizard(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Create Playbook
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <PlaybookList
            playbooks={playbooks}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSearch={handleSearch}
          />
        </div>
      </main>

      {showCreateWizard && (
        <PlaybookWizard
          onClose={() => setShowCreateWizard(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
};

export default PlaybooksPage;
