export interface ValidationError {
  field: string;
  message: string;
  severity: 'critical' | 'high' | 'medium';
  path?: string;
  expectedValue?: any;
  actualValue?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  path?: string;
  context?: string;
}

export interface Suggestion {
  field: string;
  message: string;
  suggestedValue?: any;
  confidence: number; // 0-1
  reasoning?: string;
}

export interface ErrorDetection {
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: Suggestion[];
  timestamp: Date;
  validationId: string;
}

export interface LocalValidation {
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface AIValidation {
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: Suggestion[];
}

export interface ValidationRule {
  field: string;
  rule: (value: any, scenario: any) => ValidationResult | null;
  dependsOn?: string[];
}

export interface ValidationResult {
  type: 'error' | 'warning';
  message: string;
  severity: ValidationError['severity'] | ValidationWarning['severity'];
  suggestion?: string;
}

export interface ErrorPattern {
  id: string;
  pattern: string;
  frequency: number;
  lastSeen: Date;
  userCorrections: Array<{
    from: any;
    to: any;
    timestamp: Date;
  }>;
}