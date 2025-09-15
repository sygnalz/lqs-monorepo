import React, { useState } from 'react';
import { authService } from '../services/auth';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://lqs-uat-worker.charlesheflin.workers.dev/api';

interface PlaybookWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface PlaybookFormData {
  name: string;
  goal_description: string;
  ai_instructions_and_persona: string;
  constraints: string;
}

const PlaybookWizard: React.FC<PlaybookWizardProps> = ({ onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PlaybookFormData>({
    name: '',
    goal_description: '',
    ai_instructions_and_persona: '',
    constraints: '{}'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const steps = [
    { number: 1, title: 'Basic Info', description: 'Name and description' },
    { number: 2, title: 'Goal Configuration', description: 'Define objectives' },
    { number: 3, title: 'AI Instructions', description: 'Set AI persona' },
    { number: 4, title: 'Constraints', description: 'JSON configuration' }
  ];

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

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return formData.name.trim().length > 0;
      case 2:
        return true;
      case 3:
        return true;
      case 4:
        return validateConstraints(formData.constraints);
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceedToNextStep() && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!canProceedToNextStep()) {
      return;
    }

    setLoading(true);
    setError('');

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

      const response = await axios.post(`${API_URL}/playbooks`, requestData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        onSuccess();
      } else {
        setError(response.data.error || 'Failed to create playbook');
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        authService.clearAuthToken();
        setError('Authentication failed. Please sign in again.');
      } else {
        setError(error.response?.data?.error || 'Failed to create playbook');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">Playbook Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Enter playbook name"
                required
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Goal Configuration</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">Goal Description</label>
              <textarea
                name="goal_description"
                value={formData.goal_description}
                onChange={handleInputChange}
                rows={6}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Describe the goals and objectives of this playbook"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">AI Instructions and Persona</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">AI Instructions and Persona</label>
              <textarea
                name="ai_instructions_and_persona"
                value={formData.ai_instructions_and_persona}
                onChange={handleInputChange}
                rows={8}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Define the AI persona and specific instructions for this playbook"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Constraints Configuration</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">Constraints (JSON)</label>
              <textarea
                name="constraints"
                value={formData.constraints}
                onChange={handleInputChange}
                rows={10}
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
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Create New Playbook</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-8">
            <nav aria-label="Progress">
              <ol className="flex items-center">
                {steps.map((step, stepIdx) => (
                  <li key={step.number} className={`${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''} relative`}>
                    <div className="flex items-center">
                      <div className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
                        step.number < currentStep
                          ? 'bg-indigo-600'
                          : step.number === currentStep
                          ? 'border-2 border-indigo-600 bg-white'
                          : 'border-2 border-gray-300 bg-white'
                      }`}>
                        {step.number < currentStep ? (
                          <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <span className={`text-sm font-medium ${
                            step.number === currentStep ? 'text-indigo-600' : 'text-gray-500'
                          }`}>
                            {step.number}
                          </span>
                        )}
                      </div>
                      <div className="ml-4 min-w-0">
                        <p className={`text-sm font-medium ${
                          step.number <= currentStep ? 'text-indigo-600' : 'text-gray-500'
                        }`}>
                          {step.title}
                        </p>
                        <p className="text-sm text-gray-500">{step.description}</p>
                      </div>
                    </div>
                    {stepIdx !== steps.length - 1 && (
                      <div className="absolute top-4 left-4 -ml-px mt-0.5 h-full w-0.5 bg-gray-300" aria-hidden="true" />
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="mb-8">
            {renderStepContent()}
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canProceedToNextStep()}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !canProceedToNextStep()}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Playbook'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaybookWizard;
