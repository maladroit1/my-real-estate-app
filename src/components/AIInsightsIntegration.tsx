import React, { useState } from 'react';
import { Brain } from 'lucide-react';
import AIInsights from './AIInsights';

interface AIInsightsIntegrationProps {
  scenario: any; // Replace with proper Scenario type
  className?: string;
}

export const AIInsightsIntegration: React.FC<AIInsightsIntegrationProps> = ({ 
  scenario, 
  className = '' 
}) => {
  const [showInsights, setShowInsights] = useState(false);
  const isDeployed = window.location.hostname !== 'localhost';
  
  const [apiKey, setApiKey] = useState(() => {
    // Only use localStorage API key for local development
    return isDeployed ? '' : (localStorage.getItem('claude_api_key') || '');
  });
  const [showApiKeyInput, setShowApiKeyInput] = useState(!isDeployed && !apiKey);

  // Check for API key updates without needing refresh (local only)
  React.useEffect(() => {
    if (isDeployed) return;
    
    const checkInterval = setInterval(() => {
      const savedKey = localStorage.getItem('claude_api_key');
      if (savedKey && savedKey !== apiKey) {
        setApiKey(savedKey);
        setShowApiKeyInput(false);
      }
    }, 1000);
    
    return () => clearInterval(checkInterval);
  }, [apiKey, isDeployed]);

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

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('claude_api_key', key);
    setShowApiKeyInput(false);
  };

  if (showApiKeyInput && !showInsights) {
    return (
      <div className={`${className} p-4 bg-purple-50 rounded-lg border border-purple-200`}>
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          Configure Claude AI
        </h4>
        <p className="text-sm text-gray-600 mb-3">
          Enter your Claude API key to enable AI-powered insights
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            placeholder="sk-ant-api..."
            className="flex-1 px-3 py-2 border rounded-lg"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value) {
                handleSaveApiKey(e.currentTarget.value);
              }
            }}
          />
          <button
            onClick={(e) => {
              const input = e.currentTarget.previousElementSibling as HTMLInputElement;
              if (input.value) {
                handleSaveApiKey(input.value);
              }
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('AI Insights clicked, scenario:', scenario);
          setShowInsights(true);
        }}
        type="button"
        className={`${className} flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors`}
      >
        <Brain className="w-5 h-5" />
        AI Insights
      </button>

      {showInsights && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <AIInsights
              scenario={scenario}
              apiKey={apiKey}
              onClose={() => setShowInsights(false)}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default AIInsightsIntegration;