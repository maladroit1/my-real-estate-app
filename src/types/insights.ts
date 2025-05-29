export interface DealInsights {
  assessment: {
    rating: 'excellent' | 'good' | 'fair' | 'poor';
    summary: string;
    keyPoints: string[];
  };
  sentiment: 'positive' | 'neutral' | 'negative';
  risks: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    mitigations: string[];
  };
  optimizations: {
    immediate: string[];
    longTerm: string[];
    potentialImpact: string;
  };
  marketContext: {
    comparison: string;
    trends: string[];
    positioning: string;
  };
  metrics: {
    strengthScore: number; // 0-100
    riskScore: number; // 0-100
    potentialScore: number; // 0-100
  };
}

export interface AnalysisRequest {
  scenario: any; // Will be replaced with proper Scenario type
  additionalContext?: string;
  focusAreas?: ('returns' | 'risks' | 'market' | 'optimization')[];
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: Date;
  uploadedBy: string;
}