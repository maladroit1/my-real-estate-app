import Anthropic from '@anthropic-ai/sdk';

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

export class ClaudeInsightsService {
  private client: Anthropic;
  
  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }
  
  async analyzeDeal(request: AnalysisRequest): Promise<DealInsights> {
    const prompt = this.buildAnalysisPrompt(request);
    
    try {
      const response = await this.client.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 2000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
      
      return this.parseInsights(response.content[0].type === 'text' ? response.content[0].text : '');
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error('Failed to get AI insights');
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
  
  async explainCalculation(
    calculationType: string, 
    inputs: Record<string, any>, 
    result: any
  ): Promise<string> {
    const prompt = `
    Explain this real estate calculation in simple terms:
    
    Calculation: ${calculationType}
    Inputs: ${JSON.stringify(inputs, null, 2)}
    Result: ${JSON.stringify(result, null, 2)}
    
    Provide a clear, concise explanation that a non-expert can understand.
    Focus on what the result means and why it matters for investment decisions.
    `;
    
    try {
      const response = await this.client.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 500,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
      
      return response.content[0].type === 'text' ? response.content[0].text : 'Unable to generate explanation';
    } catch (error) {
      console.error('Failed to get explanation:', error);
      return 'Unable to generate explanation at this time.';
    }
  }
}