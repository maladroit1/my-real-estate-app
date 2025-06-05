import { 
  CottonwoodHeightsProperty, 
  ConsolidatedCashFlow,
  ComponentCashFlow,
  SharedEquityStructure
} from '../types/cottonwoodHeights';
import { GroundLeaseCalculator } from './groundLeaseCalculator';
import { CottonwoodTIFCalculator } from './tifCalculator';

export class CottonwoodCashFlowCalculator {
  private property: CottonwoodHeightsProperty;
  private groundLeaseCalc: GroundLeaseCalculator;
  private tifCalc: CottonwoodTIFCalculator;

  constructor(property: CottonwoodHeightsProperty) {
    this.property = property;
    this.groundLeaseCalc = new GroundLeaseCalculator(property.groundLease);
    this.tifCalc = new CottonwoodTIFCalculator();
  }

  generateConsolidatedCashFlows(holdPeriod: number = 10): ConsolidatedCashFlow[] {
    const cashFlows: ConsolidatedCashFlow[] = [];
    
    for (let year = 0; year <= holdPeriod; year++) {
      const medicalOffice = this.calculateMedicalOfficeCashFlow(year);
      const grocery = this.calculateGroceryCashFlow(year);
      const townhomes = this.calculateTownhomeCashFlow(year);
      const parking = this.calculateParkingCashFlow(year);
      const amphitheater = this.calculateAmphitheaterCashFlow(year);
      
      const totalRevenue = 
        medicalOffice.revenue + 
        grocery.revenue + 
        townhomes.revenue + 
        parking.revenue + 
        amphitheater.revenue;
        
      const totalNOI = 
        medicalOffice.noi + 
        grocery.noi + 
        townhomes.noi + 
        parking.noi + 
        amphitheater.noi;
      
      // Calculate ground lease payment
      const groundLeasePayment = this.groundLeaseCalc.calculateAnnualPayment(
        year,
        totalRevenue,
        totalNOI
      ).totalPayment;
      
      // Calculate debt service
      const debtService = this.calculateTotalDebtService(year);
      
      // Calculate TIF proceeds
      const tifProceeds = this.calculateTIFProceeds(year);
      
      // Calculate state funding
      const stateFunding = this.calculateStateFunding(year);
      
      // Net cash flow before distributions
      const netCashFlow = totalNOI - groundLeasePayment - debtService + tifProceeds + stateFunding;
      
      // Calculate equity distributions
      const equityDistribution = this.calculateEquityDistributions(
        netCashFlow,
        this.property.equity
      );
      
      cashFlows.push({
        year,
        medicalOffice,
        grocery,
        townhomes,
        parking,
        amphitheater,
        consolidatedNOI: totalNOI,
        groundLeasePayment,
        debtService,
        tifProceeds,
        stateFunding,
        netCashFlow,
        equityDistribution
      });
    }
    
    return cashFlows;
  }

  private calculateMedicalOfficeCashFlow(year: number): ComponentCashFlow {
    const component = this.property.components.medicalOffice;
    if (!component.enabled || year === 0) {
      return { revenue: 0, expenses: 0, noi: 0 };
    }
    
    // Calculate blended rent based on specialty mix
    let totalRent = 0;
    component.specialtyMix.forEach(specialty => {
      const rentPSF = component.baseRentPSF * specialty.rentPremium;
      const annualRent = specialty.squareFootage * rentPSF;
      totalRent += annualRent;
    });
    
    // Apply vacancy
    const effectiveRevenue = totalRent * (1 - component.vacancy / 100);
    
    // Calculate expenses
    const expenses = component.rentableSF * component.opexPSF;
    
    return {
      revenue: effectiveRevenue,
      expenses,
      noi: effectiveRevenue - expenses
    };
  }

  private calculateGroceryCashFlow(year: number): ComponentCashFlow {
    const component = this.property.components.groceryAnchor;
    if (!component.enabled || year === 0) {
      return { revenue: 0, expenses: 0, noi: 0 };
    }
    
    // Base rent
    const baseRent = component.totalSF * component.baseRentPSF;
    
    // Percentage rent (simplified - would need actual sales data)
    let percentageRent = 0;
    if (component.percentageRent.enabled) {
      const estimatedSalesPSF = 600; // Industry average for grocery
      const totalSales = component.totalSF * estimatedSalesPSF;
      const breakpointSales = component.totalSF * component.percentageRent.breakpoint;
      if (totalSales > breakpointSales) {
        percentageRent = (totalSales - breakpointSales) * (component.percentageRent.rate / 100);
      }
    }
    
    // CAM contribution
    const camRevenue = component.totalSF * component.camContribution;
    
    const totalRevenue = baseRent + percentageRent + camRevenue;
    
    // Simplified expense calculation
    const expenses = component.totalSF * 8; // $8/SF typical for grocery
    
    return {
      revenue: totalRevenue,
      expenses,
      noi: totalRevenue - expenses
    };
  }

