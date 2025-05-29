import { useState, useEffect, useRef, useCallback } from 'react';
import { AIErrorDetector } from '../services/ErrorDetectionService';
import { ErrorDetection } from '../types/errorDetection';

interface UseErrorDetectionOptions {
  apiKey?: string;
  debounceMs?: number;
  autoValidate?: boolean;
  onErrorsChange?: (errors: ErrorDetection) => void;
}

export function useErrorDetection(
  scenario: any,
  options: UseErrorDetectionOptions = {}
) {
  const {
    apiKey,
    debounceMs = 1000,
    autoValidate = true,
    onErrorsChange
  } = options;

  const [errors, setErrors] = useState<ErrorDetection | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastValidation, setLastValidation] = useState<Date | null>(null);
  
  const detectorRef = useRef<AIErrorDetector | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize detector
  useEffect(() => {
    detectorRef.current = new AIErrorDetector(apiKey || '');
  }, [apiKey]);

  // Validation function
  const validate = useCallback(async () => {
    if (!detectorRef.current || !scenario) return;

    setLoading(true);
    try {
      const result = await detectorRef.current.validateScenario(scenario);
      setErrors(result);
      setLastValidation(new Date());
      onErrorsChange?.(result);
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setLoading(false);
    }
  }, [scenario, onErrorsChange]);

  // Debounced validation
  const validateDebounced = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      validate();
    }, debounceMs);
  }, [validate, debounceMs]);

  // Auto-validate on scenario changes
  useEffect(() => {
    if (autoValidate && scenario) {
      validateDebounced();
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [scenario, autoValidate, validateDebounced]);

  // Record user correction
  const recordCorrection = useCallback((field: string, fromValue: any, toValue: any) => {
    detectorRef.current?.recordUserCorrection(field, fromValue, toValue);
  }, []);

  // Get field errors
  const getFieldErrors = useCallback((field: string) => {
    if (!errors) return { errors: [], warnings: [], suggestions: [] };

    return {
      errors: errors.errors.filter(e => e.field === field),
      warnings: errors.warnings.filter(w => w.field === field),
      suggestions: errors.suggestions.filter(s => s.field === field)
    };
  }, [errors]);

  // Check if field has errors
  const hasFieldError = useCallback((field: string) => {
    if (!errors) return false;
    return errors.errors.some(e => e.field === field);
  }, [errors]);

  // Check if field has warnings
  const hasFieldWarning = useCallback((field: string) => {
    if (!errors) return false;
    return errors.warnings.some(w => w.field === field);
  }, [errors]);

  return {
    errors,
    loading,
    lastValidation,
    validate,
    validateDebounced,
    recordCorrection,
    getFieldErrors,
    hasFieldError,
    hasFieldWarning,
    errorCount: errors?.errors.length || 0,
    warningCount: errors?.warnings.length || 0,
    suggestionCount: errors?.suggestions.length || 0,
    hasErrors: (errors?.errors.length || 0) > 0,
    hasWarnings: (errors?.warnings.length || 0) > 0,
    hasSuggestions: (errors?.suggestions.length || 0) > 0
  };
}

// Hook for individual form fields
export function useFieldValidation(
  field: string,
  value: any,
  scenario: any,
  options: UseErrorDetectionOptions = {}
) {
  const detection = useErrorDetection(scenario, options);
  const fieldValidation = detection.getFieldErrors(field);
  
  const [previousValue, setPreviousValue] = useState(value);
  
  // Record corrections when value changes
  useEffect(() => {
    if (value !== previousValue && previousValue !== undefined) {
      detection.recordCorrection(field, previousValue, value);
      setPreviousValue(value);
    }
  }, [value, previousValue, field, detection]);

  return {
    errors: fieldValidation.errors,
    warnings: fieldValidation.warnings,
    suggestions: fieldValidation.suggestions,
    hasError: fieldValidation.errors.length > 0,
    hasWarning: fieldValidation.warnings.length > 0,
    errorMessage: fieldValidation.errors[0]?.message,
    warningMessage: fieldValidation.warnings[0]?.message,
    validate: detection.validateDebounced
  };
}