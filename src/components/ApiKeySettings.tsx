import React, { useState, useEffect } from 'react';
import { Key, Save, Trash2, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, BarChart3 } from 'lucide-react';
import { ApiKeyService } from '../services/ApiKeyService';

export const ApiKeySettings: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [keyHint, setKeyHint] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingKey, setCheckingKey] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [usage, setUsage] = useState<any>(null);
  const [showUsage, setShowUsage] = useState(false);

  useEffect(() => {
    checkExistingKey();
  }, []);

  const checkExistingKey = async () => {
    try {
      setCheckingKey(true);
      const exists = await ApiKeyService.hasApiKey();
      setHasKey(exists);
      
      if (exists) {
        const hint = await ApiKeyService.getApiKeyHint();
        setKeyHint(hint);
      }
    } catch (err) {
      console.error('Error checking API key:', err);
    } finally {
      setCheckingKey(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    if (!apiKey.startsWith('sk-')) {
      setError('Invalid API key format. Claude API keys start with "sk-"');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await ApiKeyService.saveApiKey(apiKey);
      setSuccess('API key saved successfully!');
      setApiKey('');
      setHasKey(true);
      setKeyHint(apiKey.slice(-4));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save API key');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete your API key? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await ApiKeyService.deleteApiKey();
      setSuccess('API key deleted successfully');
      setHasKey(false);
      setKeyHint(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete API key');
    } finally {
      setLoading(false);
    }
  };

  const loadUsageStats = async () => {
    try {
      const stats = await ApiKeyService.getApiUsage(30);
      setUsage(stats);
      setShowUsage(true);
    } catch (err: any) {
      setError('Failed to load usage statistics');
    }
  };

  if (checkingKey) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">API Key Settings</h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage your Claude API key for AI-powered features
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 text-green-700 p-3 rounded-lg flex items-center gap-2">
          <CheckCircle size={20} />
          <span className="text-sm">{success}</span>
        </div>
      )}

      <div className="space-y-6">
        {hasKey ? (
          <>
            {/* Existing Key Display */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current API Key
              </label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Key className="text-gray-400" size={20} />
                <span className="font-mono text-sm">
                  ••••••••••••••••••••••••{keyHint}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Trash2 size={16} />
                Delete Key
              </button>

              <button
                onClick={loadUsageStats}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <BarChart3 size={16} />
                View Usage
              </button>
            </div>

            {/* Usage Statistics */}
            {showUsage && usage && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">Usage Statistics (Last 30 days)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Calls</p>
                    <p className="text-2xl font-bold text-gray-900">{usage.statistics.totalCalls}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Tokens</p>
                    <p className="text-2xl font-bold text-gray-900">{usage.statistics.totalTokens.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold text-green-600">{usage.statistics.successRate}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Failed Calls</p>
                    <p className="text-2xl font-bold text-red-600">{usage.statistics.failedCalls}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* New Key Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Claude API Key
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="sk-ant-..."
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Your API key is encrypted and stored securely. Get your key from{' '}
                <a href="https://console.anthropic.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Anthropic Console
                </a>
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={loading || !apiKey.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save API Key
                </>
              )}
            </button>
          </>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">How it works</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Your API key is encrypted before being stored in our database</li>
            <li>• The key is only decrypted server-side when making API calls</li>
            <li>• We never expose your full API key in the browser</li>
            <li>• All API calls are routed through our secure backend</li>
          </ul>
        </div>
      </div>
    </div>
  );
};