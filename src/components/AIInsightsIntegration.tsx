import React, { useState } from 'react';
import { Brain } from 'lucide-react';
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
      
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleShowInsights();
        }}
        type="button"
        className={`${className} flex items-center gap-2 px-4 py-2 bg-yellow-600 text-gray-900 rounded-lg hover:bg-yellow-700 transition-colors`}
      >
        <Brain className="w-5 h-5" />
        AI Insights
      </button>

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