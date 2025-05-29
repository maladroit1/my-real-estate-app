import React, { useState } from 'react';
import { Brain, Wifi } from 'lucide-react';
import AIInsights from './AIInsights';
import { ApiKeyManager } from '../services/ApiKeyManager';
import { ApiKeyModal } from './ApiKeyModal';

interface AIInsightsIntegrationProps {
  scenario: any; // Replace with proper Scenario type
  className?: string;
}

export const AIInsightsIntegration: React.FC<AIInsightsIntegrationProps> = ({ 
  scenario, 
  className = '' 
}) => {
  const [showInsights, setShowInsights] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [testingApi, setTestingApi] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleShowInsights = () => {
    // Check if API key exists before showing insights
    if (!ApiKeyManager.hasApiKey()) {
      setShowApiKeyModal(true);
    } else {
      setShowInsights(true);
    }
  };
  
  const handleApiKeySubmit = (apiKey: string) => {
    setShowApiKeyModal(false);
    setShowInsights(true);
  };

  const testApiConnection = async () => {
    setTestingApi(true);
    setTestResult(null);
    
    try {
      const apiKey = ApiKeyManager.getApiKey();
      
      const response = await fetch('/api/claude-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey || ''
        },
        body: JSON.stringify({
          action: 'analyzeDeal',
          data: { 
            prompt: 'Test prompt: Please respond with "API is working!"'
          }
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setTestResult({ success: true, message: 'API connection successful!' });
        // Clear success message after 3 seconds
        setTimeout(() => setTestResult(null), 3000);
      } else {
        setTestResult({ success: false, message: data.error || 'Connection failed' });
        // Clear error message after 5 seconds
        setTimeout(() => setTestResult(null), 5000);
      }
    } catch (error) {
      setTestResult({ success: false, message: `Error: ${error}` });
      // Clear error message after 5 seconds
      setTimeout(() => setTestResult(null), 5000);
    } finally {
      setTestingApi(false);
    }
  };

  // If no scenario, show disabled button
  if (!scenario) {
    return (
      <button
        type="button"
        disabled
        className={`${className} flex items-center gap-2 px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed`}
      >
        <Brain className="w-5 h-5" />
        AI Insights
      </button>
    );
  }


  return (
    <>
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSubmit={handleApiKeySubmit}
      />
      
      <div className="relative inline-block">
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleShowInsights();
            }}
            type="button"
            className={`${className} flex items-center gap-2 px-4 py-2 bg-yellow-600 text-gray-900 rounded-l-lg hover:bg-yellow-700 transition-colors`}
          >
            <Brain className="w-5 h-5" />
            AI Insights
          </button>
          
          {/* Test Connection Button */}
          {ApiKeyManager.hasApiKey() && (
            <button
              onClick={testApiConnection}
              type="button"
              disabled={testingApi}
              className="px-3 py-2 bg-yellow-700 text-gray-900 rounded-r-lg hover:bg-yellow-800 transition-colors border-l border-yellow-800 disabled:opacity-50"
              title="Test API Connection"
            >
              <Wifi className={`w-4 h-4 ${testingApi ? 'animate-pulse' : ''}`} />
            </button>
          )}
        </div>
        
        {/* Test Result Tooltip */}
        {testResult && (
          <div className={`absolute top-full mt-2 left-0 right-0 p-2 rounded-lg text-sm text-white ${
            testResult.success ? 'bg-green-600' : 'bg-red-600'
          } z-50 min-w-[200px]`}>
            {testResult.message}
          </div>
        )}
      </div>

      {showInsights && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <AIInsights
              scenario={scenario}
              onClose={() => setShowInsights(false)}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default AIInsightsIntegration;