  private calculateTownhomeCashFlow(year: number): ComponentCashFlow {
    const component = this.property.components.townhomes;
    if (!component.enabled || year === 0) {
      return { revenue: 0, expenses: 0, noi: 0 };
    }
    
    // Apply rent growth
    const rentGrowthFactor = Math.pow(1 + component.annualRentGrowth / 100, year - 1);
    const currentRent = component.rentPerUnit * rentGrowthFactor;
    
    // Calculate revenue
    const potentialRevenue = component.units * currentRent * 12;
    const effectiveRevenue = potentialRevenue * (1 - component.vacancy / 100);
    
    // Calculate expenses
    const expenses = effectiveRevenue * (component.operatingExpenseRatio / 100);
    
    return {
      revenue: effectiveRevenue,
      expenses,
      noi: effectiveRevenue - expenses
    };
  }

  private calculateParkingCashFlow(year: number): ComponentCashFlow {
    const component = this.property.components.parking;
    if (!component.enabled || year === 0) {
      return { revenue: 0, expenses: 0, noi: 0 };
    }
    
    const totalSpaces = component.structuredSpaces + component.surfaceSpaces;
    const revenueGeneratingSpaces = totalSpaces * (component.utilizationRate / 100);
    const annualRevenue = revenueGeneratingSpaces * component.monthlyRevenue * 12;
    
    // Operating expenses for parking
    const expensesPerSpace = 500; // Annual operating cost per space
    const expenses = totalSpaces * expensesPerSpace;
    
    return {
      revenue: annualRevenue,
      expenses,
      noi: annualRevenue - expenses
    };
  }

  private calculateAmphitheaterCashFlow(year: number): ComponentCashFlow {
    const component = this.property.components.amphitheater;
    if (!component.enabled || year === 0) {
      return { revenue: 0, expenses: 0, noi: 0 };
    }
    
    const ticketRevenue = 
      component.annualEvents * 
      component.seats * 
      (component.avgAttendanceRate / 100) * 
      component.avgTicketPrice;
    
    // Additional revenue from concessions, sponsorships
    const ancillaryRevenue = ticketRevenue * 0.3; // 30% of ticket revenue
    
    const totalRevenue = ticketRevenue + ancillaryRevenue;
    const expenses = component.annualMaintenanceCost;
    
    return {
      revenue: totalRevenue,
      expenses,
      noi: totalRevenue - expenses
    };
  }

  private calculateTotalDebtService(year: number): number {
    // Simplified debt service calculation
    // In production, this would calculate actual loan payments based on the financing structure
    const { financing } = this.property;
    let totalDebtService = 0;
    
    // This is a placeholder - actual implementation would calculate based on
    // construction draws, permanent loan conversion, amortization schedules, etc.
    if (year > 2) { // Assume permanent financing starts year 3
      // Add retail/commercial debt service
      // Add townhome debt service
      totalDebtService = 5000000; // Placeholder annual debt service
    }
    
    return totalDebtService;
  }

  private calculateTIFProceeds(year: number): number {
    if (!this.property.tif.enabled || year === 0) {
      return 0;
    }
    
    // Simplified TIF calculation
    // In production, this would use actual assessed values and tax rates
    let totalTIF = 0;
    
    if (year > 1) { // TIF starts after year 1
      // Commercial TIF
      if (this.property.tif.commercial.captureRate > 0) {
        totalTIF += 250000; // Placeholder
      }
      
      // Grocery TIF
      if (this.property.tif.grocery.captureRate > 0) {
        totalTIF += 50000; // Placeholder
      }
      
      // Residential TIF
      if (this.property.tif.residential.captureRate > 0) {
        totalTIF += 150000; // Placeholder
      }
    }
    
    return totalTIF;
  }

  private calculateStateFunding(year: number): number {
    if (!this.property.stateFunding.enabled) {
      return 0;
    }
    
    let totalFunding = 0;
    
    this.property.stateFunding.sources.forEach(source => {
      if (source.enabled) {
        // Disbursement based on schedule
        if (source.disbursementSchedule === 'upfront' && year === 1) {
          totalFunding += source.amount;
        } else if (source.disbursementSchedule === 'milestone' && year <= 3) {
          totalFunding += source.amount / 3; // Spread over 3 years
        } else if (source.disbursementSchedule === 'completion' && year === 3) {
          totalFunding += source.amount;
        }
      }
    });
    
    return totalFunding;
  }

  private calculateEquityDistributions(
    netCashFlow: number,
    equityStructure: SharedEquityStructure
  ): { [investorId: string]: number } {
    const distributions: { [investorId: string]: number } = {};
    
    if (netCashFlow <= 0) {
      equityStructure.investors.forEach(investor => {
        distributions[investor.id] = 0;
      });
      return distributions;
    }
    
    // Simplified waterfall calculation
    // In production, this would implement the full waterfall logic
    equityStructure.investors.forEach(investor => {
      const share = investor.equityContribution / 100;
      distributions[investor.id] = netCashFlow * share;
    });
    
    return distributions;
  }
}