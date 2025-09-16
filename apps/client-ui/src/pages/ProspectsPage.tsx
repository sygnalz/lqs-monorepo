import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProspectUpload from '../components/ProspectUpload';
import ProspectList from '../components/ProspectList';

const ProspectsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'list' | 'upload'>('list');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  const handleUploadComplete = () => {
    setActiveTab('list');
    setRefreshTrigger(prev => prev + 1);
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
                  className="text-gray-500 hover:text-gray-700 inline-flex items-center px-1 pt-1 text-sm font-medium"
                >
                  Initiatives
                </button>
                <button
                  onClick={() => navigate('/prospects')}
                  className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Prospects
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
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Prospect Management</h1>
              <p className="mt-1 text-sm text-gray-600">
                Upload and manage your prospect database with CSV import and field mapping.
              </p>
            </div>

            <div className="bg-white shadow rounded-lg">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex">
                  <button
                    onClick={() => setActiveTab('list')}
                    className={`py-2 px-4 border-b-2 font-medium text-sm ${
                      activeTab === 'list'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Prospect List
                  </button>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className={`py-2 px-4 border-b-2 font-medium text-sm ${
                      activeTab === 'upload'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Upload CSV
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'list' && (
                  <ProspectList refreshTrigger={refreshTrigger} />
                )}
                {activeTab === 'upload' && (
                  <ProspectUpload onUploadComplete={handleUploadComplete} />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProspectsPage;
