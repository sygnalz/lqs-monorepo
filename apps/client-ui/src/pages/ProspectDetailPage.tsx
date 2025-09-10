import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProspectDetailPage: React.FC = () => {
  const { prospectId } = useParams<{ prospectId: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  const handleBackToAdmin = () => {
    navigate('/admin');
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
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Prospect Detail</h1>
                  <p className="text-sm text-gray-600 mt-2">
                    Prospect ID: <span className="font-mono">{prospectId}</span>
                  </p>
                </div>
                <button
                  onClick={handleBackToAdmin}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  ← Back to Admin Dashboard
                </button>
              </div>

              <div className="border-4 border-dashed border-gray-200 rounded-lg p-12 text-center">
                <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Prospect Detail Page (Placeholder)
                </h3>
                <p className="text-gray-500 mb-6">
                  This is a placeholder page for prospect details.<br/>
                  The full prospect detail implementation will be added in a future phase.
                </p>
                
                <div className="bg-gray-50 rounded-md p-4 max-w-md mx-auto">
                  <p className="text-sm text-gray-600 text-left">
                    <strong>Route:</strong> /prospect/{prospectId}<br/>
                    <strong>Prospect ID:</strong> {prospectId}<br/>
                    <strong>Status:</strong> Navigation working correctly ✅
                  </p>
                </div>

                <div className="mt-8">
                  <button
                    onClick={handleBackToAdmin}
                    className="px-6 py-3 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
                  >
                    Return to Admin Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProspectDetailPage;