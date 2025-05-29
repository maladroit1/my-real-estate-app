import React, { useState, useCallback } from 'react';
import { Brain, TrendingUp, AlertTriangle, Lightbulb, BarChart3, Loader2, X } from 'lucide-react';
import { ClaudeInsightsService, DealInsights, AnalysisRequest } from '../services/ClaudeService';
import { ClaudeInsightsServiceSecure } from '../services/ClaudeServiceSecure';

interface AIInsightsProps {
  scenario: any; // Will be replaced with proper Scenario type
  apiKey?: string;
  onClose?: () => void;
}

interface InsightCardProps {
  title: string;
  content: string | string[];
  sentiment?: 'positive' | 'neutral' | 'negative' | 'warning' | 'suggestion';
  icon?: React.ReactNode;
}

const InsightCard: React.FC<InsightCardProps> = ({ title, content, sentiment = 'neutral', icon }) => {
  const sentimentStyles = {
    positive: 'bg-green-50 border-green-200 text-green-800',
    neutral: 'bg-gray-50 border-gray-200 text-gray-800',
    negative: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    suggestion: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  const renderContent = () => {
    if (Array.isArray(content)) {
      return (
        <ul className="list-disc list-inside space-y-1 text-sm">
          {content.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      );
    }
    return <p className="text-sm">{content}</p>;
  };

  return (
    <div className={`p-4 rounded-lg border ${sentimentStyles[sentiment]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h4 className="font-semibold">{title}</h4>
      </div>
      {renderContent()}
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: number; max?: number }> = ({ 
  label, 
  value, 
  max = 100 
}) => {
  const percentage = (value / max) * 100;
  const color = percentage >= 70 ? 'bg-green-500' : percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  
  return (
    <div className="bg-white p-3 rounded-lg border">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-600">{label}</span>
        <span className="text-lg font-semibold">{value}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`${color} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export const AIInsights: React.FC<AIInsightsProps> = ({ scenario, apiKey, onClose }) => {
  const [insights, setInsights] = useState<DealInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusAreas, setFocusAreas] = useState<('returns' | 'risks' | 'market' | 'optimization')[]>([
    'returns', 'risks', 'optimization'
  ]);

  const getInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use secure service if deployed (no apiKey), otherwise use direct service
      const isDeployed = window.location.hostname !== 'localhost';
      const claudeService = isDeployed || !apiKey
        ? new ClaudeInsightsServiceSecure()
        : new ClaudeInsightsService(apiKey);
        
      const request: AnalysisRequest = {
        scenario,
        focusAreas
      };
      
      const result = await claudeService.analyzeDeal(request);
      setInsights(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get AI insights');
    } finally {
      setLoading(false);
    }
  }, [scenario, apiKey, focusAreas]);

  const toggleFocusArea = (area: 'returns' | 'risks' | 'market' | 'optimization') => {
    setFocusAreas(prev => 
      prev.includes(area) 
        ? prev.filter(a => a !== area)
        : [...prev, area]
    );
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 relative">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      )}
      
      <div className="mb-6">
        <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
          <Brain className="w-6 h-6 text-purple-600" />
          AI-Powered Deal Analysis
        </h3>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {(['returns', 'risks', 'market', 'optimization'] as const).map(area => (
            <button
              key={area}
              onClick={() => toggleFocusArea(area)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                focusAreas.includes(area)
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {area.charAt(0).toUpperCase() + area.slice(1)}
            </button>
          ))}
        </div>
        
        <button
          onClick={getInsights}
          disabled={loading || focusAreas.length === 0}
          className="w-full sm:w-auto px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4" />
              Get AI Insights
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {insights && (
        <div className="space-y-6">
          {/* Assessment Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-lg">Deal Assessment</h4>
              <span className={`font-bold text-lg ${getRatingColor(insights.assessment.rating)}`}>
                {insights.assessment.rating.toUpperCase()}
              </span>
            </div>
            <p className="text-gray-700 mb-3">{insights.assessment.summary}</p>
            <div className="flex flex-wrap gap-2">
              {insights.assessment.keyPoints.map((point, index) => (
                <span key={index} className="px-2 py-1 bg-white rounded text-sm">
                  {point}
                </span>
              ))}
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <MetricCard label="Deal Strength" value={insights.metrics.strengthScore} />
            <MetricCard label="Risk Level" value={100 - insights.metrics.riskScore} />
            <MetricCard label="Potential" value={insights.metrics.potentialScore} />
          </div>

          {/* Insights Grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Risks */}
            <InsightCard
              title="Key Risks"
              content={insights.risks.factors}
              sentiment="warning"
              icon={<AlertTriangle className="w-5 h-5" />}
            />

            {/* Optimizations */}
            <InsightCard
              title="Optimization Opportunities"
              content={[...insights.optimizations.immediate, ...insights.optimizations.longTerm]}
              sentiment="suggestion"
              icon={<Lightbulb className="w-5 h-5" />}
            />

            {/* Market Context */}
            <InsightCard
              title="Market Analysis"
              content={insights.marketContext.comparison}
              sentiment="neutral"
              icon={<TrendingUp className="w-5 h-5" />}
            />

            {/* Risk Mitigations */}
            <InsightCard
              title="Risk Mitigations"
              content={insights.risks.mitigations}
              sentiment="positive"
              icon={<BarChart3 className="w-5 h-5" />}
            />
          </div>

          {/* Potential Impact */}
          {insights.optimizations.potentialImpact && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">Potential Impact</h4>
              <p className="text-blue-700">{insights.optimizations.potentialImpact}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIInsights;