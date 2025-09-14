import React, { useState, useEffect } from 'react';
import { authService } from '../services/auth';
import { CreateInitiativeRequest } from '../types/initiative';
import { Lead } from '../types/lead';
import axios from 'axios';

const API_URL = 'https://lqs-uat-worker.charlesheflin.workers.dev/api';

interface Playbook {
  id: string;
  name: string;
  goal_description?: string;
}

interface InitiativeWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

const InitiativeWizard: React.FC<InitiativeWizardProps> = ({ onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CreateInitiativeRequest>({
    name: '',
    playbook_id: '',
    environmental_settings: {},
    prospect_ids: []
  });
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [prospects, setProspects] = useState<Lead[]>([]);
  const [selectedProspects, setSelectedProspects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [environmentalSettings, setEnvironmentalSettings] = useState('{}');

  useEffect(() => {
    fetchPlaybooks();
    fetchProspects();
  }, []);

  const fetchPlaybooks = async () => {
    try {
      const token = authService.getAuthToken();
      const response = await axios.get(`${API_URL}/playbooks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const playbooksData = response.data?.data || response.data || [];
      setPlaybooks(playbooksData);
    } catch (err) {
      console.error('Failed to fetch playbooks:', err);
    }
  };

  const fetchProspects = async () => {
    try {
      const token = authService.getAuthToken();
      const clientsResponse = await axios.get(`${API_URL}/clients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const clientsData = clientsResponse.data?.data || clientsResponse.data || [];
      
      if (clientsData.length > 0) {
        const leadsResponse = await axios.get(`${API_URL}/clients/${clientsData[0].id}/leads`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const leadsData = leadsResponse.data?.data || leadsResponse.data || [];
        setProspects(leadsData);
      }
    } catch (err) {
      console.error('Failed to fetch prospects:', err);
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = authService.getAuthToken();
      
      let parsedSettings = {};
      try {
        parsedSettings = JSON.parse(environmentalSettings);
      } catch (e) {
        throw new Error('Invalid JSON in environmental settings');
      }

      const initiativeData = {
        ...formData,
        environmental_settings: parsedSettings,
        prospect_ids: selectedProspects
      };

      const response = await axios.post(`${API_URL}/initiatives`, initiativeData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (selectedProspects.length > 0) {
        await axios.post(`${API_URL}/initiatives/${response.data.data.id}/prospects`, {
          prospect_ids: selectedProspects
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }

      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to create initiative');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleProspectSelection = (prospectId: string) => {
    setSelectedProspects(prev => 
      prev.includes(prospectId) 
        ? prev.filter(id => id !== prospectId)
        : [...prev, prospectId]
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">Initiative Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter initiative name"
                required
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Playbook Selection</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">Select Playbook *</label>
              <select
                value={formData.playbook_id}
                onChange={(e) => setFormData({ ...formData, playbook_id: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="">Choose a playbook...</option>
                {playbooks.map((playbook) => (
                  <option key={playbook.id} value={playbook.id}>
                    {playbook.name}
                  </option>
                ))}
              </select>
            </div>
            {formData.playbook_id && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">
                  {playbooks.find(p => p.id === formData.playbook_id)?.goal_description || 'No description available'}
                </p>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Prospect Assignment</h3>
            <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md">
              {prospects.map((prospect) => (
                <div key={prospect.id} className="flex items-center p-3 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedProspects.includes(prospect.id)}
                    onChange={() => toggleProspectSelection(prospect.id)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-900">{prospect.name}</p>
                    <p className="text-sm text-gray-500">{prospect.phone} • {prospect.email}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500">
              {selectedProspects.length} prospect(s) selected
            </p>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Environmental Settings</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">Settings (JSON)</label>
              <textarea
                value={environmentalSettings}
                onChange={(e) => setEnvironmentalSettings(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                rows={6}
                placeholder='{"key": "value"}'
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter environmental settings as valid JSON
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Create New Initiative</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-6">
            <div className="flex items-center">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    step <= currentStep ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {step}
                  </div>
                  {step < 4 && (
                    <div className={`w-12 h-1 ${
                      step < currentStep ? 'bg-indigo-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>Basic Info</span>
              <span>Playbook</span>
              <span>Prospects</span>
              <span>Settings</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="mb-6">
            {renderStep()}
          </div>

          <div className="flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && !formData.name) ||
                  (currentStep === 2 && !formData.playbook_id)
                }
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isLoading || !formData.name || !formData.playbook_id}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating...' : 'Create Initiative'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InitiativeWizard;
