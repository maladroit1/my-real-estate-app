import { GroundLeaseStructure, GroundLeasePayment } from '../types/cottonwoodHeights';

export class GroundLeaseCalculator {
  private groundLease: GroundLeaseStructure;

  constructor(groundLease: GroundLeaseStructure) {
    this.groundLease = groundLease;
  }

  calculateAnnualPayment(
    year: number,
    grossRevenue: number,
    noi: number
  ): GroundLeasePayment {
    if (!this.groundLease.enabled) {
      return {
        year,
        basePayment: 0,
        escalation: 0,
        totalPayment: 0,
      };
    }

    let basePayment = 0;
    let escalation = 0;

    switch (this.groundLease.paymentStructure) {
      case 'percentage_revenue':
        basePayment = grossRevenue * this.groundLease.percentageRate;
        break;
      
      case 'percentage_noi':
        basePayment = noi * this.groundLease.percentageRate;
        break;
      
      case 'base_plus_percentage':
        basePayment = this.groundLease.baseRate + (grossRevenue * this.groundLease.percentageRate);
        break;
    }

    // Apply escalation
    if (year > 1) {
      if (this.groundLease.escalation.type === 'fixed') {
        escalation = Math.pow(1 + this.groundLease.escalation.rate, year - 1) - 1;
      } else if (this.groundLease.escalation.type === 'cpi') {
        // For CPI, we'll use the rate as an estimate
        escalation = Math.pow(1 + this.groundLease.escalation.rate, year - 1) - 1;
      }

      // Apply cap if specified
      if (this.groundLease.escalation.cap > 0) {
        const maxEscalation = this.groundLease.escalation.cap * (year - 1);
        escalation = Math.min(escalation, maxEscalation);
      }
    }

    const totalPayment = basePayment * (1 + escalation);

    return {
      year,
      basePayment,
      escalation: basePayment * escalation,
      totalPayment,
      percentageOfRevenue: grossRevenue > 0 ? (totalPayment / grossRevenue) * 100 : 0,
      percentageOfNOI: noi > 0 ? (totalPayment / noi) * 100 : 0,
    };
  }

  validatePaymentStructure(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.groundLease.paymentStructure === 'percentage_revenue') {
      if (this.groundLease.percentageRate < this.groundLease.validationRules.revenueRange.min) {
        errors.push(`Revenue percentage ${(this.groundLease.percentageRate * 100).toFixed(1)}% is below industry minimum of ${(this.groundLease.validationRules.revenueRange.min * 100).toFixed(1)}%`);
      }
      if (this.groundLease.percentageRate > this.groundLease.validationRules.revenueRange.max) {
        errors.push(`Revenue percentage ${(this.groundLease.percentageRate * 100).toFixed(1)}% exceeds industry maximum of ${(this.groundLease.validationRules.revenueRange.max * 100).toFixed(1)}%`);
      }
    }

    if (this.groundLease.paymentStructure === 'percentage_noi') {
      if (this.groundLease.percentageRate < this.groundLease.validationRules.noiRange.min) {
        errors.push(`NOI percentage ${(this.groundLease.percentageRate * 100).toFixed(1)}% is below industry minimum of ${(this.groundLease.validationRules.noiRange.min * 100).toFixed(1)}%`);
      }
      if (this.groundLease.percentageRate > this.groundLease.validationRules.noiRange.max) {
        errors.push(`NOI percentage ${(this.groundLease.percentageRate * 100).toFixed(1)}% exceeds industry maximum of ${(this.groundLease.validationRules.noiRange.max * 100).toFixed(1)}%`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  generatePaymentSchedule(
    projectedRevenues: number[],
    projectedNOIs: number[]
  ): GroundLeasePayment[] {
    return projectedRevenues.map((revenue, index) => {
      return this.calculateAnnualPayment(
        index + 1,
        revenue,
        projectedNOIs[index] || 0
      );
    });
  }
}