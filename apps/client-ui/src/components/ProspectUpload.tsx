import React, { useState, useRef } from 'react';
import { authService } from '../services/auth';
import { FieldMapping, UploadProgress } from '../types/prospect';

const API_URL = import.meta.env.VITE_API_URL || 'https://lqs-uat-worker.charlesheflin.workers.dev/api';

interface ProspectUploadProps {
  onUploadComplete: () => void;
}

const ProspectUpload: React.FC<ProspectUploadProps> = ({ onUploadComplete }) => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'mapping' | 'processing'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const requiredFields = [
    { key: 'first_name', label: 'First Name', required: true },
    { key: 'last_name', label: 'Last Name', required: false },
    { key: 'email', label: 'Email', required: false },
    { key: 'phone_e164', label: 'Phone Number', required: true },
    { key: 'timezone', label: 'Timezone', required: true },
    { key: 'path_hint', label: 'Path Hint', required: true },
    { key: 'consent_status', label: 'Consent Status', required: true },
    { key: 'consent_source', label: 'Consent Source', required: true },
    { key: 'consent_timestamp_iso', label: 'Consent Timestamp', required: true },
    { key: 'lead_source', label: 'Lead Source', required: false },
    { key: 'address_street', label: 'Street Address', required: false },
    { key: 'address_city', label: 'City', required: false },
    { key: 'address_state', label: 'State', required: false },
    { key: 'address_zip', label: 'ZIP Code', required: false },
    { key: 'notes', label: 'Notes', required: false }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setCsvFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          setError('CSV file must contain at least a header row and one data row');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });

        setCsvHeaders(headers);
        setCsvData(data);
        setStep('mapping');

        const autoMapping: Record<string, string> = {};
        requiredFields.forEach(field => {
          const matchingHeader = headers.find(header => 
            header.toLowerCase().includes(field.key.toLowerCase()) ||
            field.key.toLowerCase().includes(header.toLowerCase())
          );
          if (matchingHeader) {
            autoMapping[field.key] = matchingHeader;
          }
        });
        setFieldMapping(autoMapping);

      } catch (err) {
        setError('Failed to parse CSV file. Please check the format.');
      }
    };

    reader.readAsText(file);
  };

  const handleFieldMappingChange = (systemField: string, csvField: string) => {
    setFieldMapping(prev => ({
      ...prev,
      [systemField]: csvField
    }));
  };

  const validateMapping = () => {
    const requiredMappings = requiredFields.filter(f => f.required);
    const missingMappings = requiredMappings.filter(field => !fieldMapping[field.key]);
    
    if (missingMappings.length > 0) {
      setError(`Please map the following required fields: ${missingMappings.map(f => f.label).join(', ')}`);
      return false;
    }

    return true;
  };

  const handleUpload = async () => {
    if (!validateMapping()) return;

    setIsUploading(true);
    setStep('processing');
    setError(null);
    
    setUploadProgress({
      total: csvData.length,
      processed: 0,
      successful: 0,
      failed: 0,
      errors: []
    });

    try {
      const token = authService.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}/prospects/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          csvData,
          fieldMapping
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      
      setUploadProgress({
        total: csvData.length,
        processed: result.data.processed,
        successful: result.data.successful,
        failed: result.data.failed,
        errors: result.data.errors || []
      });

      if (result.data.successful > 0) {
        setTimeout(() => {
          onUploadComplete();
          resetUpload();
        }, 2000);
      }

    } catch (err: any) {
      setError(err.message || 'Upload failed');
      setUploadProgress(prev => prev ? {
        ...prev,
        errors: [...prev.errors, err.message]
      } : null);
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setCsvFile(null);
    setCsvData([]);
    setCsvHeaders([]);
    setFieldMapping({});
    setUploadProgress(null);
    setError(null);
    setStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderUploadStep = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Prospects CSV</h2>
      
      <div 
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <p className="text-sm text-gray-600 mb-2">
          {csvFile ? csvFile.name : 'Click to upload CSV file or drag and drop'}
        </p>
        <p className="text-xs text-gray-500">CSV files only</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="hidden"
      />

      {error && (
        <div className="mt-4 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {csvFile && csvData.length > 0 && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
          <p className="text-sm text-green-700">
            Successfully loaded {csvData.length} rows from {csvFile.name}
          </p>
          <button
            onClick={() => setStep('mapping')}
            className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            Continue to Field Mapping
          </button>
        </div>
      )}
    </div>
  );

  const renderMappingStep = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Map CSV Fields</h2>
        <button
          onClick={() => setStep('upload')}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          ← Back to Upload
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-6">
        Map your CSV columns to the prospect fields. Required fields are marked with an asterisk (*).
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-3">CSV Fields</h3>
          <div className="space-y-2">
            {csvHeaders.map(header => (
              <div key={header} className="text-sm text-gray-700 p-2 bg-white rounded border">
                {header}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-3">System Fields</h3>
          <div className="space-y-3">
            {requiredFields.map(field => (
              <div key={field.key} className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <select
                  value={fieldMapping[field.key] || ''}
                  onChange={(e) => handleFieldMappingChange(field.key, e.target.value)}
                  className={`border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 ${
                    field.required && !fieldMapping[field.key] 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-300'
                  }`}
                >
                  <option value="">Select CSV field...</option>
                  {csvHeaders.map(header => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="mt-6 flex justify-end space-x-3">
        <button
          onClick={resetUpload}
          className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isUploading ? 'Processing...' : 'Upload Prospects'}
        </button>
      </div>
    </div>
  );

  const renderProcessingStep = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Processing Upload</h2>
      
      {uploadProgress && (
        <div className="space-y-4">
          <div className="bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${uploadProgress.total > 0 ? (uploadProgress.processed / uploadProgress.total) * 100 : 0}%` 
              }}
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-2xl font-bold text-blue-600">{uploadProgress.processed}</div>
              <div className="text-sm text-blue-700">Processed</div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="text-2xl font-bold text-green-600">{uploadProgress.successful}</div>
              <div className="text-sm text-green-700">Successful</div>
            </div>
            <div className="bg-red-50 p-3 rounded">
              <div className="text-2xl font-bold text-red-600">{uploadProgress.failed}</div>
              <div className="text-sm text-red-700">Failed</div>
            </div>
          </div>

          {uploadProgress.errors.length > 0 && (
            <div className="bg-red-50 border border-red-300 rounded p-4">
              <h4 className="text-sm font-medium text-red-800 mb-2">Errors:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                {uploadProgress.errors.slice(0, 10).map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
                {uploadProgress.errors.length > 10 && (
                  <li>• ... and {uploadProgress.errors.length - 10} more errors</li>
                )}
              </ul>
            </div>
          )}

          {!isUploading && uploadProgress.successful > 0 && (
            <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded">
              Upload completed successfully! Redirecting to prospects list...
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
          {error}
          <button
            onClick={() => setStep('mapping')}
            className="ml-4 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      {step === 'upload' && renderUploadStep()}
      {step === 'mapping' && renderMappingStep()}
      {step === 'processing' && renderProcessingStep()}
    </div>
  );
};

export default ProspectUpload;
