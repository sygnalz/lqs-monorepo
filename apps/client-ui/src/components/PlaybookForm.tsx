import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://lqs-uat-worker.charlesheflin.workers.dev/api';

interface PlaybookFormProps {
  playbook?: {
    id: string;
    name: string;
    goal_description: string;
    ai_instructions_and_persona: string;
    constraints: any;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
  isEdit?: boolean;
}

const PlaybookForm: React.FC<PlaybookFormProps> = ({ playbook, onSuccess, onCancel, isEdit = false }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: playbook?.name || '',
    goal_description: playbook?.goal_description || '',
    ai_instructions_and_persona: playbook?.ai_instructions_and_persona || '',
    constraints: playbook?.constraints ? JSON.stringify(playbook.constraints, null, 2) : '{}'
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.name.trim()) {
      setError('Playbook name is required');
      setLoading(false);
      return;
    }

    if (!validateConstraints(formData.constraints)) {
      setError('Invalid JSON format in constraints field');
      setLoading(false);
      return;
    }

    try {
      const token = authService.getAuthToken();
      if (!token) {
        setError('Authentication required');
        setLoading(false);
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

      const url = isEdit ? `${API_URL}/playbooks/${playbook?.id}` : `${API_URL}/playbooks`;
      const method = isEdit ? 'PATCH' : 'POST';

      const response = await axios({
        method,
        url,
        data: requestData,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        if (onSuccess) {
          onSuccess();
        } else {
          navigate('/playbooks');
        }
      } else {
        setError(response.data.error || `Failed to ${isEdit ? 'update' : 'create'} playbook`);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        authService.clearAuthToken();
        navigate('/signin');
      } else {
        setError(error.response?.data?.error || `Failed to ${isEdit ? 'update' : 'create'} playbook`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/playbooks');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            {isEdit ? 'Edit Playbook' : 'Create New Playbook'}
          </h3>
          
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Playbook Name *
              </label>
              <input
                type="text"
                name="name"
                id="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Enter playbook name"
              />
            </div>

            <div>
              <label htmlFor="goal_description" className="block text-sm font-medium text-gray-700">
                Goal Description
              </label>
              <textarea
                name="goal_description"
                id="goal_description"
                rows={4}
                value={formData.goal_description}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Describe the goals and objectives of this playbook"
              />
            </div>

            <div>
              <label htmlFor="ai_instructions_and_persona" className="block text-sm font-medium text-gray-700">
                AI Instructions and Persona
              </label>
              <textarea
                name="ai_instructions_and_persona"
                id="ai_instructions_and_persona"
                rows={6}
                value={formData.ai_instructions_and_persona}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Define the AI persona and specific instructions for this playbook"
              />
            </div>

            <div>
              <label htmlFor="constraints" className="block text-sm font-medium text-gray-700">
                Constraints (JSON)
              </label>
              <textarea
                name="constraints"
                id="constraints"
                rows={8}
                value={formData.constraints}
                onChange={handleInputChange}
                className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm font-mono ${
                  validateConstraints(formData.constraints)
                    ? 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                    : 'border-red-300 focus:ring-red-500 focus:border-red-500'
                }`}
                placeholder='{"example": "constraint"}'
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter JSON constraints and rules for this playbook. Leave as {} if no constraints needed.
              </p>
              {!validateConstraints(formData.constraints) && (
                <p className="mt-1 text-sm text-red-600">Invalid JSON format</p>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !validateConstraints(formData.constraints)}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update Playbook' : 'Create Playbook')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PlaybookForm;
