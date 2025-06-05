// Cottonwood Heights Mixed-Use Development Types

export interface CottonwoodHeightsProperty {
  type: 'cottonwoodHeights';
  components: {
    medicalOffice: MedicalOfficeComponent;
    groceryAnchor: GroceryAnchorComponent;
    townhomes: TownhomeComponent;
    parking: ParkingStructureComponent;
    amphitheater: AmphitheaterComponent;
  };
  financing: CottonwoodFinancingStructure;
  tif: TIFStructures;
  groundLease: GroundLeaseStructure;
  equity: SharedEquityStructure;
  stateFunding: StateFundingStructure;
}

// Component Interfaces
export interface MedicalOfficeComponent {
  enabled: boolean;
  totalSF: number;
  rentableSF: number;
  hardCostPSF: number;
  tiAllowance: number;
  parkingRatio: number;
  baseRentPSF: number;
  specialtyMix: Array<{
    type: 'general' | 'dental' | 'urgent-care' | 'diagnostic';
    squareFootage: number;
    rentPremium: number;
  }>;
  vacancy: number;
  opexPSF: number;
}

export interface GroceryAnchorComponent {
  enabled: boolean;
  totalSF: number;
  hardCostPSF: number;
  tiAllowance: number;
  parkingRatio: number;
  baseRentPSF: number;
  percentageRent: {
    enabled: boolean;
    breakpoint: number;
    rate: number;
  };
  camContribution: number;
}

export interface TownhomeComponent {
  enabled: boolean;
  units: number;
  avgSize: number;
  rentPerUnit: number;
  hardCostPSF: number;
  vacancy: number;
  opexPerUnit: number;
  annualRentGrowth: number;
  operatingExpenseRatio: number;
}

export interface ParkingStructureComponent {
  enabled: boolean;
  structuredSpaces: number;
  surfaceSpaces: number;
  structuredCostPerSpace: number;
  surfaceCostPerSpace: number;
  monthlyRevenue: number;
  utilizationRate: number;
}

export interface AmphitheaterComponent {
  enabled: boolean;
  seats: number;
  constructionCost: number;
  annualEvents: number;
  avgTicketPrice: number;
  avgAttendanceRate: number;
  annualMaintenanceCost: number;
}

// Financing Structures
export interface CottonwoodFinancingStructure {
  retailConstruction: ConstructionLoan;
  retailPermanent: PermanentLoan;
  townhomeConstruction: ConstructionLoan;
  townhomePermanent: PermanentLoan;
}

export interface ConstructionLoan {
  enabled: boolean;
  ltc: number;
  rate: number;
  originationFee: number;
  term: number;
  avgOutstandingPercent: number;
}

export interface PermanentLoan {
  enabled: boolean;
  ltv: number;
  rate: number;
  amortization: number;
  term: number;
  ioPeriod: number;
  exitCapRate?: number;
}

// Ground Lease Structure
export interface GroundLeaseStructure {
  enabled: boolean;
  byParcel: boolean; // If true, calculate ground lease by parcel
  acquisitionType: 'donation' | 'purchase';
  paymentStructure: 'percentage_revenue' | 'percentage_noi' | 'base_plus_percentage';
  baseRate: number;
  percentageRate: number;
  escalation: {
    type: 'cpi' | 'fixed';
    rate: number;
    cap: number;
  };
  validationRules: {
    revenueRange: { min: number; max: number };
    noiRange: { min: number; max: number };
  };
  // Parcel-specific settings (only used if byParcel is true)
  parcelSettings?: {
    retail?: {
      enabled: boolean;
      percentageRate: number;
      baseRate: number;
    };
    grocery?: {
      enabled: boolean;
      percentageRate: number;
      baseRate: number;
    };
    townhomes?: {
      enabled: boolean;
      percentageRate: number;
      baseRate: number;
    };
  };
}

// Shared Equity Structure
export interface SharedEquityStructure {
  investors: Array<{
    id: string;
    name: string;
    equityContribution: number;
    preferredReturn: number;
    profitShare: number[];
  }>;
  waterfallEnabled: boolean;
  waterfall: Array<{
    id: string;
    threshold: string;
    minIRR: number;
    maxIRR: number;
  }>;
  crossCollateralization: boolean;
  componentAllocation: {
    [component: string]: number;
  };
}

// TIF Structures
export interface TIFStructures {
  enabled: boolean;
  commercial: TIFComponent;
  grocery: TIFComponent;
  residential: TIFComponent;
}

export interface TIFComponent {
  captureRate: number;
  term: number;
  baseAssessedValue: number;
  projectedAssessedValue: number;
  taxRate: number;
  discountRate: number;
}

// State Funding Structure
export interface StateFundingStructure {
  enabled: boolean;
  sources: StateFundingSource[];
}

export interface StateFundingSource {
  name: string;
  enabled: boolean;
  amount: number;
  maxAmount: number;
  equityReductionFactor: number;
  requirements: string[];
  disbursementSchedule: 'upfront' | 'milestone' | 'completion';
}

// Calculation Results
export interface TIFResult {
  annualIncrements: number[];
  totalCapacity: number;
  bondingCapacity: number;
}

export interface ConsolidatedTIFResult {
  totalAnnualIncrement: number;
  totalBondingCapacity: number;
  componentBreakdown: {
    commercial: TIFResult;
    grocery: TIFResult;
    residential: TIFResult;
  };
}

export interface GroundLeasePayment {
  year: number;
  basePayment: number;
  escalation: number;
  totalPayment: number;
  percentageOfRevenue?: number;
  percentageOfNOI?: number;
}

export interface ConsolidatedCashFlow {
  year: number;
  medicalOffice: ComponentCashFlow;
  grocery: ComponentCashFlow;
  townhomes: ComponentCashFlow;
  parking: ComponentCashFlow;
  amphitheater: ComponentCashFlow;
  consolidatedNOI: number;
  groundLeasePayment: number;
  debtService: number;
  tifProceeds: number;
  stateFunding: number;
  netCashFlow: number;
  equityDistribution: {
    [investorId: string]: number;
  };
}

export interface ComponentCashFlow {
  revenue: number;
  expenses: number;
  noi: number;
}