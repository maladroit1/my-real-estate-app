import React from 'react';
import { Brain } from 'lucide-react';
import { ApiKeyManager } from './services/ApiKeyManager';

const DebugAIButton: React.FC = () => {
  React.useEffect(() => {
    // Check if we're in V2 and if there's a scenario
    const interval = setInterval(() => {
      // Check for Calculate button to ensure we're in the right view
      const calculateButton = document.querySelector('button:has(.lucide-calculator)');
      const generateReportButton = document.querySelector('button:has(.lucide-file-text)');
      
      console.log('Debug AI Button Check:');
      console.log('- Calculate button found:', !!calculateButton);
      console.log('- Generate Report button found:', !!generateReportButton);
      
      // Check for AI Insights button
      const aiButton = document.querySelector('button:has(.lucide-brain)');
      console.log('- AI Insights button found:', !!aiButton);
      
      // Check if scenario exists by looking at the Generate Report button state
      const reportButtonDisabled = generateReportButton?.hasAttribute('disabled');
      console.log('- Generate Report disabled (no scenario):', reportButtonDisabled);
      
      // Check current location
      console.log('- Current URL:', window.location.href);
      console.log('- API key in ApiKeyManager:', !!ApiKeyManager.getApiKey());
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border z-50">
      <h3 className="font-semibold mb-2">AI Button Debug</h3>
      <div className="text-sm space-y-1">
        <p>Check console for debug info</p>
        <p>AI Insights should appear next to Generate Report</p>
        <p>Only visible when scenario is selected</p>
      </div>
      <button 
        onClick={() => {
          ApiKeyManager.setApiKey('test-key');
          console.log('Test API key set via ApiKeyManager!');
          alert('Test API key has been set!');
        }}
        className="mt-2 px-3 py-1 bg-purple-600 text-white rounded text-sm"
      >
        Set Test API Key
      </button>
      <button 
        onClick={() => {
          const key = prompt('Enter your Claude API key (sk-ant-api...)');
          if (key) {
            ApiKeyManager.setApiKey(key);
            console.log('API key set successfully via ApiKeyManager!');
            alert('API key saved!');
          }
        }}
        className="mt-2 ml-2 px-3 py-1 bg-green-600 text-white rounded text-sm"
      >
        Enter Real Key
      </button>
    </div>
  );
};

export default DebugAIButton;