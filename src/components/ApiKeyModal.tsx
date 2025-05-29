import React, { useState } from 'react';
import { ApiKeyManager } from '../services/ApiKeyManager';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (apiKey: string) => void;
  onDecline?: () => void;
  showDeclineOption?: boolean;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSubmit, onDecline, showDeclineOption = false }) => {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    if (!apiKey.startsWith('sk-ant-')) {
      setError('Invalid API key format. Claude API keys start with "sk-ant-"');
      return;
    }

    ApiKeyManager.setApiKey(apiKey);
    onSubmit(apiKey);
    setApiKey('');
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '8px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Enter Claude API Key</h2>
        
        <p style={{ marginBottom: '20px', color: '#666' }}>
          To use AI features, please provide your Claude API key. Your key will be stored locally in your browser.
        </p>
        
        <div style={{ 
          backgroundColor: '#e3f2fd', 
          padding: '15px', 
          borderRadius: '4px', 
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          <strong>How to get your API key:</strong>
          <ol style={{ marginTop: '10px', marginBottom: '5px', paddingLeft: '20px' }}>
            <li>Go to <a href="https://console.anthropic.com/api-keys" target="_blank" rel="noopener noreferrer">console.anthropic.com</a></li>
            <li>Sign in or create an account</li>
            <li>Navigate to API Keys section</li>
            <li>Create a new API key</li>
            <li>Copy the key (it starts with "sk-ant-")</li>
          </ol>
          <p style={{ marginBottom: 0, color: '#666' }}>
            <strong>Note:</strong> You'll need to add credits to use the API. AI features are optional and can be skipped.
          </p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '16px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              marginBottom: error ? '10px' : '20px'
            }}
            autoFocus
          />
          
          {error && (
            <p style={{ color: '#d32f2f', marginBottom: '20px', fontSize: '14px' }}>
              {error}
            </p>
          )}
          
          <div style={{ display: 'flex', justifyContent: showDeclineOption ? 'space-between' : 'flex-end', gap: '10px' }}>
            {showDeclineOption && (
              <button
                type="button"
                onClick={() => {
                  ApiKeyManager.setDeclined(true);
                  ApiKeyManager.setPrompted(true);
                  if (onDecline) onDecline();
                  onClose();
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '4px',
                  border: '1px solid #d32f2f',
                  backgroundColor: 'white',
                  color: '#d32f2f',
                  cursor: 'pointer'
                }}
              >
                Skip AI Features
              </button>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: '10px 20px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Save API Key
              </button>
            </div>
          </div>
        </form>
        
        <p style={{ marginTop: '20px', fontSize: '12px', color: '#999' }}>
          Get your API key from{' '}
          <a href="https://console.anthropic.com/api-keys" target="_blank" rel="noopener noreferrer">
            console.anthropic.com
          </a>
        </p>
      </div>
    </div>
  );
};