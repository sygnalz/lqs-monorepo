import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/auth';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://lqs-uat-worker.charlesheflin.workers.dev/api';

interface Playbook {
  id: string;
  name: string;
  goal_description: string;
  ai_instructions_and_persona: string;
  constraints: any;
  created_at: string;
  updated_at: string;
}

const PlaybookDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [playbook, setPlaybook] = useState<Playbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    goal_description: '',
    ai_instructions_and_persona: '',
    constraints: '{}'
  });

  useEffect(() => {
    if (id) {
      fetchPlaybook();
    }
  }, [id]);

  const fetchPlaybook = async () => {
    try {
      const token = authService.getAuthToken();
      if (!token) {
        navigate('/signin');
        return;
      }

      const response = await axios.get(`${API_URL}/playbooks/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        const playbookData = response.data.data;
        setPlaybook(playbookData);
        setFormData({
          name: playbookData.name,
          goal_description: playbookData.goal_description || '',
          ai_instructions_and_persona: playbookData.ai_instructions_and_persona || '',
          constraints: JSON.stringify(playbookData.constraints || {}, null, 2)
        });
        setError('');
      } else {
        setError(response.data.error || 'Failed to fetch playbook');
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        authService.clearAuthToken();
        navigate('/signin');
      } else if (error.response?.status === 404) {
        setError('Playbook not found');
      } else {
        setError('Failed to fetch playbook');
      }
    } finally {
      setLoading(false);
    }
  };

  const validateConstraints = (constraintsStr: string): boolean => {
    if (!constraintsStr.trim()) return true;
    try {
      JSON.parse(constraintsStr);
      return true;
    } catch {
      return false;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Playbook name is required');
      return;
    }

    if (!validateConstraints(formData.constraints)) {
      setError('Invalid JSON format in constraints field');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const token = authService.getAuthToken();
      if (!token) {
        navigate('/signin');
        return;
      }

      let parsedConstraints = {};
      if (formData.constraints.trim()) {
        parsedConstraints = JSON.parse(formData.constraints);
      }

      const requestData = {
        name: formData.name.trim(),
        goal_description: formData.goal_description.trim() || null,
        ai_instructions_and_persona: formData.ai_instructions_and_persona.trim() || null,
        constraints: parsedConstraints
      };

      const response = await axios.patch(`${API_URL}/playbooks/${id}`, requestData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setIsEditing(false);
        fetchPlaybook();
      } else {
        setError(response.data.error || 'Failed to update playbook');
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        authService.clearAuthToken();
        navigate('/signin');
      } else {
        setError(error.response?.data?.error || 'Failed to update playbook');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this playbook? This action cannot be undone.')) {
      return;
    }

    try {
      const token = authService.getAuthToken();
      if (!token) {
        navigate('/signin');
        return;
      }

      const response = await axios.delete(`${API_URL}/playbooks/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        navigate('/playbooks');
      } else {
        setError(response.data.error || 'Failed to delete playbook');
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        authService.clearAuthToken();
        navigate('/signin');
      } else {
        setError(error.response?.data?.error || 'Failed to delete playbook');
      }
    }
  };

  const handleCancel = () => {
    if (playbook) {
      setFormData({
        name: playbook.name,
        goal_description: playbook.goal_description || '',
        ai_instructions_and_persona: playbook.ai_instructions_and_persona || '',
        constraints: JSON.stringify(playbook.constraints || {}, null, 2)
      });
    }
    setIsEditing(false);
    setError('');
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

  if (loading) {
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
                  onClick={() => {
                    logout();
                    navigate('/signin');
                  }}
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
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="ml-3 text-gray-600">Loading playbook...</p>
            </div>
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
                onClick={() => {
                  logout();
                  navigate('/signin');
                }}
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
            <div className="mb-6">
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-4">
                  <li>
                    <div>
                      <button
                        onClick={() => navigate('/playbooks')}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        Playbooks
                      </button>
                    </div>
                  </li>
                  <li>
                    <div className="flex items-center">
                      <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="ml-4 text-sm font-medium text-gray-500">
                        {playbook?.name || 'Playbook Detail'}
                      </span>
                    </div>
                  </li>
                </ol>
              </nav>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {playbook && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">{playbook.name}</h1>
                      <p className="mt-1 text-sm text-gray-500">
                        Created: {formatDate(playbook.created_at)} | 
                        Last updated: {formatDate(playbook.updated_at)}
                      </p>
                    </div>
                    <div className="flex space-x-3">
                      {!isEditing ? (
                        <>
                          <button
                            onClick={() => setIsEditing(true)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={handleDelete}
                            className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={handleCancel}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSave}
                            disabled={saving || !validateConstraints(formData.constraints)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {saving ? 'Saving...' : 'Save Changes'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Playbook Name
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      ) : (
                        <p className="text-gray-900">{playbook.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Goal Description
                      </label>
                      {isEditing ? (
                        <textarea
                          name="goal_description"
                          value={formData.goal_description}
                          onChange={handleInputChange}
                          rows={4}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      ) : (
                        <p className="text-gray-900 whitespace-pre-wrap">
                          {playbook.goal_description || 'No goal description provided'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        AI Instructions and Persona
                      </label>
                      {isEditing ? (
                        <textarea
                          name="ai_instructions_and_persona"
                          value={formData.ai_instructions_and_persona}
                          onChange={handleInputChange}
                          rows={6}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      ) : (
                        <p className="text-gray-900 whitespace-pre-wrap">
                          {playbook.ai_instructions_and_persona || 'No AI instructions provided'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Constraints (JSON)
                      </label>
                      {isEditing ? (
                        <div>
                          <textarea
                            name="constraints"
                            value={formData.constraints}
                            onChange={handleInputChange}
                            rows={10}
                            className={`block w-full rounded-md shadow-sm sm:text-sm font-mono ${
                              validateConstraints(formData.constraints)
                                ? 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                                : 'border-red-300 focus:ring-red-500 focus:border-red-500'
                            }`}
                          />
                          {!validateConstraints(formData.constraints) && (
                            <p className="mt-1 text-sm text-red-600">Invalid JSON format</p>
                          )}
                        </div>
                      ) : (
                        <pre className="text-gray-900 bg-gray-50 p-4 rounded-md overflow-x-auto text-sm font-mono">
                          {JSON.stringify(playbook.constraints || {}, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PlaybookDetail;
