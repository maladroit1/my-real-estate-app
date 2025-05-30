/**
 * Math helper functions for safe calculations
 */

/**
 * Safely divide two numbers, returning a fallback value if division by zero
 */
export const safeDivide = (numerator: number, denominator: number, fallback: number = 0): number => {
  if (denominator === 0 || !isFinite(denominator) || !isFinite(numerator)) {
    return fallback;
  }
  return numerator / denominator;
};

/**
 * Clamp a value between min and max bounds
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Validate percentage is between 0 and 100
 */
export const validatePercentage = (value: number, name: string): { isValid: boolean; error?: string } => {
  if (value < 0) {
    return { isValid: false, error: `${name} cannot be negative` };
  }
  if (value > 100) {
    return { isValid: false, error: `${name} cannot exceed 100%` };
  }
  return { isValid: true };
};

/**
 * Validate currency amount is non-negative
 */
export const validateCurrency = (value: number, name: string): { isValid: boolean; error?: string } => {
  if (value < 0) {
    return { isValid: false, error: `${name} cannot be negative` };
  }
  if (!isFinite(value)) {
    return { isValid: false, error: `${name} must be a valid number` };
  }
  return { isValid: true };
};

/**
 * Calculate percentage of total with validation
 */
export const percentageOf = (value: number, percentage: number): number => {
  if (!isFinite(value) || !isFinite(percentage)) return 0;
  return value * (percentage / 100);
};

/**
 * Round to nearest cent for currency
 */
export const roundCurrency = (value: number): number => {
  return Math.round(value * 100) / 100;
};

/**
 * Round to specified decimal places
 */
export const roundTo = (value: number, decimals: number): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

/**
 * Calculate compound growth
 */
export const compoundGrowth = (initial: number, rate: number, periods: number): number => {
  if (!isFinite(initial) || !isFinite(rate) || !isFinite(periods)) return initial;
  if (periods < 0) return initial;
  return initial * Math.pow(1 + rate / 100, periods);
};

/**
 * Calculate present value
 */
export const presentValue = (futureValue: number, rate: number, periods: number): number => {
  if (rate === -1) return 0; // Avoid division by zero
  return safeDivide(futureValue, Math.pow(1 + rate, periods), 0);
};

/**
 * Validate cap rate
 */
export const validateCapRate = (capRate: number): { isValid: boolean; error?: string } => {
  if (capRate <= 0) {
    return { isValid: false, error: 'Cap rate must be greater than 0' };
  }
  if (capRate > 20) {
    return { isValid: false, error: 'Cap rate seems unusually high (>20%)' };
  }
  return { isValid: true };
};

/**
 * Calculate property value from NOI and cap rate
 */
export const calculatePropertyValue = (noi: number, capRate: number): number => {
  const validation = validateCapRate(capRate);
  if (!validation.isValid) return 0;
  
  return safeDivide(noi, capRate / 100, 0);
};

/**
 * Validate interest rate
 */
export const validateInterestRate = (rate: number, name: string): { isValid: boolean; error?: string } => {
  if (rate < 0) {
    return { isValid: false, error: `${name} cannot be negative` };
  }
  if (rate > 25) {
    return { isValid: false, error: `${name} seems unusually high (>25%)` };
  }
  return { isValid: true };
};

/**
 * Calculate monthly payment (principal and interest)
 */
export const calculateMonthlyPayment = (principal: number, annualRate: number, months: number): number => {
  if (principal <= 0 || months <= 0) return 0;
  if (annualRate === 0) return principal / months;
  
  const monthlyRate = annualRate / 100 / 12;
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                  (Math.pow(1 + monthlyRate, months) - 1);
  
  return isFinite(payment) ? payment : 0;
};

/**
 * Sum array of numbers safely
 */
export const safeSum = (numbers: number[]): number => {
  return numbers.reduce((sum, num) => {
    if (isFinite(num)) {
      return sum + num;
    }
    return sum;
  }, 0);
};

/**
 * Calculate weighted average
 */
export const weightedAverage = (values: Array<{ value: number; weight: number }>): number => {
  const totalWeight = safeSum(values.map(v => v.weight));
  if (totalWeight === 0) return 0;
  
  const weightedSum = values.reduce((sum, item) => {
    if (isFinite(item.value) && isFinite(item.weight)) {
      return sum + (item.value * item.weight);
    }
    return sum;
  }, 0);
  
  return safeDivide(weightedSum, totalWeight, 0);
};