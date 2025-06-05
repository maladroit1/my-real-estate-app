import { TIFComponent, TIFResult, ConsolidatedTIFResult } from '../types/cottonwoodHeights';

export class CottonwoodTIFCalculator {
  calculateComponentTIF(
    component: TIFComponent,
    baseValue: number,
    projectedValues: number[]
  ): TIFResult {
    const annualIncrements = projectedValues.map(value => {
      const increment = Math.max(0, value - baseValue);
      return increment * component.taxRate * component.captureRate;
    });
    
    const totalCapacity = this.calculatePresentValue(
      annualIncrements,
      component.discountRate,
      component.term
    );
    
    return {
      annualIncrements,
      totalCapacity,
      bondingCapacity: totalCapacity * 0.9, // 90% of total for safety margin
    };
  }
  
  consolidateTIFResults(components: {
    commercial: TIFResult;
    grocery: TIFResult;
    residential: TIFResult;
  }): ConsolidatedTIFResult {
    const totalAnnualIncrement = 
      (components.commercial.annualIncrements[0] || 0) +
      (components.grocery.annualIncrements[0] || 0) +
      (components.residential.annualIncrements[0] || 0);
      
    const totalBondingCapacity =
      components.commercial.bondingCapacity +
      components.grocery.bondingCapacity +
      components.residential.bondingCapacity;
      
    return {
      totalAnnualIncrement,
      totalBondingCapacity,
      componentBreakdown: components
    };
  }

  private calculatePresentValue(
    cashFlows: number[],
    discountRate: number,
    term: number
  ): number {
    let pv = 0;
    const limitedTerm = Math.min(cashFlows.length, term);
    
    for (let i = 0; i < limitedTerm; i++) {
      pv += cashFlows[i] / Math.pow(1 + discountRate, i + 1);
    }
    
    return pv;
  }

  generateTIFProjections(
    component: TIFComponent,
    baseValue: number,
    growthRate: number,
    years: number
  ): number[] {
    const projections: number[] = [];
    let currentValue = baseValue;
    
    for (let i = 0; i < years; i++) {
      currentValue = currentValue * (1 + growthRate);
      projections.push(currentValue);
    }
    
    return projections;
  }

  calculateTIFCapacity(
    baseAssessedValue: number,
    projectedAssessedValue: number,
    taxRate: number,
    captureRate: number,
    term: number,
    discountRate: number
  ): {
    annualIncrement: number;
    totalCapacity: number;
    bondingCapacity: number;
  } {
    const increment = projectedAssessedValue - baseAssessedValue;
    const annualTaxIncrement = increment * taxRate;
    const annualCapturedIncrement = annualTaxIncrement * captureRate;
    
    // Calculate present value of TIF stream
    let totalCapacity = 0;
    for (let year = 1; year <= term; year++) {
      totalCapacity += annualCapturedIncrement / Math.pow(1 + discountRate, year);
    }
    
    return {
      annualIncrement: annualCapturedIncrement,
      totalCapacity,
      bondingCapacity: totalCapacity * 0.9
    };
  }

  // Validate TIF assumptions
  validateTIFAssumptions(component: TIFComponent): string[] {
    const errors: string[] = [];
    
    if (component.captureRate > 0.9) {
      errors.push('TIF capture rate above 90% is extremely rare');
    }
    
    if (component.captureRate < 0.5) {
      errors.push('TIF capture rate below 50% may not provide sufficient funding');
    }
    
    if (component.term > 25) {
      errors.push('TIF term exceeding 25 years is uncommon');
    }
    
    if (component.taxRate > 0.04) {
      errors.push('Tax rate above 4% is very high');
    }
    
    if (component.discountRate < 0.04) {
      errors.push('Discount rate below 4% may be too optimistic');
    }
    
    if (component.discountRate > 0.08) {
      errors.push('Discount rate above 8% is very conservative for municipal financing');
    }
    
    return errors;
  }
}