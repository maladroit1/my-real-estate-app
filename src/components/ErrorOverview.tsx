import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle, AlertTriangle, XCircle, Lightbulb,
  ChevronDown, ChevronUp, AlertCircle, RefreshCw
} from 'lucide-react';
import { AIErrorDetector } from '../services/ErrorDetectionService';
import {
  ErrorDetection,
  ValidationError,
  ValidationWarning,
  Suggestion
} from '../types/errorDetection';
import { ApiKeyManager } from '../services/ApiKeyManager';
import { ApiKeyModal } from './ApiKeyModal';

interface ErrorOverviewProps {
  scenario: any;
  apiKey?: string;
  onFieldFocus?: (field: string) => void;
  onSuggestionApply?: (field: string, value: any) => void;
  className?: string;
}

interface ErrorItemProps {
  error: ValidationError;
  onFieldClick?: (field: string) => void;
}

interface WarningItemProps {
  warning: ValidationWarning;
  onFieldClick?: (field: string) => void;
}

interface SuggestionItemProps {
  suggestion: Suggestion;
  onApply?: (field: string, value: any) => void;
}

const ErrorItem: React.FC<ErrorItemProps> = ({ error, onFieldClick }) => {
  const severityColors = {
    critical: 'bg-red-100 border-red-300 text-red-800',
    high: 'bg-red-50 border-red-200 text-red-700',
    medium: 'bg-orange-50 border-orange-200 text-orange-700'
  };

  return (
    <div 
      className={`p-3 rounded-lg border ${severityColors[error.severity]} cursor-pointer hover:opacity-90`}
      onClick={() => onFieldClick?.(error.field)}
    >
      <div className="flex items-start gap-2">
        <XCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="font-medium">{error.field}</div>
          <div className="text-sm mt-1">{error.message}</div>
          {error.expectedValue !== undefined && (
            <div className="text-xs mt-1 opacity-75">
              Expected: {JSON.stringify(error.expectedValue)} | 
              Actual: {JSON.stringify(error.actualValue)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const WarningItem: React.FC<WarningItemProps> = ({ warning, onFieldClick }) => {
  const severityColors = {
    high: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    medium: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    low: 'bg-gray-50 border-gray-200 text-gray-700'
  };

  return (
    <div 
      className={`p-3 rounded-lg border ${severityColors[warning.severity]} cursor-pointer hover:opacity-90`}
      onClick={() => onFieldClick?.(warning.field)}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="font-medium">{warning.field}</div>
          <div className="text-sm mt-1">{warning.message}</div>
          {warning.context && (
            <div className="text-xs mt-1 opacity-75">{warning.context}</div>
          )}
        </div>
      </div>
    </div>
  );
};

const SuggestionItem: React.FC<SuggestionItemProps> = ({ suggestion, onApply }) => {
  return (
    <div className="p-3 rounded-lg border bg-blue-50 border-blue-200 text-blue-800">
      <div className="flex items-start gap-2">
        <Lightbulb className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="font-medium">{suggestion.field}</div>
          <div className="text-sm mt-1">{suggestion.message}</div>
          {suggestion.reasoning && (
            <div className="text-xs mt-1 opacity-75">{suggestion.reasoning}</div>
          )}
          {suggestion.suggestedValue !== undefined && (
            <div className="mt-2">
              <button
                onClick={() => onApply?.(suggestion.field, suggestion.suggestedValue)}
                className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Apply: {JSON.stringify(suggestion.suggestedValue)}
              </button>
            </div>
          )}
        </div>
        {suggestion.confidence > 0 && (
          <div className="text-xs opacity-75">
            {Math.round(suggestion.confidence * 100)}% confident
          </div>
        )}
      </div>
    </div>
  );
};

export const ErrorOverview: React.FC<ErrorOverviewProps> = ({
  scenario,
  apiKey,
  onFieldFocus,
  onSuggestionApply,
  className = ''
}) => {
  const [errors, setErrors] = useState<ErrorDetection | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [lastValidation, setLastValidation] = useState<Date | null>(null);
  const [autoValidate, setAutoValidate] = useState(true);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const validateScenario = useCallback(async () => {
    if (!scenario) return;
    
    // Check for API key
    const currentApiKey = apiKey || ApiKeyManager.getApiKey();
    if (!currentApiKey) {
      setShowApiKeyModal(true);
      return;
    }
    
    setLoading(true);
    try {
      const detector = new AIErrorDetector(currentApiKey);
      const result = await detector.validateScenario(scenario);
      setErrors(result);
      setLastValidation(new Date());
    } catch (error) {
      console.error('Validation error:', error);
      // If error is about API key, show modal
      if (error instanceof Error && error.message.includes('API key')) {
        setShowApiKeyModal(true);
      }
    } finally {
      setLoading(false);
    }
  }, [scenario, apiKey]);
  
  const handleApiKeySubmit = (newApiKey: string) => {
    setShowApiKeyModal(false);
    // Retry validation with new API key
    validateScenario();
  };

  // Auto-validate on scenario changes
  useEffect(() => {
    if (autoValidate && scenario) {
      const timer = setTimeout(() => {
        validateScenario();
      }, 1000); // Debounce for 1 second
      
      return () => clearTimeout(timer);
    }
  }, [scenario?.id, autoValidate]); // eslint-disable-line react-hooks/exhaustive-deps

  const getSummaryIcon = () => {
    if (!errors) return <AlertCircle className="w-5 h-5 text-gray-400" />;
    if (errors.errors.length > 0) return <XCircle className="w-5 h-5 text-red-600" />;
    if (errors.warnings.length > 0) return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    return <CheckCircle className="w-5 h-5 text-green-600" />;
  };

  const getSummaryText = () => {
    if (loading) return 'Validating...';
    if (!errors) return 'Not validated';
    
    const errorCount = errors.errors.length;
    const warningCount = errors.warnings.length;
    
    if (errorCount === 0 && warningCount === 0) {
      return 'All checks passed';
    }
    
    const parts = [];
    if (errorCount > 0) {
      parts.push(`${errorCount} error${errorCount !== 1 ? 's' : ''}`);
    }
    if (warningCount > 0) {
      parts.push(`${warningCount} warning${warningCount !== 1 ? 's' : ''}`);
    }
    
    return parts.join(', ');
  };

  const getSummaryColor = () => {
    if (!errors || loading) return 'text-gray-600';
    if (errors.errors.length > 0) return 'text-red-600';
    if (errors.warnings.length > 0) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <>
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSubmit={handleApiKeySubmit}
      />
      
      <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {getSummaryIcon()}
          <div>
            <h3 className="font-semibold">Validation Status</h3>
            <p className={`text-sm ${getSummaryColor()}`}>
              {getSummaryText()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              validateScenario();
            }}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            title="Refresh validation"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {expanded ? <ChevronUp /> : <ChevronDown />}
        </div>
      </div>

      {/* Content */}
      {expanded && errors && (
        <div className="border-t p-4 space-y-4">
          {/* Auto-validate toggle */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoValidate}
                onChange={(e) => setAutoValidate(e.target.checked)}
                className="rounded"
              />
              <span>Auto-validate on changes</span>
            </label>
            {lastValidation && (
              <span className="text-gray-500">
                Last checked: {lastValidation.toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Errors */}
          {errors.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-red-600 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                Errors ({errors.errors.length})
              </h4>
              <div className="space-y-2">
                {errors.errors.map((error, index) => (
                  <ErrorItem 
                    key={`${error.field}-${index}`} 
                    error={error} 
                    onFieldClick={onFieldFocus}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {errors.warnings.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-yellow-600 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Warnings ({errors.warnings.length})
              </h4>
              <div className="space-y-2">
                {errors.warnings.map((warning, index) => (
                  <WarningItem 
                    key={`${warning.field}-${index}`} 
                    warning={warning} 
                    onFieldClick={onFieldFocus}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {errors.suggestions.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-600 flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Suggestions ({errors.suggestions.length})
              </h4>
              <div className="space-y-2">
                {errors.suggestions.map((suggestion, index) => (
                  <SuggestionItem 
                    key={`${suggestion.field}-${index}`} 
                    suggestion={suggestion} 
                    onApply={onSuggestionApply}
                  />
                ))}
              </div>
            </div>
          )}

          {/* No issues */}
          {errors.errors.length === 0 && 
           errors.warnings.length === 0 && 
           errors.suggestions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>No issues detected</p>
              <p className="text-sm mt-1">All validation checks passed successfully</p>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
};

export default ErrorOverview;