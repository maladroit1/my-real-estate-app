/**
 * IRR Calculator with proper edge case handling
 * Uses Newton-Raphson method with fallback to bisection method
 */

export interface IRRResult {
  irr: number;
  isValid: boolean;
  message?: string;
}

/**
 * Calculate IRR using Newton-Raphson method with proper validation
 * @param cashFlows Array of cash flows where first value is typically negative (initial investment)
 * @returns IRR as a decimal (e.g., 0.15 for 15%)
 */
export function calculateIRR(cashFlows: number[]): IRRResult {
  // Validation
  if (!cashFlows || cashFlows.length === 0) {
    return { irr: 0, isValid: false, message: "No cash flows provided" };
  }

  if (cashFlows.length === 1) {
    return { irr: 0, isValid: false, message: "Need at least 2 cash flows" };
  }

  // Check if there's at least one positive and one negative cash flow
  const hasPositive = cashFlows.some(cf => cf > 0);
  const hasNegative = cashFlows.some(cf => cf < 0);

  if (!hasPositive || !hasNegative) {
    // All positive or all negative cash flows
    if (!hasPositive) {
      return { irr: -1, isValid: false, message: "No positive cash flows - investment has 100% loss" };
    }
    if (!hasNegative) {
      return { irr: Number.POSITIVE_INFINITY, isValid: false, message: "No negative cash flows - infinite return" };
    }
  }

  // Check if total cash flows are positive (required for IRR to exist)
  const totalCashFlow = cashFlows.reduce((sum, cf) => sum + cf, 0);
  
  // Try Newton-Raphson method first
  const newtonResult = newtonRaphsonIRR(cashFlows);
  if (newtonResult.isValid) {
    return newtonResult;
  }

  // If Newton-Raphson fails, try bisection method
  const bisectionResult = bisectionIRR(cashFlows);
  if (bisectionResult.isValid) {
    return bisectionResult;
  }

  // If both methods fail, return appropriate message
  if (totalCashFlow < 0) {
    return { irr: -1, isValid: false, message: "Investment loses money overall" };
  }

  return { irr: 0, isValid: false, message: "IRR calculation did not converge" };
}

/**
 * Newton-Raphson method for IRR calculation
 */
function newtonRaphsonIRR(cashFlows: number[]): IRRResult {
  let irr = 0.1; // Initial guess 10%
  let iterations = 0;
  const maxIterations = 100;
  const tolerance = 0.0001;
  const epsilon = 1e-10;

  // Try multiple initial guesses if the first doesn't work
  const initialGuesses = [0.1, 0.0, -0.5, 0.5, -0.9, 0.9];
  
  for (const guess of initialGuesses) {
    irr = guess;
    iterations = 0;

    while (iterations < maxIterations) {
      const npvResult = calculateNPVAndDerivative(cashFlows, irr);
      
      if (Math.abs(npvResult.npv) < tolerance) {
        // Check if the IRR is reasonable (between -99% and 1000%)
        if (irr >= -0.99 && irr <= 10) {
          return { irr, isValid: true };
        }
      }

      if (Math.abs(npvResult.derivative) < epsilon) {
        // Derivative too small, try next guess
        break;
      }

      const newIrr = irr - npvResult.npv / npvResult.derivative;
      
      // Bound the IRR to prevent extreme values
      if (!isFinite(newIrr) || Math.abs(newIrr) > 100) {
        break;
      }

      if (Math.abs(newIrr - irr) < tolerance) {
        // Converged
        if (newIrr >= -0.99 && newIrr <= 10) {
          return { irr: newIrr, isValid: true };
        }
      }

      irr = newIrr;
      iterations++;
    }
  }

  return { irr: 0, isValid: false };
}

/**
 * Bisection method as fallback for IRR calculation
 */
function bisectionIRR(cashFlows: number[]): IRRResult {
  let lowerBound = -0.99;
  let upperBound = 10;
  let irr = 0;
  const tolerance = 0.0001;
  const maxIterations = 200;
  let iterations = 0;

  // Find initial bounds where NPV changes sign
  const npvLower = calculateNPV(cashFlows, lowerBound);
  const npvUpper = calculateNPV(cashFlows, upperBound);

  // If NPVs have same sign, adjust bounds
  if (npvLower * npvUpper > 0) {
    // Try to find better bounds
    for (let rate = -0.9; rate <= 5; rate += 0.1) {
      const npv = calculateNPV(cashFlows, rate);
      if (npvLower * npv < 0) {
        upperBound = rate;
        break;
      } else if (npv * npvUpper < 0) {
        lowerBound = rate;
        break;
      }
    }
  }

  // Bisection method
  while (iterations < maxIterations && upperBound - lowerBound > tolerance) {
    irr = (lowerBound + upperBound) / 2;
    const npvMid = calculateNPV(cashFlows, irr);

    if (Math.abs(npvMid) < tolerance) {
      return { irr, isValid: true };
    }

    const npvLower = calculateNPV(cashFlows, lowerBound);
    
    if (npvLower * npvMid < 0) {
      upperBound = irr;
    } else {
      lowerBound = irr;
    }

    iterations++;
  }

  if (iterations < maxIterations) {
    return { irr, isValid: true };
  }

  return { irr: 0, isValid: false };
}

/**
 * Calculate NPV for given cash flows and discount rate
 */
function calculateNPV(cashFlows: number[], rate: number): number {
  let npv = 0;
  
  for (let i = 0; i < cashFlows.length; i++) {
    if (rate === -1 && i > 0) {
      // Special case: rate = -100%
      return Number.POSITIVE_INFINITY;
    }
    npv += cashFlows[i] / Math.pow(1 + rate, i);
  }
  
  return npv;
}

/**
 * Calculate NPV and its derivative for Newton-Raphson method
 */
function calculateNPVAndDerivative(cashFlows: number[], rate: number): { npv: number; derivative: number } {
  let npv = 0;
  let derivative = 0;
  
  for (let i = 0; i < cashFlows.length; i++) {
    const denominator = Math.pow(1 + rate, i);
    
    if (rate === -1 && i > 0) {
      return { npv: Number.POSITIVE_INFINITY, derivative: Number.NEGATIVE_INFINITY };
    }
    
    npv += cashFlows[i] / denominator;
    
    if (i > 0) {
      derivative -= (i * cashFlows[i]) / Math.pow(1 + rate, i + 1);
    }
  }
  
  return { npv, derivative };
}

/**
 * Format IRR for display
 */
export function formatIRR(irrResult: IRRResult): string {
  if (!irrResult.isValid) {
    if (irrResult.message?.includes("100% loss")) {
      return "N/A (Loss)";
    }
    if (irrResult.message?.includes("infinite return")) {
      return "∞";
    }
    return "N/A";
  }

  const irrPercent = irrResult.irr * 100;
  
  // Handle special cases
  if (irrPercent < -99) {
    return "-99.00";
  }
  if (irrPercent > 999) {
    return "999.00+";
  }
  
  return irrPercent.toFixed(2);
}