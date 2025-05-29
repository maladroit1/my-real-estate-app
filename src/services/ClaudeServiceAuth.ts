import { DealInsights, AnalysisRequest } from './ClaudeService';
import { ApiKeyService } from './ApiKeyService';
import { supabase } from '../lib/supabase';

export class ClaudeServiceAuth {
  private apiEndpoint: string;
  
  constructor() {
    // Use relative URL - will work both locally and on Netlify
    this.apiEndpoint = '/.netlify/functions/claude-api';
  }
  
  async analyzeDeal(request: AnalysisRequest): Promise<DealInsights> {
    // Check if user has API key configured
    const hasKey = await ApiKeyService.hasApiKey();
    if (!hasKey) {
      throw new Error('API key required. Please configure your Claude API key in settings.');
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('You must be logged in to use AI features');
    }
    
    const prompt = this.buildAnalysisPrompt(request);
    
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'analyzeDeal',
          data: { prompt }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('API error response:', error);
        throw new Error(error.error || 'Failed to get AI insights');
      }

      const result = await response.json();
      return this.parseInsights(result.content);
    } catch (error) {
      console.error('Claude API error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get AI insights');
    }
  }
  
  async explainCalculation(
    calculationType: string, 
    inputs: Record<string, any>, 
    result: any
  ): Promise<string> {
    // Check if user has API key configured
    const hasKey = await ApiKeyService.hasApiKey();
    if (!hasKey) {
      return 'API key required to generate explanation. Please configure your Claude API key in settings.';
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return 'You must be logged in to use AI features';
    }
    
    const explainPrompt = `
    Explain this real estate calculation in simple terms:
    
    Calculation: ${calculationType}
    Inputs: ${JSON.stringify(inputs, null, 2)}
    Result: ${JSON.stringify(result, null, 2)}
    
    Provide a clear, concise explanation that a non-expert can understand.
    Focus on what the result means and why it matters for investment decisions.
    `;
    
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          action: 'explainCalculation',
          data: { explainPrompt }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get explanation');
      }

      const result = await response.json();
      return result.content || 'Unable to generate explanation';
    } catch (error) {
      console.error('Failed to get explanation:', error);
      return 'Unable to generate explanation at this time.';
    }
  }

  /**
   * Direct API call using the new format (for future use)
   */
  async callAPI(prompt: string, systemPrompt?: string): Promise<any> {
    const hasKey = await ApiKeyService.hasApiKey();
    if (!hasKey) {
      throw new Error('API key required. Please configure your Claude API key in settings.');
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('You must be logged in to use AI features');
    }

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          prompt,
          systemPrompt,
          model: 'claude-3-haiku-20240307',
          maxTokens: 1024
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to call Claude API');
      }

      return await response.json();
    } catch (error) {
      console.error('Claude API error:', error);
      throw error;
    }
  }
  
  private buildAnalysisPrompt(request: AnalysisRequest): string {
    const { scenario, additionalContext, focusAreas = ['returns', 'risks', 'optimization'] } = request;
    
    // Extract key metrics from scenario
    const totalCost = (scenario.acquisition?.purchasePrice || 0) + 
                     (scenario.acquisition?.closingCosts || 0) + 
                     (scenario.acquisition?.renovationCosts || 0);
    
    const focusAreasStr = focusAreas.join(', ');
    
    return `
    You are a real estate investment expert. Analyze this deal and provide structured insights.
    
    PROPERTY DETAILS:
    - Type: ${scenario.propertyInfo?.propertyType || 'Not specified'}
    - Location: ${scenario.propertyInfo?.address || 'Not specified'}
    - Size: ${scenario.propertyInfo?.netRentableArea || 0} sq ft
    - Units: ${scenario.propertyInfo?.units || 'N/A'}
    
    FINANCIAL STRUCTURE:
    - Total Investment: $${totalCost.toLocaleString()}
    - Purchase Price: $${(scenario.acquisition?.purchasePrice || 0).toLocaleString()}
    - Renovation: $${(scenario.acquisition?.renovationCosts || 0).toLocaleString()}
    
    FINANCING:
    - Loan Amount: $${(scenario.financing?.loanAmount || 0).toLocaleString()}
    - Interest Rate: ${scenario.financing?.interestRate || 0}%
    - Term: ${scenario.financing?.term || 0} years
    
    INCOME ASSUMPTIONS:
    - Rental Income: $${(scenario.income?.baseRent || 0).toLocaleString()}/year
    - Vacancy Rate: ${scenario.assumptions?.vacancy || 0}%
    - Growth Rate: ${scenario.assumptions?.rentGrowth || 0}%
    
    RETURN METRICS:
    - Target IRR: ${scenario.targets?.irr || 'Not set'}%
    - Hold Period: ${scenario.assumptions?.holdPeriod || 5} years
    - Exit Cap Rate: ${scenario.assumptions?.exitCapRate || 0}%
    
    ${additionalContext ? `ADDITIONAL CONTEXT:\n${additionalContext}\n` : ''}
    
    Please analyze this deal focusing on: ${focusAreasStr}
    
    Provide your response in the following JSON format:
    {
      "assessment": {
        "rating": "excellent/good/fair/poor",
        "summary": "2-3 sentence executive summary",
        "keyPoints": ["point1", "point2", "point3"]
      },
      "sentiment": "positive/neutral/negative",
      "risks": {
        "level": "low/medium/high",
        "factors": ["risk1", "risk2", "risk3"],
        "mitigations": ["mitigation1", "mitigation2"]
      },
      "optimizations": {
        "immediate": ["action1", "action2"],
        "longTerm": ["strategy1", "strategy2"],
        "potentialImpact": "Description of potential improvements"
      },
      "marketContext": {
        "comparison": "How this deal compares to market",
        "trends": ["trend1", "trend2"],
        "positioning": "Market positioning assessment"
      },
      "metrics": {
        "strengthScore": 0-100,
        "riskScore": 0-100,
        "potentialScore": 0-100
      }
    }
    `;
  }
  
  private parseInsights(response: string): DealInsights {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and return with defaults if needed
      return {
        assessment: parsed.assessment || {
          rating: 'fair',
          summary: 'Unable to fully assess deal',
          keyPoints: []
        },
        sentiment: parsed.sentiment || 'neutral',
        risks: parsed.risks || {
          level: 'medium',
          factors: [],
          mitigations: []
        },
        optimizations: parsed.optimizations || {
          immediate: [],
          longTerm: [],
          potentialImpact: ''
        },
        marketContext: parsed.marketContext || {
          comparison: '',
          trends: [],
          positioning: ''
        },
        metrics: parsed.metrics || {
          strengthScore: 50,
          riskScore: 50,
          potentialScore: 50
        }
      };
    } catch (error) {
      console.error('Failed to parse insights:', error);
      // Return default insights on parse error
      return this.getDefaultInsights();
    }
  }
  
  private getDefaultInsights(): DealInsights {
    return {
      assessment: {
        rating: 'fair',
        summary: 'Analysis could not be completed. Please check your inputs.',
        keyPoints: ['Insufficient data for complete analysis']
      },
      sentiment: 'neutral',
      risks: {
        level: 'medium',
        factors: ['Incomplete analysis'],
        mitigations: ['Review and complete all required fields']
      },
      optimizations: {
        immediate: ['Complete all required fields'],
        longTerm: ['Gather more market data'],
        potentialImpact: 'Better analysis with complete data'
      },
      marketContext: {
        comparison: 'Unable to compare without complete data',
        trends: [],
        positioning: 'Unknown'
      },
      metrics: {
        strengthScore: 0,
        riskScore: 50,
        potentialScore: 50
      }
    };
  }
}