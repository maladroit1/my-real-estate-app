import React, { useState } from 'react';
import { ApiKeyManager } from '../services/ApiKeyManager';

export const TestAPIButton: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  
  const testAPI = async () => {
    setLoading(true);
    setResult('');
    
    try {
      const apiKey = ApiKeyManager.getApiKey();
      console.log('Testing API with key:', apiKey?.substring(0, 10) + '...');
      
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
      
      console.log('Test response status:', response.status);
      const data = await response.json();
      console.log('Test response data:', data);
      
      if (response.ok) {
        setResult(`Success! Response: ${JSON.stringify(data)}`);
      } else {
        setResult(`Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Test API error:', error);
      setResult(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <button
        onClick={testAPI}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? 'Testing...' : 'Test API Connection'}
      </button>
      {result && (
        <div className="mt-2 p-2 bg-white rounded text-sm">
          {result}
        </div>
      )}
    </div>
  );
};