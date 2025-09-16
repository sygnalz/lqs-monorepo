import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { authService } from '../services/auth';
import { Prospect } from '../types/prospect';

const API_URL = import.meta.env.VITE_API_URL || 'https://lqs-uat-worker.charlesheflin.workers.dev/api';

interface ProspectDetailProps {
  prospectId?: string;
  onClose?: () => void;
  onUpdate?: () => void;
}

const ProspectDetail: React.FC<ProspectDetailProps> = ({ 
  prospectId: propProspectId, 
  onClose, 
  onUpdate 
}) => {
  const navigate = useNavigate();
  const { id: paramProspectId } = useParams();
  const prospectId = propProspectId || paramProspectId;

  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Prospect>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const fetchProspect = async () => {
    if (!prospectId) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = authService.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}/prospects/${prospectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Prospect not found');
        }
        if (response.status === 401) {
          throw new Error('Authentication failed. Please sign in again.');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch prospect');
      }

      const result = await response.json();
      setProspect(result.data);
      setFormData(result.data);

    } catch (err: any) {
      console.error('Error fetching prospect:', err);
      setError(err.message || 'Failed to fetch prospect');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProspect();
  }, [prospectId]);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.first_name?.trim()) {
      errors.first_name = 'First name is required';
    }

    if (!formData.phone_e164?.trim()) {
      errors.phone_e164 = 'Phone number is required';
    }

    if (!formData.timezone?.trim()) {
      errors.timezone = 'Timezone is required';
    }

    if (!formData.path_hint?.trim()) {
      errors.path_hint = 'Path hint is required';
    }

    if (!formData.consent_status) {
      errors.consent_status = 'Consent status is required';
    }

    if (!formData.consent_source?.trim()) {
      errors.consent_source = 'Consent source is required';
    }

    if (!formData.consent_timestamp_iso?.trim()) {
      errors.consent_timestamp_iso = 'Consent timestamp is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    setError(null);

    try {
      const token = authService.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}/prospects/${prospectId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update prospect');
      }

      const result = await response.json();
      setProspect(result.data);
      setIsEditing(false);
      
      if (onUpdate) {
        onUpdate();
      }

    } catch (err: any) {
      console.error('Error updating prospect:', err);
      setError(err.message || 'Failed to update prospect');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this prospect? This action cannot be undone.')) {
      return;
    }

    try {
      const token = authService.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}/prospects/${prospectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete prospect');
      }

      if (onClose) {
        onClose();
      } else {
        navigate('/prospects');
      }

      if (onUpdate) {
        onUpdate();
      }

    } catch (err: any) {
      console.error('Error deleting prospect:', err);
      setError(err.message || 'Failed to delete prospect');
    }
  };

  const handleInputChange = (field: keyof Prospect, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">Loading prospect...</p>
      </div>
    );
  }

  if (error && !prospect) {
    return (
      <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline"> {error}</span>
        <div className="mt-2">
          <button 
            onClick={fetchProspect}
            className="mr-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Retry
          </button>
          {onClose && (
            <button 
              onClick={onClose}
              className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
            >
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Prospect not found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {prospect.first_name} {prospect.last_name || ''}
        </h2>
        <div className="flex space-x-2">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFormData(prospect);
                  setValidationErrors({});
                  setError(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
            </>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
          
          <div>
            <label className="text-sm font-medium text-gray-700">
              First Name <span className="text-red-500">*</span>
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.first_name || ''}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                className={`mt-1 block w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.first_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{prospect.first_name}</p>
            )}
            {validationErrors.first_name && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.first_name}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Last Name</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.last_name || ''}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{prospect.last_name || 'N/A'}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            {isEditing ? (
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{prospect.email || 'N/A'}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Phone Number <span className="text-red-500">*</span>
            </label>
            {isEditing ? (
              <input
                type="tel"
                value={formData.phone_e164 || ''}
                onChange={(e) => handleInputChange('phone_e164', e.target.value)}
                className={`mt-1 block w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.phone_e164 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{prospect.phone_e164}</p>
            )}
            {validationErrors.phone_e164 && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.phone_e164}</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Consent & Settings</h3>
          
          <div>
            <label className="text-sm font-medium text-gray-700">
              Consent Status <span className="text-red-500">*</span>
            </label>
            {isEditing ? (
              <select
                value={formData.consent_status || ''}
                onChange={(e) => handleInputChange('consent_status', e.target.value)}
                className={`mt-1 block w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.consent_status ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="">Select status...</option>
                <option value="granted">Granted</option>
                <option value="denied">Denied</option>
              </select>
            ) : (
              <p className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  prospect.consent_status === 'granted' 
                    ? 'bg-green-100 text-green-800 border-green-200'
                    : 'bg-red-100 text-red-800 border-red-200'
                }`}>
                  {prospect.consent_status}
                </span>
              </p>
            )}
            {validationErrors.consent_status && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.consent_status}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Consent Source <span className="text-red-500">*</span>
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.consent_source || ''}
                onChange={(e) => handleInputChange('consent_source', e.target.value)}
                className={`mt-1 block w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.consent_source ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{prospect.consent_source}</p>
            )}
            {validationErrors.consent_source && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.consent_source}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Timezone <span className="text-red-500">*</span>
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.timezone || ''}
                onChange={(e) => handleInputChange('timezone', e.target.value)}
                placeholder="e.g., America/New_York"
                className={`mt-1 block w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 ${
                  validationErrors.timezone ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{prospect.timezone}</p>
            )}
            {validationErrors.timezone && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.timezone}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Lead Source</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.lead_source || ''}
                onChange={(e) => handleInputChange('lead_source', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{prospect.lead_source || 'N/A'}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-700">Notes</label>
            {isEditing ? (
              <textarea
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{prospect.notes || 'N/A'}</p>
            )}
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Created</label>
              <p className="mt-1 text-sm text-gray-900">{formatDate(prospect.created_at)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Last Updated</label>
              <p className="mt-1 text-sm text-gray-900">{formatDate(prospect.updated_at)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProspectDetail;
