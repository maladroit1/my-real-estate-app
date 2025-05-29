import Anthropic from '@anthropic-ai/sdk';
import {
  ErrorDetection,
  ValidationError,
  ValidationWarning,
  Suggestion,
  LocalValidation,
  AIValidation,
  ValidationRule,
  ValidationResult,
  ErrorPattern
} from '../types/errorDetection';

export class AIErrorDetector {
  private claudeClient: Anthropic;
  private validationRules: ValidationRule[] = [];
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  
  constructor(apiKey: string) {
    this.claudeClient = new Anthropic({ apiKey });
    this.initializeValidationRules();
    this.loadErrorPatterns();
  }
  
  async validateScenario(scenario: any): Promise<ErrorDetection> {
    const validationId = `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Run local validation rules
    const localValidation = this.runLocalValidation(scenario);
    
    // Run AI-powered validation (if API key is available)
    let aiValidation: AIValidation = { errors: [], warnings: [], suggestions: [] };
    try {
      aiValidation = await this.runAIValidation(scenario);
    } catch (error) {
      console.warn('AI validation unavailable:', error);
    }
    
    // Merge results and remove duplicates
    const allErrors = this.deduplicateErrors([...localValidation.errors, ...aiValidation.errors]);
    const allWarnings = this.deduplicateWarnings([...localValidation.warnings, ...aiValidation.warnings]);
    
    return {
      errors: allErrors,
      warnings: allWarnings,
      suggestions: aiValidation.suggestions,
      timestamp: new Date(),
      validationId
    };
  }
  
  private initializeValidationRules() {
    // Property-specific rules
    this.validationRules.push({
      field: 'purchasePrice',
      rule: (value) => {
        if (!value || value <= 0) {
          return {
            type: 'error',
            message: 'Purchase price must be greater than 0',
            severity: 'critical'
          };
        }
        if (value < 50000) {
          return {
            type: 'warning',
            message: 'Purchase price seems unusually low',
            severity: 'medium'
          };
        }
        return null;
      }
    });
    
    this.validationRules.push({
      field: 'vacancy',
      rule: (value, scenario) => {
        if (value < 0 || value > 100) {
          return {
            type: 'error',
            message: 'Vacancy rate must be between 0% and 100%',
            severity: 'critical'
          };
        }
        
        // Property type specific warnings
        const propertyType = scenario.propertyInfo?.propertyType || scenario.propertyType;
        const highVacancyThresholds: Record<string, number> = {
          multifamily: 10,
          office: 20,
          retail: 15,
          industrial: 10,
          hospitality: 30
        };
        
        const threshold = highVacancyThresholds[propertyType] || 15;
        if (value > threshold) {
          return {
            type: 'warning',
            message: `Vacancy rate of ${value}% is high for ${propertyType} properties`,
            severity: 'high',
            suggestion: `Consider market average of ${threshold - 5}% to ${threshold}%`
          };
        }
        return null;
      }
    });
    
    this.validationRules.push({
      field: 'capRate',
      rule: (value, scenario) => {
        if (value <= 0 || value > 20) {
          return {
            type: 'error',
            message: 'Cap rate must be between 0% and 20%',
            severity: 'high'
          };
        }
        
        const propertyType = scenario.propertyInfo?.propertyType || scenario.propertyType;
        const marketRanges: Record<string, [number, number]> = {
          multifamily: [4, 7],
          office: [5, 9],
          retail: [6, 10],
          industrial: [5, 8],
          hospitality: [7, 12]
        };
        
        const [min, max] = marketRanges[propertyType] || [4, 10];
        if (value < min || value > max) {
          return {
            type: 'warning',
            message: `Cap rate of ${value}% is outside typical range (${min}%-${max}%) for ${propertyType}`,
            severity: 'medium'
          };
        }
        return null;
      }
    });
    
    this.validationRules.push({
      field: 'loanAmount',
      rule: (value, scenario) => {
        const purchasePrice = scenario.acquisition?.purchasePrice || scenario.purchasePrice || 0;
        const ltv = (value / purchasePrice) * 100;
        
        if (ltv > 80) {
          return {
            type: 'warning',
            message: `LTV of ${ltv.toFixed(1)}% is high - most lenders cap at 75-80%`,
            severity: 'high',
            suggestion: 'Consider reducing loan amount or finding specialized financing'
          };
        }
        if (ltv > 90) {
          return {
            type: 'error',
            message: `LTV of ${ltv.toFixed(1)}% exceeds typical lending limits`,
            severity: 'high'
          };
        }
        return null;
      },
      dependsOn: ['purchasePrice']
    });
    
    this.validationRules.push({
      field: 'rentGrowth',
      rule: (value) => {
        if (value < -10 || value > 20) {
          return {
            type: 'error',
            message: 'Rent growth must be between -10% and 20%',
            severity: 'high'
          };
        }
        if (value > 5) {
          return {
            type: 'warning',
            message: `Rent growth of ${value}% is aggressive - market average is 2-4%`,
            severity: 'medium'
          };
        }
        return null;
      }
    });
    
    // Mathematical consistency rules
    this.validationRules.push({
      field: 'netRentableArea',
      rule: (value, scenario) => {
        const grossArea = scenario.propertyInfo?.grossArea || 0;
        if (value > grossArea && grossArea > 0) {
          return {
            type: 'error',
            message: 'Net rentable area cannot exceed gross area',
            severity: 'critical'
          };
        }
        const efficiency = grossArea > 0 ? (value / grossArea) * 100 : 0;
        if (efficiency < 70 && grossArea > 0) {
          return {
            type: 'warning',
            message: `Building efficiency of ${efficiency.toFixed(1)}% is low`,
            severity: 'medium',
            suggestion: 'Typical efficiency is 80-90% for most property types'
          };
        }
        return null;
      },
      dependsOn: ['grossArea']
    });
  }
  
  private runLocalValidation(scenario: any): LocalValidation {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Run all validation rules
    for (const rule of this.validationRules) {
      const value = this.getNestedValue(scenario, rule.field);
      const result = rule.rule(value, scenario);
      
      if (result) {
        const item = {
          field: rule.field,
          message: result.message,
          severity: result.severity as any,
          actualValue: value
        };
        
        if (result.type === 'error') {
          errors.push(item);
        } else {
          warnings.push({ ...item, context: result.suggestion });
        }
      }
    }
    
    // Cross-field validations
    this.runCrossFieldValidations(scenario, errors, warnings);
    
    return { errors, warnings };
  }
  
  private runCrossFieldValidations(scenario: any, errors: ValidationError[], warnings: ValidationWarning[]) {
    // Check DSCR calculations
    const loanAmount = scenario.financing?.loanAmount || scenario.loanAmount || 0;
    const interestRate = scenario.financing?.interestRate || scenario.interestRate || 0;
    const noi = scenario.income?.noi || this.calculateNOI(scenario);
    const annualDebtService = this.calculateDebtService(loanAmount, interestRate, 30);
    
    if (annualDebtService > 0) {
      const dscr = noi / annualDebtService;
      if (dscr < 1.0) {
        errors.push({
          field: 'dscr',
          message: `DSCR of ${dscr.toFixed(2)} is below 1.0 - property won't cover debt`,
          severity: 'critical',
          actualValue: dscr
        });
      } else if (dscr < 1.25) {
        warnings.push({
          field: 'dscr',
          message: `DSCR of ${dscr.toFixed(2)} is below typical lender requirement of 1.25`,
          severity: 'high',
          context: `Current DSCR: ${dscr.toFixed(2)}`
        });
      }
    }
    
    // Check yield on cost
    const totalCost = (scenario.acquisition?.purchasePrice || 0) + 
                     (scenario.acquisition?.closingCosts || 0) + 
                     (scenario.acquisition?.renovationCosts || 0);
    
    if (totalCost > 0 && noi > 0) {
      const yieldOnCost = (noi / totalCost) * 100;
      if (yieldOnCost < 5) {
        warnings.push({
          field: 'yieldOnCost',
          message: `Yield on cost of ${yieldOnCost.toFixed(2)}% is low`,
          severity: 'medium',
          context: 'Consider if renovation costs are justified by rent increases'
        });
      }
    }
  }
  
  private async runAIValidation(scenario: any): Promise<AIValidation> {
    const prompt = `
    You are a real estate underwriting expert. Review this pro forma for errors, warnings, and inconsistencies.
    
    Property Details:
    ${JSON.stringify(scenario, null, 2)}
    
    Check for:
    1. Mathematical errors or inconsistencies
    2. Unrealistic assumptions based on property type and market
    3. Missing or incomplete data
    4. Structural issues with the deal
    5. Red flags that would concern lenders or investors
    
    For each issue found, categorize as:
    - Error: Critical issues that must be fixed
    - Warning: Concerning issues that should be reviewed
    - Suggestion: Improvements or best practices
    
    Return your findings in this exact JSON format:
    {
      "errors": [
        {
          "field": "fieldName",
          "message": "Clear description of the error",
          "severity": "critical|high|medium",
          "expectedValue": "what it should be (if applicable)",
          "actualValue": "what it currently is"
        }
      ],
      "warnings": [
        {
          "field": "fieldName",
          "message": "Description of the warning",
          "severity": "high|medium|low",
          "context": "Additional context or explanation"
        }
      ],
      "suggestions": [
        {
          "field": "fieldName",
          "message": "Suggestion for improvement",
          "suggestedValue": "recommended value (if applicable)",
          "confidence": 0.8,
          "reasoning": "Why this suggestion makes sense"
        }
      ]
    }
    `;
    
    try {
      const response = await this.claudeClient.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 2000,
        temperature: 0.2,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
      
      const content = response.content[0].type === 'text' ? response.content[0].text : '';
      return this.parseAIValidationResponse(content);
    } catch (error) {
      console.error('AI validation error:', error);
      return { errors: [], warnings: [], suggestions: [] };
    }
  }
  
  private parseAIValidationResponse(response: string): AIValidation {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        errors: parsed.errors || [],
        warnings: parsed.warnings || [],
        suggestions: parsed.suggestions || []
      };
    } catch (error) {
      console.error('Failed to parse AI validation response:', error);
      return { errors: [], warnings: [], suggestions: [] };
    }
  }
  
  private deduplicateErrors(errors: ValidationError[]): ValidationError[] {
    const seen = new Set<string>();
    return errors.filter(error => {
      const key = `${error.field}:${error.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  
  private deduplicateWarnings(warnings: ValidationWarning[]): ValidationWarning[] {
    const seen = new Set<string>();
    return warnings.filter(warning => {
      const key = `${warning.field}:${warning.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  
  private getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }
  
  private calculateNOI(scenario: any): number {
    const income = scenario.income?.baseRent || scenario.monthlyRent * 12 || 0;
    const vacancy = scenario.assumptions?.vacancy || scenario.vacancyRate || 0;
    const effectiveIncome = income * (1 - vacancy / 100);
    
    const expenses = (scenario.propertyTax || 0) +
                    (scenario.insurance || 0) +
                    (scenario.utilities || 0) +
                    (scenario.maintenance || 0) +
                    (scenario.management || 0) +
                    (scenario.hoa || 0) +
                    (scenario.other || 0);
    
    return effectiveIncome - expenses;
  }
  
  private calculateDebtService(loanAmount: number, rate: number, years: number): number {
    if (loanAmount <= 0 || rate <= 0 || years <= 0) return 0;
    
    const monthlyRate = rate / 100 / 12;
    const numPayments = years * 12;
    const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
                          (Math.pow(1 + monthlyRate, numPayments) - 1);
    
    return monthlyPayment * 12;
  }
  
  // Error pattern learning
  recordUserCorrection(field: string, fromValue: any, toValue: any) {
    const patternKey = `${field}:${fromValue}:${toValue}`;
    const pattern = this.errorPatterns.get(patternKey) || {
      id: patternKey,
      pattern: field,
      frequency: 0,
      lastSeen: new Date(),
      userCorrections: []
    };
    
    pattern.frequency++;
    pattern.lastSeen = new Date();
    pattern.userCorrections.push({
      from: fromValue,
      to: toValue,
      timestamp: new Date()
    });
    
    this.errorPatterns.set(patternKey, pattern);
    this.saveErrorPatterns();
  }
  
  private loadErrorPatterns() {
    try {
      const saved = localStorage.getItem('ai_error_patterns');
      if (saved) {
        const patterns = JSON.parse(saved);
        this.errorPatterns = new Map(patterns);
      }
    } catch (error) {
      console.error('Failed to load error patterns:', error);
    }
  }
  
  private saveErrorPatterns() {
    try {
      const patterns = Array.from(this.errorPatterns.entries());
      localStorage.setItem('ai_error_patterns', JSON.stringify(patterns));
    } catch (error) {
      console.error('Failed to save error patterns:', error);
    }
  }
}