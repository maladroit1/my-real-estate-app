import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { PDFExportSystem } from "./components/PDFExportV2";
import { GoalSeekSolver } from "./v2/features/GoalSeekSolver";
import {
  ChevronDown,
  ChevronRight,
  Download,
  Save,
  FileText,
  DollarSign,
  Building,
  Building2,
  Home,
  ShoppingCart,
  Info,
  AlertTriangle,
  Briefcase,
  X,
  BarChart as BarChartIcon,
  Target,
  Users,
  Settings,
  Menu,
  X as CloseIcon,
} from "lucide-react";
import { calculateIRR, formatIRR } from "./utils/irrCalculator";
import FormulaViewer from "./components/FormulaViewerSimple";
import { EquitySlider } from "./components/EquitySlider";
import { MetricBreakdown } from "./components/MetricBreakdown";
import { WaterfallDistribution } from "./components/WaterfallDistribution";
import { ApiKeyModal } from "./components/ApiKeyModal";
import { ApiKeyManager } from "./services/ApiKeyManager";
// import { TestAPIButton } from "./components/TestAPIButton"; // Moved to AIInsightsIntegration
import { OnyxLogo } from "./components/OnyxLogo";
import { AIInsightsIntegration } from "./components/AIInsightsIntegration";
import { GroundLeaseSection } from "./components/GroundLeaseSection";
import { StateFundingSection } from "./components/StateFundingSection";
import { UnitMatrix, UnitType } from "./components/UnitMatrix";
import { 
  GroundLeaseStructure, 
  StateFundingStructure,
  CottonwoodHeightsProperty 
} from "./types/cottonwoodHeights";
import { CottonwoodCashFlowCalculator } from "./utils/cottonwoodCashFlowCalculator";
import { GroundLeaseCalculator } from "./utils/groundLeaseCalculator";

// Type definitions
interface PropertyType {
  name: string;
  icon: React.FC<{ className?: string }>;
  color: string;
}

interface CashFlowData {
  year: number;
  rent: number;
  expenses: number;
  noi: number;
  debtService: number;
  cashFlow: number;
  cumulativeCashFlow: number;
  grossRevenue?: number;
  operatingExpenses?: number;
  salePrice?: number;
  exitProceeds?: number;
  refinanceProceeds?: number;
  tifRevenue?: number;
  groundLeasePayment?: number;
  stateFunding?: number;
}

// Scenario Management Types
interface Scenario {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  data: ScenarioData;
  metrics: ScenarioMetrics;
}

interface ScenarioData {
  // All existing state variables
  propertyType: string;
  projectName: string;
  landCost: number;
  siteAreaAcres: number;
  buildingGFA: number;
  parkingRatio: number;
  includeParking: boolean;
  parkingRevenue: any;
  hardCosts: any;
  softCosts: any;
  timeline: any;
  constructionLoan: any;
  permanentLoan: any;
  equityStructure: any;
  waterfallTiers: any[];
  operatingAssumptions: any;
  rentEscalations: any;
  unitMix: any[];
  salesAssumptions: any;
  salesPhasing: any[];
  tenants: any[];
  leasingAssumptions: any;
  scenarioAssumptions: any;
  monteCarloParams: any;
  cottonwoodHeights?: any;
}

interface ScenarioMetrics {
  irr: string;
  equityMultiple: string;
  totalCost: number;
  totalEquity: number;
  avgCashOnCash: string;
  yieldOnCost: string;
}

// Tooltip Component
const InfoTooltip: React.FC<{ content: string }> = ({ content }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block ml-1">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="text-gray-400 hover:text-gray-600"
      >
        <Info size={14} />
      </button>
      {show && (
        <div className="absolute z-10 w-64 p-2 text-sm text-white bg-gray-800 rounded-lg shadow-lg -top-2 left-6">
          {content}
          <div className="absolute w-2 h-2 bg-gray-800 transform rotate-45 -left-1 top-3"></div>
        </div>
      )}
    </div>
  );
};

// Debounce hook
const useDebounce = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// IndexedDB Helper Functions
const DB_NAME = 'RealEstateProFormaDB';
const DB_VERSION = 1;
const STORE_NAME = 'scenarios';

const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('isActive', 'isActive', { unique: false });
      }
    };
  });
};

const saveScenarioToDB = async (scenario: Scenario): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  await store.put(scenario);
};

const loadScenariosFromDB = async (): Promise<Scenario[]> => {
  const db = await initDB();
  const transaction = db.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  const request = store.getAll();
  
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const deleteScenarioFromDB = async (id: string): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  await store.delete(id);
};

export default function App() {
  // Property Types
  const propertyTypes: Record<string, PropertyType> = {
    office: { name: "Office", icon: Briefcase, color: "bg-yellow-500" },
    retail: { name: "Retail", icon: ShoppingCart, color: "bg-green-500" },
    apartment: { name: "Apartment", icon: Building, color: "bg-purple-500" },
    forSale: { name: "For-Sale", icon: Home, color: "bg-orange-500" },
    cottonwoodHeights: { name: "Cottonwood Heights", icon: Building2, color: "bg-indigo-500" },
  };

  // Initial State
  const [propertyType, setPropertyType] = useState("office");
  const [projectName, setProjectName] = useState("New Development Project");
  const [mode, setMode] = useState("simple"); // simple or detailed
  const [sensitivityVariable, setSensitivityVariable] = useState<
    "rent" | "construction" | "capRate" | "interestRate"
  >("rent");

  // Land & Site
  const [landCost, setLandCost] = useState(5000000);
  const [siteAreaAcres, setSiteAreaAcres] = useState(1);
  const [buildingGFA, setBuildingGFA] = useState(50000);
  const [parkingRatio, setParkingRatio] = useState(2.5);
  const [includeParking, setIncludeParking] = useState(true);
  const [parkingRevenue, setParkingRevenue] = useState({
    monthlyRate: 150,
    occupancy: 85,
    reserved: 50,
  });

  // Construction Costs
  const [hardCosts, setHardCosts] = useState({
    coreShell: 200,
    tenantImprovements: 50,
    siteWork: 500000,
    siteWorkPerUnit: 25000,
    siteWorkInputMethod: 'total' as 'total' | 'perUnit',
    parkingSurface: 5000,
    parkingStructured: 25000,
    landscaping: 10,
    landscapingEnabled: true,
    contingency: 5,
  });

  const [softCosts, setSoftCosts] = useState({
    architectureEngineering: 6,
    architectureEngineeringEnabled: true,
    permitsImpactFees: 15,
    permitsImpactFeesEnabled: true,
    legalAccounting: 0,
    legalAccountingEnabled: true,
    propertyTaxConstruction: 1.2,
    propertyTaxConstructionEnabled: true,
    insuranceConstruction: 0.5,
    insuranceConstructionEnabled: true,
    marketingLeasing: 0,
    marketingLeasingEnabled: true,
    constructionMgmtFee: 3,
    constructionMgmtFeeEnabled: true,
    developerFee: 4,
    developerFeeEnabled: true,
  });

  // Development Timeline
  const [timeline, setTimeline] = useState({
    preDevelopment: 6,
    construction: 24,
    leaseUp: 12,
  });

  // Financing
  const [constructionLoan, setConstructionLoan] = useState({
    enabled: true,
    ltc: 65,
    rate: 8.5,
    originationFee: 1,
    term: 24,
    avgOutstandingPercent: 60, // Make this editable instead of hardcoded 0.6
  });

  const [permanentLoan, setPermanentLoan] = useState({
    enabled: true,
    ltv: 70,
    rate: 6.5,
    amortization: 30,
    term: 10,
    ioPeriod: 0,
  });

  // Equity Structure
  const [equityStructure, setEquityStructure] = useState({
    lpEquity: 90,
    gpEquity: 10,
    preferredReturn: 8,
    gpCoinvest: 10,
    catchUp: true,
    catchUpPercentage: 50,
    clawback: true,
    sponsorPromote: 20,
  });

  // Waterfall Tiers
  const [waterfallTiers, setWaterfallTiers] = useState([
    { id: '1', minIRR: 0, maxIRR: 8, lpShare: 90, gpShare: 10 },
    { id: '2', minIRR: 8, maxIRR: 12, lpShare: 80, gpShare: 20 },
    { id: '3', minIRR: 12, maxIRR: 15, lpShare: 70, gpShare: 30 },
    { id: '4', minIRR: 15, maxIRR: 100, lpShare: 60, gpShare: 40 },
  ]);

  // Operating Assumptions
  const [operatingAssumptions, setOperatingAssumptions] = useState({
    rentPSF: 35,
    vacancy: 5,
    opex: 8,
    capRate: 6.5,
    rentGrowth: 3,
    expenseGrowth: 2.5,
    holdPeriod: 10,
    exitCosts: 2.0,
  });

  // Property-Specific Rent Escalations
  const [rentEscalations, setRentEscalations] = useState({
    office: {
      pattern: "stepped" as "stepped" | "annual",
      stepYears: 5,
      stepIncrease: 10,
      annualIncrease: 0,
    },
    retail: {
      pattern: "annual" as "stepped" | "annual",
      annualIncrease: 3,
      percentageRent: true,
      percentageThreshold: 5,
      salesPSF: 400,
    },
    apartment: {
      pattern: "annual" as "stepped" | "annual",
      annualIncrease: 3,
      lossToLease: 2,
      turnoverRate: 50,
      otherIncome: 50,
    },
  });

  // Apartment Specific
  const [unitMix, setUnitMix] = useState([
    { type: "Studio", units: 10, size: 500, rent: 1500, marketRent: 1550 },
    { type: "1BR", units: 30, size: 750, rent: 2000, marketRent: 2100 },
    { type: "2BR", units: 20, size: 1100, rent: 2800, marketRent: 2900 },
    { type: "3BR", units: 5, size: 1400, rent: 3500, marketRent: 3600 },
  ]);

  // For-Sale Specific
  const [salesAssumptions, setSalesAssumptions] = useState({
    totalUnits: 100,
    avgUnitSize: 1200,
    avgPricePerUnit: 750000,
    pricePerSF: 625,
    salesPace: 5,
    priceEscalation: 4,
    salesCommission: 5,
    marketingCost: 2,
    closingCosts: 1,
    presalesRequired: 30,
    depositStructure: [
      { milestone: "Contract", percentage: 10 },
      { milestone: "Construction Start", percentage: 5 },
      { milestone: "50% Complete", percentage: 5 },
      { milestone: "Closing", percentage: 80 },
    ],
  });

  // Land Parcels for Cottonwood Heights
  const [landParcels, setLandParcels] = useState([
    { id: 1, name: "Parcel 1", acres: 10, pricePerAcre: 400000, isDonated: false },
    { id: 2, name: "Parcel 2", acres: 5, pricePerAcre: 0, isDonated: true },
    { id: 3, name: "Parcel 3", acres: 5, pricePerAcre: 0, isDonated: true },
  ]);

  // Cottonwood Heights Site Work
  const [cottonwoodSiteWork, setCottonwoodSiteWork] = useState({
    totalCost: 1500000,
    includedItems: ['Grading and excavation', 'Utilities infrastructure', 'Street improvements', 'Landscaping allowance'],
    notes: ''
  });

  // Cottonwood Heights Mixed-Use Specific
  const [cottonwoodHeights, setCottonwoodHeights] = useState({
    // Ground Lease Structure
    groundLease: {
      enabled: true,
      byParcel: true, // Calculate ground lease by parcel
      acquisitionType: 'donation' as 'donation' | 'purchase',
      paymentStructure: 'percentage_noi' as 'percentage_revenue' | 'percentage_noi' | 'base_plus_percentage',
      baseRate: 0, // Annual base rent
      percentageRate: 0.15, // 15% as decimal
      escalation: {
        type: 'cpi' as 'cpi' | 'fixed',
        rate: 0.025, // 2.5% as decimal
        cap: 0.03, // 3% as decimal
      },
      validationRules: {
        revenueRange: { min: 0.01, max: 0.03 },
        noiRange: { min: 0.10, max: 0.25 },
      },
      parcelSettings: {
        retail: {
          enabled: true,
          percentageRate: 0.15,
          baseRate: 0,
        },
        grocery: {
          enabled: true,
          percentageRate: 0.12,
          baseRate: 0,
        },
        townhomes: {
          enabled: true,
          percentageRate: 0.10,
          baseRate: 0,
        },
      },
    } as GroundLeaseStructure,
    // Retail Component
    retail: {
      enabled: true,
      totalSF: 15000,
      hardCostPSF: 250,
      tiAllowance: 50,
      parkingRatio: 4, // per 1,000 SF
    },
    // Medical Office Component (96,000 SF)
    medicalOffice: {
      enabled: true,
      totalSF: 96000,
      rentableSF: 91200, // 95% efficiency
      hardCostPSF: 350,
      tiAllowance: 60,
      parkingRatio: 4.5, // per 1,000 SF
      baseRentPSF: 28,
      specialtyMix: [
        { type: 'general', squareFootage: 40000, rentPremium: 1.0 },
        { type: 'dental', squareFootage: 20000, rentPremium: 1.15 },
        { type: 'urgent-care', squareFootage: 16000, rentPremium: 1.2 },
        { type: 'diagnostic', squareFootage: 20000, rentPremium: 1.25 },
      ],
      vacancy: 5,
      opexPSF: 12,
    },
    // Grocery Anchor Component (16,000 SF)
    grocery: {
      enabled: true,
      totalSF: 16000,
      hardCostPSF: 200,
      tiAllowance: 100,
      parkingRatio: 5, // per 1,000 SF
      baseRentPSF: 20,
      percentageRent: {
        enabled: true,
        breakpoint: 500, // $/SF in sales
        rate: 6, // % above breakpoint
      },
      camContribution: 3, // $/SF annually
    },
    // Rental Townhomes (78 units)
    townhomes: {
      enabled: true,
      units: 78,
      avgSize: 3100,
      rentPerUnit: 4200,
      hardCostPSF: 180,
      vacancy: 5,
      opexPerUnit: 7500, // per unit per year
      annualRentGrowth: 3,
      operatingExpenseRatio: 40, // % of effective gross income
      unitMatrix: [] as UnitType[], // Unit mix details
    },
    // Parking Structure
    parking: {
      enabled: true,
      structuredSpaces: 850,
      surfaceSpaces: 200,
      structuredCostPerSpace: 25000,
      surfaceCostPerSpace: 5000,
      monthlyRevenue: 75, // per space for paid parking
      utilizationRate: 60, // % of spaces generating revenue
      // Parking assignments by component
      assignments: {
        retail: {
          requiredSpaces: 60,
          surfaceSpaces: 60,
          structuredSpaces: 0,
        },
        medicalOffice: {
          requiredSpaces: 432,
          surfaceSpaces: 100,
          structuredSpaces: 332,
        },
        grocery: {
          requiredSpaces: 80,
          surfaceSpaces: 40,
          structuredSpaces: 40,
        },
        townhomes: {
          requiredSpaces: 156,
          surfaceSpaces: 0,
          structuredSpaces: 156,
        },
        visitor: {
          requiredSpaces: 50,
          surfaceSpaces: 0,
          structuredSpaces: 50,
        },
      },
    },
    // Community Amphitheater
    amphitheater: {
      enabled: true,
      seats: 500,
      constructionCost: 2500000,
      annualEvents: 50,
      avgTicketPrice: 25,
      avgAttendanceRate: 75, // %
      annualMaintenanceCost: 150000,
    },
    // Construction Timeline
    medicalTimeline: {
      preDevelopment: 6,
      construction: 24,
      leaseUp: 18,
    },
    retailTimeline: {
      preDevelopment: 6,
      construction: 18,
      leaseUp: 12,
    },
    townhomeTimeline: {
      preDevelopment: 6,
      construction: 24,
      leaseUp: 6,
    },
    // TIF Structures by Component
    tif: {
      enabled: true,
      commercial: {
        captureRate: 75, // % of incremental taxes captured
        term: 20, // years
        baseAssessedValue: 15000000,
        taxRate: 1.2, // %
        discountRate: 5, // % for present value
      },
      grocery: {
        captureRate: 75,
        term: 20,
        baseAssessedValue: 3000000,
        taxRate: 1.2,
        discountRate: 5,
      },
      residential: {
        captureRate: 60,
        term: 15,
        baseAssessedValue: 8000000,
        taxRate: 1.0,
        discountRate: 5,
      },
    },
    // State Funding Sources
    stateFunding: {
      mixedUseDevelopmentGrant: {
        enabled: false,
        amount: 2000000,
        equityReductionFactor: 1.0,
      },
      infrastructureGapFinancing: {
        enabled: false,
        amount: 5000000,
        equityReductionFactor: 0.9,
      },
      marketRateHousingTrustFund: {
        enabled: false,
        amount: 1500000,
        equityReductionFactor: 1.0,
      },
    },
    // City Development Fee (optional)
    cityDevelopmentFee: {
      enabled: false,
      amount: 1000000,
      timing: 'closing' as 'closing' | 'phased',
    },
  });

  const [salesPhasing, setSalesPhasing] = useState([
    { phase: 1, units: 40, startMonth: 0, deliveryMonth: 24 },
    { phase: 2, units: 30, startMonth: 6, deliveryMonth: 30 },
    { phase: 3, units: 30, startMonth: 12, deliveryMonth: 36 },
  ]);

  // Cottonwood Heights Tenants
  const [cottonwoodTenants, setCottonwoodTenants] = useState({
    retail: [
      {
        id: 1,
        name: "Retail Tenant 1",
        sf: 5000,
        rentPSF: 35,
        term: 10,
        freeRent: 3,
        tiPSF: 40,
        startMonth: 0,
        renewalProbability: 80,
        percentageRent: true,
        percentageRate: 6,
        breakpoint: 350, // $/SF in sales for percentage rent to kick in
      },
    ],
    grocery: [
      {
        id: 1,
        name: "Anchor Grocery",
        sf: 45000,
        rentPSF: 20,
        term: 15,
        freeRent: 6,
        tiPSF: 100,
        startMonth: 0,
        renewalProbability: 90,
        percentageRent: true,
        percentageRate: 2,
        breakpoint: 500,
      },
    ],
  });

  // Cottonwood Heights Separate Financing
  const [cottonwoodFinancing, setCottonwoodFinancing] = useState({
    // Retail/Commercial Financing
    retailConstruction: {
      enabled: true,
      ltc: 65,
      rate: 8.5,
      originationFee: 1,
      term: 18,
      avgOutstandingPercent: 60,
    },
    retailPermanent: {
      enabled: true,
      ltv: 70,
      rate: 6.5,
      amortization: 30,
      term: 10,
      ioPeriod: 0,
      exitCapRate: 7.5,
    },
    // Townhome Financing
    townhomeConstruction: {
      enabled: true,
      ltc: 70,
      rate: 8.0,
      originationFee: 1,
      term: 24,
      avgOutstandingPercent: 60,
    },
    townhomePermanent: {
      enabled: true,
      ltv: 75,
      rate: 6.0,
      amortization: 30,
      term: 10,
      ioPeriod: 0,
      exitCapRate: 5.5,
    },
  });

  // Cottonwood Heights Shared Equity Structure
  const [cottonwoodEquity, setCottonwoodEquity] = useState({
    // Investor Structure
    investors: [
      {
        id: '1',
        name: 'Lead Institutional Investor',
        equityContribution: 40, // % of total equity
        preferredReturn: 8,
        profitShare: [90, 80, 70, 60], // Waterfall profit shares
      },
      {
        id: '2',
        name: 'State Pension Fund',
        equityContribution: 30,
        preferredReturn: 7,
        profitShare: [90, 80, 70, 60],
      },
      {
        id: '3',
        name: 'Local Impact Investor',
        equityContribution: 20,
        preferredReturn: 6,
        profitShare: [90, 80, 70, 60],
      },
      {
        id: '4',
        name: 'Sponsor/GP',
        equityContribution: 10,
        preferredReturn: 0,
        profitShare: [10, 20, 30, 40], // Promote structure
      },
    ],
    // Waterfall Tiers
    waterfallEnabled: true,
    waterfall: [
      { id: '1', threshold: 'Return of Capital', minIRR: 0, maxIRR: 0 },
      { id: '2', threshold: 'Preferred Return', minIRR: 0, maxIRR: 8 },
      { id: '3', threshold: 'Tier 1 Promote', minIRR: 8, maxIRR: 12 },
      { id: '4', threshold: 'Tier 2 Promote', minIRR: 12, maxIRR: 15 },
      { id: '5', threshold: 'Tier 3 Promote', minIRR: 15, maxIRR: 100 },
    ],
    // Cross-collateralization settings
    crossCollateralization: true,
    componentAllocation: {
      medicalOffice: 45, // % of total project
      grocery: 10,
      townhomes: 35,
      parking: 8,
      amphitheater: 2,
    },
  });

  // Cottonwood Heights State Funding
  const [cottonwoodStateFunding, setCottonwoodStateFunding] = useState<StateFundingStructure>({
    enabled: true,
    sources: [], // Will be populated by StateFundingSection component
  });

  // Office & Retail Specific
  const [tenants, setTenants] = useState([
    {
      name: "Anchor Tenant",
      sf: 20000,
      rentPSF: 35,
      term: 10,
      freeRent: 6,
      tiPSF: 50,
      startMonth: 0,
      renewalProbability: 80,
      percentageRent: false,
      breakpoint: 0,
    },
    {
      name: "Tenant 2",
      sf: 10000,
      rentPSF: 38,
      term: 7,
      freeRent: 3,
      tiPSF: 40,
      startMonth: 3,
      renewalProbability: 70,
      percentageRent: false,
      breakpoint: 0,
    },
    {
      name: "Tenant 3",
      sf: 8000,
      rentPSF: 40,
      term: 5,
      freeRent: 2,
      tiPSF: 35,
      startMonth: 6,
      renewalProbability: 60,
      percentageRent: false,
      breakpoint: 0,
    },
  ]);

  const [leasingAssumptions, setLeasingAssumptions] = useState({
    brokerCommission: 6,
    renewalProbability: 75,
    marketLeaseUpMonths: 6,
    annualEscalations: 3,
    stabilizedCapRate: 6.0,
    renewalCommission: 3,
  });

  // Risk Analysis
  const [scenarioAssumptions, setScenarioAssumptions] = useState({
    baseCase: {
      probability: 50,
      rentAdjustment: 0,
      costAdjustment: 0,
      capRateAdjustment: 0,
    },
    upside: {
      probability: 25,
      rentAdjustment: 10,
      costAdjustment: -5,
      capRateAdjustment: -50,
    },
    downside: {
      probability: 25,
      rentAdjustment: -10,
      costAdjustment: 10,
      capRateAdjustment: 50,
    },
  });

  const [monteCarloParams, setMonteCarloParams] = useState({
    iterations: 1000,
    rentVolatility: 10,
    costVolatility: 5,
    capRateVolatility: 50,
  });

  // Saved Scenarios (v1 compatibility)
  const [savedScenarios, setSavedScenarios] = useState<any[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  
  // v2 Scenario Management
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [showScenarioManager, setShowScenarioManager] = useState(false);
  const [showScenarioComparison, setShowScenarioComparison] = useState(false);
  const [comparisonScenarios, setComparisonScenarios] = useState<string[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
  const [editingScenarioName, setEditingScenarioName] = useState<string>("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Use ref to avoid stale closures in interval
  const scenariosRef = useRef(scenarios);
  useEffect(() => {
    scenariosRef.current = scenarios;
  }, [scenarios]);
  
  // IRR Breakdown Modal
  const [showIRRBreakdown, setShowIRRBreakdown] = useState(false);

  // Validation State
  const [validationWarnings, setValidationWarnings] = useState<any[]>([]);

  // Expanded sections state
  const [expandedSections, setExpandedSections] = useState({
    land: true,
    construction: true,
    financing: true,
    equity: true,
    operations: true,
    analysis: true,
    unitMix: true,
    salesAssumptions: true,
    rentRoll: true,
    retailFeatures: true,
    officeFeatures: true,
    riskAnalysis: false,
    distributions: false,
    validation: false,
    waterfall: true,
    cashflow: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Metric breakdown states
  const [activeMetricBreakdown, setActiveMetricBreakdown] = useState<string | null>(null);
  
  // API Key Modal state
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  
  // Mobile menu state
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Site work states
  const [siteWorkValidation, setSiteWorkValidation] = useState<string | null>(null);
  const [showSiteWorkTooltip, setShowSiteWorkTooltip] = useState(false);
  
  // Waterfall section visibility
  const [showWaterfallSection, setShowWaterfallSection] = useState(true);

  // Format currency
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined || !isFinite(value)) return "$0";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format number with commas
  const formatNumber = (value: number | null | undefined) => {
    if (value === null || value === undefined || !isFinite(value)) return "0";
    return new Intl.NumberFormat("en-US").format(value);
  };

  // Parse formatted number
  const parseFormattedNumber = (value: string | number) => {
    if (typeof value === "number") return value;
    const parsed = Number(value.toString().replace(/,/g, ""));
    return isNaN(parsed) ? 0 : parsed;
  };

  // Handle formatted input
  const handleFormattedInput = (
    value: string,
    setter: (value: number) => void
  ) => {
    const parsed = parseFormattedNumber(value);
    setter(parsed);
  };

  // Helper function to get total unit count based on property type
  const getTotalUnitCount = () => {
    if (propertyType === 'forSale') {
      // For for-sale, use salesAssumptions.totalUnits directly
      // unitMix is only for apartment properties
      return Math.max(1, salesAssumptions.totalUnits || 1);
    } else if (propertyType === 'apartment') {
      return unitMix.reduce((sum, unit) => sum + unit.units, 0);
    }
    return 1; // For office/retail
  };

  // Smart detection for when to show per-unit option
  const shouldShowPerUnitOption = () => {
    // Show per-unit option for residential property types
    return ['forSale', 'apartment'].includes(propertyType);
  };

  // Update site work total when unit count changes in per-unit mode
  useEffect(() => {
    if (hardCosts.siteWorkInputMethod === 'perUnit' && shouldShowPerUnitOption()) {
      const totalUnits = getTotalUnitCount();
      setHardCosts(prev => ({
        ...prev,
        siteWork: prev.siteWorkPerUnit * totalUnits
      }));
    }
  }, [unitMix, salesAssumptions.totalUnits, hardCosts.siteWorkInputMethod, hardCosts.siteWorkPerUnit, propertyType]);

  // Debounced values for expensive calculations
  const debouncedLandCost = useDebounce(landCost, 300);
  const debouncedBuildingGFA = useDebounce(buildingGFA, 300);
  const debouncedHardCosts = useDebounce(hardCosts, 300);
  const debouncedSoftCosts = useDebounce(softCosts, 300);
  const debouncedOperatingAssumptions = useDebounce(operatingAssumptions, 300);
  const debouncedEquityStructure = useDebounce(equityStructure, 200);

  // Calculate total land cost including parcels
  const calculateLandCost = useMemo(() => {
    if (propertyType === "cottonwoodHeights") {
      const totalFromParcels = (landParcels || []).reduce((total, parcel) => {
        return total + (parcel.isDonated ? 0 : parcel.acres * parcel.pricePerAcre);
      }, 0);
      return totalFromParcels;
    }
    return landCost;
  }, [propertyType, landParcels, landCost]);

  // Calculate effective site area (for Cottonwood Heights, use parcels total)
  const effectiveSiteAreaAcres = useMemo(() => {
    if (propertyType === "cottonwoodHeights") {
      return (landParcels || []).reduce((sum, parcel) => sum + parcel.acres, 0);
    }
    return siteAreaAcres;
  }, [propertyType, landParcels, siteAreaAcres]);

  // Calculate Total Development Cost
  const calculateTotalCost = useMemo(() => {
    try {
      const siteAreaSF = Math.max(0, effectiveSiteAreaAcres * 43560);
      const parkingSpaces = includeParking
        ? Math.round((buildingGFA / 1000) * parkingRatio)
        : 0;

      let hardCostTotal;
      if (propertyType === "cottonwoodHeights") {
        // Calculate costs separately for each component
        let medicalOfficeCost = 0;
        let groceryCost = 0;
        let townhomeCost = 0;
        let parkingCost = 0;
        let amphitheaterCost = 0;
        
        // Medical Office costs (96,000 SF)
        if (cottonwoodHeights.medicalOffice.enabled) {
          const medicalSF = cottonwoodHeights.medicalOffice.totalSF;
          medicalOfficeCost = medicalSF * cottonwoodHeights.medicalOffice.hardCostPSF;
          const medicalParking = Math.round((medicalSF / 1000) * cottonwoodHeights.medicalOffice.parkingRatio);
          parkingCost += medicalParking * hardCosts.parkingStructured;
        }
        
        // Grocery costs (16,000 SF)
        if (cottonwoodHeights.grocery.enabled) {
          const grocerySF = cottonwoodHeights.grocery.totalSF;
          groceryCost = grocerySF * cottonwoodHeights.grocery.hardCostPSF;
          const groceryParking = Math.round((grocerySF / 1000) * cottonwoodHeights.grocery.parkingRatio);
          parkingCost += groceryParking * hardCosts.parkingStructured;
        }
        
        // Townhome costs (78 units)
        if (cottonwoodHeights.townhomes.enabled) {
          const townhomeSF = cottonwoodHeights.townhomes.units * cottonwoodHeights.townhomes.avgSize;
          townhomeCost = townhomeSF * cottonwoodHeights.townhomes.hardCostPSF;
        }
        
        // Parking Structure costs (using new assignment system)
        if (cottonwoodHeights.parking.enabled) {
          // Calculate total surface and structured spaces from assignments
          const totalSurfaceSpaces = Object.values(cottonwoodHeights.parking.assignments).reduce((sum, comp) => sum + comp.surfaceSpaces, 0);
          const totalStructuredSpaces = Object.values(cottonwoodHeights.parking.assignments).reduce((sum, comp) => sum + comp.structuredSpaces, 0);
          
          // Calculate costs
          const structuredParkingCost = totalStructuredSpaces * cottonwoodHeights.parking.structuredCostPerSpace;
          const surfaceParkingCost = totalSurfaceSpaces * cottonwoodHeights.parking.surfaceCostPerSpace;
          parkingCost = structuredParkingCost + surfaceParkingCost;
        }
        
        // Community Amphitheater
        if (cottonwoodHeights.amphitheater.enabled) {
          amphitheaterCost = cottonwoodHeights.amphitheater.constructionCost;
        }
        
        // Site work and landscaping
        const siteWorkCost = cottonwoodSiteWork.totalCost;
        const landscapingCost = hardCosts.landscapingEnabled ? hardCosts.landscaping * siteAreaSF : 0;
        
        // Calculate base hard cost total
        hardCostTotal = medicalOfficeCost + groceryCost + townhomeCost + parkingCost + amphitheaterCost + siteWorkCost + landscapingCost;
        
        // Apply state funding contributions (reduce hard costs)
        let stateFundingReduction = 0;
        if (cottonwoodHeights.stateFunding.mixedUseDevelopmentGrant.enabled) {
          stateFundingReduction += cottonwoodHeights.stateFunding.mixedUseDevelopmentGrant.amount;
        }
        if (cottonwoodHeights.stateFunding.infrastructureGapFinancing.enabled) {
          stateFundingReduction += cottonwoodHeights.stateFunding.infrastructureGapFinancing.amount;
        }
        if (cottonwoodHeights.stateFunding.marketRateHousingTrustFund.enabled) {
          stateFundingReduction += cottonwoodHeights.stateFunding.marketRateHousingTrustFund.amount;
        }
        
        hardCostTotal -= stateFundingReduction;
        
        // Ensure hard cost doesn't go negative
        hardCostTotal = Math.max(0, hardCostTotal);
      } else if (propertyType === "forSale") {
        // Use unit mix for unit count
        const totalUnits = getTotalUnitCount();
        const totalSF = totalUnits * salesAssumptions.avgUnitSize;
        
        // Calculate site work based on input method
        let siteWorkBase = hardCosts.siteWork;
        if (hardCosts.siteWorkInputMethod === 'perUnit') {
          siteWorkBase = hardCosts.siteWorkPerUnit * totalUnits;
        }
        
        // Calculate parking cost
        const parkingCost = includeParking 
          ? parkingSpaces * hardCosts.parkingSurface 
          : 0;
        
        // Calculate landscaping cost
        const landscapingCost = hardCosts.landscapingEnabled 
          ? hardCosts.landscaping * siteAreaSF 
          : 0;
        
        // Site work includes base site work, parking and landscaping
        const totalSiteWork = siteWorkBase + parkingCost + landscapingCost;
        
        hardCostTotal =
          (hardCosts.coreShell + hardCosts.tenantImprovements) * totalSF +
          totalSiteWork;
      } else {
        // Calculate parking cost
        const parkingCost = includeParking 
          ? parkingSpaces * hardCosts.parkingSurface 
          : 0;
        
        // Calculate landscaping cost
        const landscapingCost = hardCosts.landscapingEnabled 
          ? hardCosts.landscaping * siteAreaSF 
          : 0;
        
        // Site work includes parking and landscaping
        const totalSiteWork = hardCosts.siteWork + parkingCost + landscapingCost;
        
        hardCostTotal =
          (hardCosts.coreShell + hardCosts.tenantImprovements) * buildingGFA +
          totalSiteWork;
      }

      const hardCostWithContingency =
        hardCostTotal * (1 + hardCosts.contingency / 100);

      const softCostTotal =
        (softCosts.architectureEngineeringEnabled 
          ? (hardCostWithContingency * softCosts.architectureEngineering) / 100 
          : 0) +
        (softCosts.permitsImpactFeesEnabled 
          ? buildingGFA * softCosts.permitsImpactFees 
          : 0) +
        (softCosts.legalAccountingEnabled 
          ? softCosts.legalAccounting 
          : 0) +
        (softCosts.propertyTaxConstructionEnabled 
          ? (calculateLandCost * softCosts.propertyTaxConstruction) / 100 
          : 0) +
        (softCosts.insuranceConstructionEnabled 
          ? (hardCostWithContingency * softCosts.insuranceConstruction) / 100 
          : 0) +
        (softCosts.marketingLeasingEnabled 
          ? softCosts.marketingLeasing 
          : 0) +
        (softCosts.constructionMgmtFeeEnabled 
          ? (hardCostWithContingency * softCosts.constructionMgmtFee) / 100 
          : 0);

      const totalBeforeDeveloperFee =
        calculateLandCost + hardCostWithContingency + softCostTotal;
      const developerFee = softCosts.developerFeeEnabled
        ? (totalBeforeDeveloperFee * softCosts.developerFee) / 100
        : 0;

      return {
        hardCost: hardCostWithContingency,
        softCost: softCostTotal,
        developerFee: developerFee,
        total: totalBeforeDeveloperFee + developerFee,
        parkingSpaces: parkingSpaces,
        siteAreaSF: siteAreaSF,
      };
    } catch (e) {
      console.error("Error calculating total cost:", e);
      return {
        hardCost: 0,
        softCost: 0,
        developerFee: 0,
        total: 0,
        parkingSpaces: 0,
        siteAreaSF: 0,
      };
    }
  }, [
    calculateLandCost,
    debouncedHardCosts,
    debouncedSoftCosts,
    debouncedBuildingGFA,
    parkingRatio,
    siteAreaAcres,
    includeParking,
    propertyType,
    salesAssumptions,
    cottonwoodHeights,
  ]);

  // Calculate Financing
  const calculateFinancing = useMemo(() => {
    try {
      const constructionLoanAmount = constructionLoan.enabled
        ? (calculateTotalCost.total * constructionLoan.ltc) / 100
        : 0;
      const avgOutstandingBalance = constructionLoan.enabled
        ? constructionLoanAmount * (constructionLoan.avgOutstandingPercent / 100)
        : 0;
      const constructionMonths = timeline.construction;
      const monthlyRate = constructionLoan.enabled && constructionLoan.rate > 0
        ? constructionLoan.rate / 100 / 12
        : 0;
      const constructionInterest = constructionLoan.enabled
        ? avgOutstandingBalance * monthlyRate * constructionMonths
        : 0;
      const loanFees = constructionLoan.enabled
        ? (constructionLoanAmount * constructionLoan.originationFee) / 100
        : 0;

      const totalProjectCost =
        calculateTotalCost.total + constructionInterest + loanFees;
      const equityRequired = totalProjectCost - constructionLoanAmount;

      // Calculate equity amounts based on LP/GP split
      const lpEquityPercent = debouncedEquityStructure.lpEquity / 100;
      const gpEquityPercent = debouncedEquityStructure.gpEquity / 100;
      
      // GP co-invest is only relevant if GP has equity participation
      const gpCoinvestAmount = gpEquityPercent > 0 
        ? (equityRequired * gpEquityPercent * debouncedEquityStructure.gpCoinvest / 100)
        : 0;
      
      // Calculate the actual LP and GP amounts
      const lpEquityAmount = equityRequired * lpEquityPercent;
      const gpPromoteEquity = equityRequired * gpEquityPercent - gpCoinvestAmount;

      return {
        constructionLoanAmount,
        constructionInterest,
        loanFees,
        totalProjectCost,
        equityRequired,
        lpEquity: Math.max(0, lpEquityAmount),
        gpEquity: Math.max(0, gpPromoteEquity),
        gpCoinvest: Math.max(0, gpCoinvestAmount),
        totalGPCommitment: Math.max(0, gpPromoteEquity + gpCoinvestAmount),
        avgOutstandingBalance,
        constructionMonths,
      };
    } catch (e) {
      console.error("Error calculating financing:", e);
      return {
        constructionLoanAmount: 0,
        constructionInterest: 0,
        loanFees: 0,
        totalProjectCost: 0,
        equityRequired: 0,
        lpEquity: 0,
        gpEquity: 0,
        gpCoinvest: 0,
        totalGPCommitment: 0,
        avgOutstandingBalance: 0,
        constructionMonths: 0,
      };
    }
  }, [calculateTotalCost, constructionLoan, debouncedEquityStructure, timeline]);

  // Calculate NOI and Cash Flows
  const calculateCashFlows = useMemo(() => {
    try {
      const cashFlows: CashFlowData[] = [];
      let currentRent = debouncedOperatingAssumptions.rentPSF;
      let currentExpenses = debouncedOperatingAssumptions.opex;

      const escalationKey = propertyType as keyof typeof rentEscalations;
      const escalation =
        rentEscalations[escalationKey] || rentEscalations.office;

      if (propertyType === "cottonwoodHeights") {
        // Cottonwood Heights Mixed-Use Calculations
        cashFlows.push({
          year: 0,
          rent: 0,
          expenses: 0,
          noi: 0,
          debtService: 0,
          cashFlow: -calculateFinancing.equityRequired,
          cumulativeCashFlow: -calculateFinancing.equityRequired,
        });

        // Calculate combined commercial NOI from tenants
        let commercialNOI = 0;
        let commercialRevenue = 0;
        let retailRevenue = 0;
        let groceryRevenue = 0;
        
        // Calculate retail NOI from all retail tenants
        if (cottonwoodHeights.retail.enabled) {
          cottonwoodTenants.retail.forEach(tenant => {
            const tenantRevenue = tenant.sf * tenant.rentPSF * 12 * (1 - 5 / 100); // Annual revenue with 5% vacancy
            const tenantExpenses = tenant.sf * 7 * 12; // Annual expenses at $7/SF
            retailRevenue += tenantRevenue;
            commercialNOI += tenantRevenue - tenantExpenses;
          });
          commercialRevenue += retailRevenue;
        }
        
        // Calculate grocery NOI from all grocery tenants
        if (cottonwoodHeights.grocery.enabled) {
          cottonwoodTenants.grocery.forEach(tenant => {
            const tenantRevenue = tenant.sf * tenant.rentPSF * 12 * (1 - 0 / 100); // Annual revenue with 0% vacancy for grocery
            const tenantExpenses = tenant.sf * 5 * 12; // Annual expenses at $5/SF
            groceryRevenue += tenantRevenue;
            commercialNOI += tenantRevenue - tenantExpenses;
          });
        }

        // Calculate townhome rental NOI
        let townhomeNOI = 0;
        let townhomeRevenue = 0;
        if (cottonwoodHeights.townhomes.enabled) {
          townhomeRevenue = cottonwoodHeights.townhomes.units * cottonwoodHeights.townhomes.rentPerUnit * 12 * (1 - cottonwoodHeights.townhomes.vacancy / 100);
          const townhomeExpenses = cottonwoodHeights.townhomes.units * cottonwoodHeights.townhomes.opexPerUnit;
          townhomeNOI = townhomeRevenue - townhomeExpenses;
        }

        // Calculate TIF revenue (with division by zero protection)
        const estimatedValue = commercialNOI > 0 && operatingAssumptions.capRate > 0 ? 
          commercialNOI / (operatingAssumptions.capRate / 100) : 0;
        const incrementalValue = Math.max(0, estimatedValue - cottonwoodHeights.tif.commercial.baseAssessedValue);
        const annualTIF = cottonwoodHeights.tif.enabled ? 
          (incrementalValue * cottonwoodHeights.tif.commercial.taxRate / 100 * cottonwoodHeights.tif.commercial.captureRate / 100) : 0;

        // Calculate permanent loan amount based on stabilized NOI (with division by zero protection)
        const stabilizedNOI = commercialNOI + townhomeNOI;
        const permanentLoanAmount = permanentLoan.enabled && stabilizedNOI > 0 && operatingAssumptions.capRate > 0 ?
          (stabilizedNOI / (operatingAssumptions.capRate / 100)) * (permanentLoan.ltv / 100) : 0;

        // Generate cash flows for hold period
        for (let year = 1; year <= operatingAssumptions.holdPeriod; year++) {
          const yearNOI = commercialNOI + townhomeNOI;
          const yearTIF = year <= cottonwoodHeights.tif.commercial.term ? annualTIF : 0;
          
          // No townhome sales - they are rental units
          const townhomeSales = 0;

          // Use actual gross revenue for ground lease calculation
          const grossRevenue = commercialRevenue + townhomeRevenue;
          
          // Calculate ground lease payment
          let groundLeasePayment = 0;
          if (cottonwoodHeights.groundLease.enabled) {
            if (cottonwoodHeights.groundLease.byParcel && cottonwoodHeights.groundLease.parcelSettings) {
              // Calculate ground lease by parcel
              if (cottonwoodHeights.groundLease.parcelSettings.retail?.enabled && cottonwoodHeights.retail.enabled) {
                const retailNOI = retailRevenue - (retailRevenue * 0.3); // Assuming 30% opex for retail
                const retailPayment = retailNOI * cottonwoodHeights.groundLease.parcelSettings.retail.percentageRate;
                groundLeasePayment += retailPayment;
              }
              if (cottonwoodHeights.groundLease.parcelSettings.grocery?.enabled && cottonwoodHeights.grocery.enabled) {
                const groceryNOI = groceryRevenue - (groceryRevenue * 0.25); // Assuming 25% opex for grocery
                const groceryPayment = groceryNOI * cottonwoodHeights.groundLease.parcelSettings.grocery.percentageRate;
                groundLeasePayment += groceryPayment;
              }
              if (cottonwoodHeights.groundLease.parcelSettings.townhomes?.enabled && cottonwoodHeights.townhomes.enabled) {
                const townhomePayment = townhomeNOI * cottonwoodHeights.groundLease.parcelSettings.townhomes.percentageRate;
                groundLeasePayment += townhomePayment;
              }
            } else {
              // Calculate ground lease for entire project
              const groundLeaseCalc = new GroundLeaseCalculator(cottonwoodHeights.groundLease);
              const payment = groundLeaseCalc.calculateAnnualPayment(year, grossRevenue, yearNOI);
              groundLeasePayment = payment.totalPayment;
            }
          }
          
          // Calculate state funding (typically in early years)
          let stateFundingAmount = 0;
          if (cottonwoodStateFunding.enabled && year <= 3) {
            cottonwoodStateFunding.sources.forEach(source => {
              if (source.enabled) {
                if (source.disbursementSchedule === 'upfront' && year === 1) {
                  stateFundingAmount += source.amount;
                } else if (source.disbursementSchedule === 'milestone' && year <= 3) {
                  stateFundingAmount += source.amount / 3;
                } else if (source.disbursementSchedule === 'completion' && year === 3) {
                  stateFundingAmount += source.amount;
                }
              }
            });
          }

          const totalCashFlow = yearNOI + yearTIF + townhomeSales + stateFundingAmount - groundLeasePayment;
          
          // Calculate debt service
          const debtService = permanentLoan.enabled && permanentLoanAmount > 0 && permanentLoan.rate > 0 ?
            permanentLoanAmount * (permanentLoan.rate / 100) : 0;

          cashFlows.push({
            year,
            rent: 0,
            expenses: 0,
            noi: yearNOI,
            debtService,
            cashFlow: totalCashFlow - debtService,
            cumulativeCashFlow: (cashFlows[year - 1]?.cumulativeCashFlow || 0) + (totalCashFlow - debtService),
            grossRevenue: grossRevenue,
            operatingExpenses: 0,
            tifRevenue: yearTIF,
            groundLeasePayment: groundLeasePayment,
            stateFunding: stateFundingAmount,
          });
        }

        // Calculate exit value for Cottonwood Heights (with division by zero protection)
        const exitNOI = commercialNOI + townhomeNOI;
        const salePrice = operatingAssumptions.capRate > 0 && exitNOI > 0 ? 
          exitNOI / (operatingAssumptions.capRate / 100) : 0;
        const exitCosts = salePrice * (operatingAssumptions.exitCosts / 100);
        const exitProceeds = salePrice - exitCosts - permanentLoanAmount;

        if (cashFlows[operatingAssumptions.holdPeriod]) {
          cashFlows[operatingAssumptions.holdPeriod].cashFlow += exitProceeds;
          cashFlows[operatingAssumptions.holdPeriod].salePrice = salePrice;
          cashFlows[operatingAssumptions.holdPeriod].exitProceeds = exitProceeds;
        }

        return { cashFlows, permanentLoanAmount, year1NOI: commercialNOI + townhomeNOI };
      } else if (propertyType === "forSale") {
        cashFlows.push({
          year: 0,
          rent: 0,
          expenses: 0,
          noi: 0,
          debtService: 0,
          cashFlow: -calculateFinancing.equityRequired,
          cumulativeCashFlow: -calculateFinancing.equityRequired,
        });

        let totalRevenue = 0;
        let cumulativeCashFlow = -calculateFinancing.equityRequired;

        for (let month = 1; month <= 60; month++) {
          const year = Math.ceil(month / 12);

          let monthlyRevenue = 0;
          let monthlyClosings = 0;

          salesPhasing.forEach((phase) => {
            if (month >= phase.startMonth && month < phase.deliveryMonth) {
              const monthsSinceStart = month - phase.startMonth;
              const unitsSoldThisMonth = Math.min(
                salesAssumptions.salesPace,
                Math.max(
                  0,
                  phase.units -
                    (monthsSinceStart - 1) * salesAssumptions.salesPace
                )
              );

              if (unitsSoldThisMonth > 0) {
                const depositPercentage = salesAssumptions.depositStructure
                  .filter((d) => d.milestone !== "Closing")
                  .reduce((sum, d) => sum + d.percentage, 0);
                const pricePerUnit =
                  salesAssumptions.avgPricePerUnit *
                  Math.pow(
                    1 + salesAssumptions.priceEscalation / 100,
                    (month - 1) / 12
                  );
                monthlyRevenue +=
                  unitsSoldThisMonth * pricePerUnit * (depositPercentage / 100);
              }
            } else if (month >= phase.deliveryMonth) {
              const closingMonth = month - phase.deliveryMonth;
              if (
                closingMonth <
                Math.ceil(phase.units / salesAssumptions.salesPace)
              ) {
                const unitsClosingThisMonth = Math.min(
                  salesAssumptions.salesPace,
                  Math.max(
                    0,
                    phase.units - closingMonth * salesAssumptions.salesPace
                  )
                );
                if (unitsClosingThisMonth > 0) {
                  monthlyClosings += unitsClosingThisMonth;
                  const pricePerUnit =
                    salesAssumptions.avgPricePerUnit *
                    Math.pow(
                      1 + salesAssumptions.priceEscalation / 100,
                      (phase.startMonth + closingMonth) / 12
                    );
                  const closingPercentage =
                    salesAssumptions.depositStructure.find(
                      (d) => d.milestone === "Closing"
                    )?.percentage || 80;
                  monthlyRevenue +=
                    unitsClosingThisMonth *
                    pricePerUnit *
                    (closingPercentage / 100);
                }
              }
            }
          });

          const monthlyCosts =
            (monthlyRevenue *
              (salesAssumptions.salesCommission +
                salesAssumptions.marketingCost +
                salesAssumptions.closingCosts)) /
            100;
          const netRevenue = monthlyRevenue - monthlyCosts;

          let debtService = 0;
          if (month <= timeline.construction) {
            debtService =
              calculateFinancing.constructionLoanAmount *
              (constructionLoan.rate / 100 / 12);
          }

          const monthlyCashFlow = netRevenue - debtService;
          totalRevenue += monthlyRevenue;
          cumulativeCashFlow += monthlyCashFlow;

          if (month % 12 === 0 || month === 60) {
            cashFlows.push({
              year: year,
              rent: 0,
              expenses: monthlyCosts,
              noi: netRevenue,
              debtService: debtService * 12,
              cashFlow: monthlyCashFlow * (month % 12 === 0 ? 12 : month % 12),
              cumulativeCashFlow: cumulativeCashFlow,
              grossRevenue:
                monthlyRevenue * (month % 12 === 0 ? 12 : month % 12),
            });
          }
        }

        return { cashFlows, permanentLoanAmount: 0, year1NOI: 0 };
      }

      const year1EffectiveRent =
        currentRent * (1 - debouncedOperatingAssumptions.vacancy / 100);
      const year1GrossRevenue =
        year1EffectiveRent *
        debouncedBuildingGFA *
        (propertyType === "apartment" ? 12 : 1);

      let year1ParkingRevenue = 0;
      if (includeParking && calculateTotalCost.parkingSpaces > 0) {
        const monthlyParkingRevenue =
          calculateTotalCost.parkingSpaces *
            (parkingRevenue.reserved / 100) *
            parkingRevenue.monthlyRate +
          calculateTotalCost.parkingSpaces *
            ((100 - parkingRevenue.reserved) / 100) *
            parkingRevenue.monthlyRate *
            (parkingRevenue.occupancy / 100);
        year1ParkingRevenue = monthlyParkingRevenue * 12;
      }

      let year1OtherIncome = 0;
      if (propertyType === "apartment") {
        const totalUnits = unitMix.reduce((sum, u) => sum + u.units, 0);
        year1OtherIncome =
          rentEscalations.apartment.otherIncome * totalUnits * 12;
      }

      const year1TotalRevenue =
        year1GrossRevenue + year1ParkingRevenue + year1OtherIncome;
      const year1OperatingExpenses =
        currentExpenses *
        (propertyType === "apartment"
          ? unitMix.reduce((sum, u) => sum + u.units, 0)
          : buildingGFA);
      const year1NOI = year1TotalRevenue - year1OperatingExpenses;

      const stabilizedValue =
        debouncedOperatingAssumptions.capRate > 0 && year1NOI > 0
          ? year1NOI / (debouncedOperatingAssumptions.capRate / 100)
          : 0;
      const permanentLoanAmount = permanentLoan.enabled
        ? (stabilizedValue * permanentLoan.ltv) / 100
        : 0;

      cashFlows.push({
        year: 0,
        rent: 0,
        expenses: 0,
        noi: 0,
        debtService: 0,
        cashFlow: -calculateFinancing.equityRequired,
        cumulativeCashFlow: -calculateFinancing.equityRequired,
      });

      for (
        let year = 1;
        year <= debouncedOperatingAssumptions.holdPeriod;
        year++
      ) {
        if (
          propertyType === "office" &&
          escalation &&
          "stepYears" in escalation
        ) {
          if (
            escalation.pattern === "stepped" &&
            year > 1 &&
            (year - 1) % escalation.stepYears === 0
          ) {
            currentRent *= 1 + escalation.stepIncrease / 100;
          } else if (escalation.pattern === "annual" && year > 1) {
            currentRent *= 1 + escalation.annualIncrease / 100;
          }
        } else if (
          propertyType === "retail" &&
          escalation &&
          "salesPSF" in escalation
        ) {
          if (year > 1) {
            currentRent *= 1 + escalation.annualIncrease / 100;
          }
        } else if (
          propertyType === "apartment" &&
          escalation &&
          "lossToLease" in escalation
        ) {
          if (year > 1) {
            const marketIncrease =
              currentRent * (1 + escalation.annualIncrease / 100);
            const effectiveTurnover = escalation.turnoverRate / 100;
            const renewalRent =
              currentRent * (1 + escalation.annualIncrease / 100);
            const newLeaseRent =
              marketIncrease * (1 - escalation.lossToLease / 100);
            currentRent =
              renewalRent * (1 - effectiveTurnover) +
              newLeaseRent * effectiveTurnover;
          }
        } else {
          if (year > 1) {
            currentRent *= 1 + debouncedOperatingAssumptions.rentGrowth / 100;
          }
        }

        const effectiveRent =
          currentRent * (1 - debouncedOperatingAssumptions.vacancy / 100);
        let grossRevenue =
          effectiveRent *
          debouncedBuildingGFA *
          (propertyType === "apartment" ? 12 : 1);

        if (
          propertyType === "retail" &&
          escalation &&
          "salesPSF" in escalation &&
          escalation.percentageRent
        ) {
          const totalSales = escalation.salesPSF * buildingGFA;
          const naturalBreakpoint =
            escalation.percentageThreshold > 0
              ? (currentRent * buildingGFA) /
                (escalation.percentageThreshold / 100)
              : 0;
          if (totalSales > naturalBreakpoint) {
            const percentageRentAmount =
              (totalSales - naturalBreakpoint) *
              (escalation.percentageThreshold / 100);
            grossRevenue += percentageRentAmount;
          }
        }

        const parkingRevenue =
          year1ParkingRevenue *
          Math.pow(1 + operatingAssumptions.rentGrowth / 100, year - 1);
        const otherIncome =
          year1OtherIncome *
          Math.pow(1 + operatingAssumptions.rentGrowth / 100, year - 1);
        const totalRevenue = grossRevenue + parkingRevenue + otherIncome;

        const operatingExpenses =
          currentExpenses *
          (propertyType === "apartment"
            ? unitMix.reduce((sum, u) => sum + u.units, 0)
            : buildingGFA);
        const noi = totalRevenue - operatingExpenses;

        const rate = permanentLoan.enabled ? permanentLoan.rate / 100 : 0;
        let annualDebtService = 0;
        if (permanentLoan.enabled && permanentLoanAmount > 0 && rate > 0) {
          annualDebtService =
            year <= permanentLoan.ioPeriod
              ? permanentLoanAmount * rate
              : permanentLoanAmount *
                (rate / (1 - Math.pow(1 + rate, -permanentLoan.amortization)));
        }

        let cashFlow = noi - annualDebtService;
        
        // Add refinance proceeds in Year 1
        let refinanceProceeds = 0;
        if (year === 1) {
          // Refinance proceeds = Permanent loan amount - Construction loan payoff
          refinanceProceeds = permanentLoanAmount - calculateFinancing.constructionLoanAmount - calculateFinancing.constructionInterest;
          if (refinanceProceeds > 0) {
            cashFlow += refinanceProceeds;
          }
        }

        cashFlows.push({
          year,
          rent: currentRent,
          expenses: currentExpenses,
          grossRevenue: totalRevenue,
          operatingExpenses,
          noi,
          debtService: annualDebtService,
          cashFlow,
          cumulativeCashFlow:
            (cashFlows[year - 1]?.cumulativeCashFlow || 0) + cashFlow,
          refinanceProceeds: year === 1 ? refinanceProceeds : undefined,
        });

        currentExpenses *= 1 + operatingAssumptions.expenseGrowth / 100;
      }

      const exitNOI = cashFlows[operatingAssumptions.holdPeriod]?.noi || 0;
      const salePrice =
        operatingAssumptions.capRate > 0 && exitNOI > 0
          ? exitNOI / (operatingAssumptions.capRate / 100)
          : 0;
      const exitCosts = salePrice * (operatingAssumptions.exitCosts / 100);

      const yearsAmortized = Math.max(
        0,
        operatingAssumptions.holdPeriod - permanentLoan.ioPeriod
      );
      let remainingBalance = permanentLoanAmount;
      if (yearsAmortized > 0 && permanentLoan.rate > 0) {
        const rate = permanentLoan.rate / 100;
        remainingBalance =
          permanentLoanAmount *
          (1 -
            (Math.pow(1 + rate, yearsAmortized) - 1) /
              (Math.pow(1 + rate, permanentLoan.amortization) - 1));
      }

      const exitProceeds = salePrice - exitCosts - remainingBalance;

      if (cashFlows[operatingAssumptions.holdPeriod]) {
        cashFlows[operatingAssumptions.holdPeriod].cashFlow += exitProceeds;
        cashFlows[operatingAssumptions.holdPeriod].salePrice = salePrice;
        cashFlows[operatingAssumptions.holdPeriod].exitProceeds = exitProceeds;
      }

      return { cashFlows, permanentLoanAmount, year1NOI };
    } catch (e) {
      console.error("Error calculating cash flows:", e);
      return { cashFlows: [], permanentLoanAmount: 0, year1NOI: 0 };
    }
  }, [
    calculateFinancing,
    debouncedOperatingAssumptions,
    debouncedBuildingGFA,
    propertyType,
    permanentLoan,
    unitMix,
    rentEscalations,
    calculateTotalCost,
    parkingRevenue,
    includeParking,
    salesAssumptions,
    salesPhasing,
    timeline,
    constructionLoan,
    cottonwoodHeights,
    cottonwoodTenants,
    cottonwoodStateFunding,
  ]);

  // Update operating assumptions when property type changes
  useEffect(() => {
    setOperatingAssumptions((prev) => ({
      ...prev,
      rentPSF:
        propertyType === "apartment"
          ? 2.5
          : propertyType === "forSale"
          ? 625
          : 35,
      opex:
        propertyType === "apartment"
          ? 6000
          : propertyType === "forSale"
          ? 0
          : 8,
    }));
  }, [propertyType]);

  // Sync construction loan term with timeline
  useEffect(() => {
    setConstructionLoan((prev) => ({ ...prev, term: timeline.construction }));
  }, [timeline.construction]);

  // Sync site work values when input method changes
  useEffect(() => {
    if (shouldShowPerUnitOption()) {
      const totalUnits = getTotalUnitCount();
      
      if (hardCosts.siteWorkInputMethod === 'perUnit') {
        // Update total based on per-unit value
        setHardCosts(prev => ({
          ...prev,
          siteWork: prev.siteWorkPerUnit * totalUnits
        }));
      } else {
        // Update per-unit based on total value
        if (totalUnits > 0) {
          setHardCosts(prev => ({
            ...prev,
            siteWorkPerUnit: Math.round(prev.siteWork / totalUnits)
          }));
        }
      }
    }
  }, [hardCosts.siteWorkInputMethod]);

  // Validate site work values
  useEffect(() => {
    if (shouldShowPerUnitOption() && hardCosts.siteWorkInputMethod === 'perUnit') {
      const totalUnits = getTotalUnitCount();
      
      if (totalUnits === 0) {
        setSiteWorkValidation('No units defined. Please add units to the project.');
      } else if (totalUnits === 1 && buildingGFA > 5000) {
        setSiteWorkValidation('Warning: Only 1 unit calculated. Check your unit mix or average unit size.');
      } else {
        setSiteWorkValidation(null);
      }
    } else {
      setSiteWorkValidation(null);
    }
  }, [hardCosts.siteWorkInputMethod, propertyType, unitMix, salesAssumptions, buildingGFA]);

  // Load saved scenarios on mount
  useEffect(() => {
    const saved = localStorage.getItem("realEstateProFormaScenarios");
    if (saved) {
      try {
        setSavedScenarios(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading saved scenarios:", e);
      }
    }
  }, []);

  // Check for API key on mount
  useEffect(() => {
    if (ApiKeyManager.shouldPromptForKey()) {
      setShowApiKeyModal(true);
    }
    
    // Check if AI should be disabled
    if (ApiKeyManager.hasDeclined() || !ApiKeyManager.hasApiKey()) {
      setAiEnabled(false);
    }
  }, []);

  // Validation
  useEffect(() => {
    const warnings: any[] = [];

    // Basic input validations
    if (landCost < 0) {
      warnings.push({
        field: "Land Cost",
        message: "Land cost cannot be negative",
        severity: "error",
      });
    }
    
    if (buildingGFA < 0) {
      warnings.push({
        field: "Building GFA",
        message: "Building square footage cannot be negative",
        severity: "error",
      });
    }
    
    if (hardCosts.coreShell < 0 || hardCosts.tenantImprovements < 0) {
      warnings.push({
        field: "Hard Costs",
        message: "Construction costs per SF cannot be negative",
        severity: "error",
      });
    }
    
    if (operatingAssumptions.capRate <= 0) {
      warnings.push({
        field: "Cap Rate",
        message: "Cap rate must be greater than 0% for valuation calculations",
        severity: "error",
      });
    }
    
    if (operatingAssumptions.capRate > 20) {
      warnings.push({
        field: "Cap Rate",
        message: "Cap rate above 20% is extremely high",
        severity: "warning",
      });
    }
    
    if (constructionLoan.rate > 15) {
      warnings.push({
        field: "Construction Loan Rate",
        message: "Interest rate above 15% is unusually high",
        severity: "warning",
      });
    }
    
    if (permanentLoan.rate > 12) {
      warnings.push({
        field: "Permanent Loan Rate",
        message: "Interest rate above 12% is unusually high",
        severity: "warning",
      });
    }

    // Financing validations
    if (constructionLoan.ltc > 100) {
      warnings.push({
        field: "LTC",
        message: "Loan-to-cost cannot exceed 100%",
        severity: "error",
      });
    } else if (constructionLoan.ltc > 75) {
      warnings.push({
        field: "LTC",
        message: "LTC above 75% is uncommon in current market",
        severity: "warning",
      });
    }

    if (constructionLoan.ltc > 85) {
      warnings.push({
        field: "LTC",
        message: "LTC above 85% is very risky and rarely available",
        severity: "error",
      });
    }

    if (permanentLoan.ltv > 80 && propertyType !== "apartment") {
      warnings.push({
        field: "LTV",
        message: "LTV above 80% is aggressive for commercial properties",
        severity: "warning",
      });
    }

    // Cap rate validations
    if (operatingAssumptions.capRate < 4) {
      warnings.push({
        field: "Cap Rate",
        message: "Cap rate below 4% may be aggressive",
        severity: "warning",
      });
    }

    if (operatingAssumptions.capRate < 3 || operatingAssumptions.capRate > 12) {
      warnings.push({
        field: "Cap Rate",
        message: "Cap rate outside 3-12% range is unusual",
        severity: "error",
      });
    }

    // Interest rate validations
    if (constructionLoan.rate > 12) {
      warnings.push({
        field: "Construction Rate",
        message: "Construction loan rate above 12% is very high",
        severity: "warning",
      });
    }

    if (permanentLoan.rate > 10) {
      warnings.push({
        field: "Permanent Rate",
        message: "Permanent loan rate above 10% is very high",
        severity: "warning",
      });
    }

    // Cost validations (with division by zero protection)
    let costPerSF = 0;
    if (propertyType === "forSale") {
      const totalSF = getTotalUnitCount() * salesAssumptions.avgUnitSize;
      costPerSF = totalSF > 0 ? calculateTotalCost.total / totalSF : 0;
    } else {
      costPerSF = buildingGFA > 0 ? calculateTotalCost.total / buildingGFA : 0;
    }

    if (costPerSF < 100) {
      warnings.push({
        field: "Development Cost",
        message: "Cost per SF below $100 seems too low",
        severity: "warning",
      });
    }

    if (costPerSF > 1000) {
      warnings.push({
        field: "Development Cost",
        message: "Cost per SF above $1,000 is very high",
        severity: "warning",
      });
    }

    // Debt metrics validations
    const debtYield =
      calculateCashFlows?.year1NOI &&
      calculateCashFlows?.permanentLoanAmount &&
      calculateCashFlows.permanentLoanAmount > 0
        ? (calculateCashFlows.year1NOI /
            calculateCashFlows.permanentLoanAmount) *
          100
        : 0;

    if (debtYield > 0 && debtYield < 8) {
      warnings.push({
        field: "Debt Yield",
        message: "Debt yield below 8% may face financing challenges",
        severity: "warning",
      });
    }

    if (debtYield > 0 && debtYield < 6) {
      warnings.push({
        field: "Debt Yield",
        message: "Debt yield below 6% is very risky",
        severity: "error",
      });
    }

    // Development spread validation
    const yieldOnCost =
      calculateCashFlows?.year1NOI && calculateTotalCost.total > 0
        ? (calculateCashFlows.year1NOI / calculateTotalCost.total) * 100
        : 0;
    const developmentSpread = yieldOnCost - operatingAssumptions.capRate;

    if (developmentSpread < 100 && developmentSpread > 0) {
      warnings.push({
        field: "Development Spread",
        message:
          "Development spread below 100bps may not justify development risk",
        severity: "warning",
      });
    }

    if (developmentSpread < 50 && developmentSpread > 0) {
      warnings.push({
        field: "Development Spread",
        message: "Development spread below 50bps is insufficient",
        severity: "error",
      });
    }

    // For-Sale specific validations
    if (propertyType === "forSale") {
      if (salesAssumptions.salesPace <= 0) {
        warnings.push({
          field: "Sales Pace",
          message: "Sales pace must be greater than 0 units per month",
          severity: "error",
        });
      }
      
      if (salesAssumptions.priceEscalation > 10) {
        warnings.push({
          field: "Price Escalation",
          message: "Price escalation above 10% annually is very aggressive",
          severity: "warning",
        });
      }
      
      if (salesAssumptions.priceEscalation < 0) {
        warnings.push({
          field: "Price Escalation",
          message: "Negative price escalation means prices are declining",
          severity: "warning",
        });
      }
      
      const totalDepositPercent = salesAssumptions.depositStructure.reduce(
        (sum, d) => sum + d.percentage, 0
      );
      if (Math.abs(totalDepositPercent - 100) > 0.01) {
        warnings.push({
          field: "Deposit Structure",
          message: `Deposit percentages should total 100% (currently ${totalDepositPercent}%)`,
          severity: "error",
        });
      }
    }

    // Equity structure validation
    if (equityStructure.lpEquity + equityStructure.gpEquity !== 100) {
      warnings.push({
        field: "Equity Split",
        message: "LP + GP equity should equal 100%",
        severity: "error",
      });
    }
    
    // Note: IRR validation is handled in a separate useEffect after calculateReturns is defined
    
    // Building SF validation for office/retail
    if ((propertyType === "office" || propertyType === "retail") && tenants && tenants.length > 0) {
      const totalLeasedSF = tenants.reduce((sum, tenant) => sum + tenant.sf, 0);
      if (totalLeasedSF > buildingGFA) {
        warnings.push({
          field: "Leased Space",
          message: `Total leased SF (${formatNumber(totalLeasedSF)}) exceeds building GFA (${formatNumber(buildingGFA)})`,
          severity: "error",
        });
      }
    }
    
    // Apartment unit size validation
    if (propertyType === "apartment" && unitMix && unitMix.length > 0) {
      const totalUnitSF = unitMix.reduce((sum, unit) => sum + (unit.units * unit.size), 0);
      if (totalUnitSF > buildingGFA) {
        warnings.push({
          field: "Unit Mix",
          message: `Total unit SF (${formatNumber(totalUnitSF)}) exceeds building GFA (${formatNumber(buildingGFA)})`,
          severity: "error",
        });
      }
    }

    setValidationWarnings(warnings);
  }, [
    constructionLoan,
    permanentLoan,
    operatingAssumptions,
    calculateCashFlows,
    calculateTotalCost,
    equityStructure,
    propertyType,
    buildingGFA,
    salesAssumptions,
    tenants,
    unitMix,
    formatNumber,
  ]);

  // Calculate Returns
  const calculateReturns = useMemo(() => {
    try {
      if (
        !calculateCashFlows ||
        !calculateCashFlows.cashFlows ||
        calculateCashFlows.cashFlows.length === 0
      ) {
        return {
          irr: "0.00",
          equityMultiple: "0.00",
          totalReturn: 0,
          lpReturn: 0,
          gpReturn: 0,
          lpIRR: "0.00",
          gpIRR: "0.00",
          paybackPeriod: 0,
        };
      }

      const { cashFlows } = calculateCashFlows;
      const cashFlowArray = cashFlows.map((cf) => cf.cashFlow);

      // Use the improved IRR calculator
      const irrResult = calculateIRR(cashFlowArray);
      const irr = irrResult.isValid ? irrResult.irr * 100 : 0;

      const totalDistributions = cashFlowArray
        .slice(1)
        .reduce((sum, cf) => sum + Math.max(0, cf), 0);
      const initialEquity = Math.abs(cashFlowArray[0] || 0);
      const equityMultiple =
        initialEquity > 0 ? totalDistributions / initialEquity : 0;

      let paybackPeriod = 0;
      let cumulativeReturn = 0;
      for (let i = 1; i < cashFlows.length; i++) {
        cumulativeReturn +=
          cashFlows[i].cashFlow - (cashFlows[i].exitProceeds || 0);
        if (cumulativeReturn >= initialEquity) {
          paybackPeriod = i;
          break;
        }
      }

      let remainingCashFlow = totalDistributions;
      const distributions = { lp: 0, gp: 0 };

      // Calculate LP and GP equity amounts
      const lpCapital = initialEquity * (debouncedEquityStructure.lpEquity / 100);
      const gpCapital = initialEquity * (debouncedEquityStructure.gpEquity / 100);
      const gpCoinvestment = gpCapital * (debouncedEquityStructure.gpCoinvest / 100);

      // Step 1: Preferred Return (using compound interest)
      const preferredRate = debouncedEquityStructure.preferredReturn / 100;
      const lpPreferredAmount = lpCapital * (Math.pow(1 + preferredRate, operatingAssumptions.holdPeriod) - 1);
      const gpPreferredAmount = gpCoinvestment * (Math.pow(1 + preferredRate, operatingAssumptions.holdPeriod) - 1);

      // LP gets preferred first
      const lpPreferred = Math.min(remainingCashFlow, lpPreferredAmount);
      distributions.lp += lpPreferred;
      remainingCashFlow -= lpPreferred;

      // GP gets preferred on co-investment
      if (gpCoinvestment > 0 && remainingCashFlow > 0) {
        const gpPreferred = Math.min(remainingCashFlow, gpPreferredAmount);
        distributions.gp += gpPreferred;
        remainingCashFlow -= gpPreferred;
      }

      // Step 2: Catch-up
      if (debouncedEquityStructure.catchUp && remainingCashFlow > 0) {
        // GP catches up to 20% of total distributions (typical promote)
        const targetGPShare = 0.20;
        const totalDistributedSoFar = distributions.lp + distributions.gp;
        const targetGPAmount = (totalDistributedSoFar + remainingCashFlow) * targetGPShare;
        const gpCatchUpNeeded = Math.max(0, targetGPAmount - distributions.gp);
        
        const catchUpAmount = Math.min(
          remainingCashFlow,
          gpCatchUpNeeded,
          remainingCashFlow * (debouncedEquityStructure.catchUpPercentage / 100)
        );
        distributions.gp += catchUpAmount;
        remainingCashFlow -= catchUpAmount;
      }

      // Step 3: Waterfall splits (distribute ALL remaining cash flow)
      if (remainingCashFlow > 0) {
        // Find applicable tier based on project IRR
        const applicableTier = waterfallTiers.find(
          tier => irr >= tier.minIRR && irr < tier.maxIRR
        );
        
        if (applicableTier) {
          distributions.lp += remainingCashFlow * (applicableTier.lpShare / 100);
          distributions.gp += remainingCashFlow * (applicableTier.gpShare / 100);
          remainingCashFlow = 0;
        }
      }

      // Apply sponsor promote to GP distributions
      const sponsorPromoteFee = distributions.gp * (debouncedEquityStructure.sponsorPromote / 100);
      const gpReturnWithPromote = distributions.gp + sponsorPromoteFee;
      
      const lpShare = debouncedEquityStructure.lpEquity / 100;
      const gpShare = debouncedEquityStructure.gpEquity / 100;
      const lpIRR =
        totalDistributions > 0 && lpShare > 0
          ? (irr * (distributions.lp / totalDistributions)) / lpShare
          : 0;
      const gpIRR =
        totalDistributions > 0 && gpShare > 0
          ? (irr * (gpReturnWithPromote / totalDistributions)) / gpShare
          : 0;

      return {
        irr: formatIRR(irrResult),
        equityMultiple: isFinite(equityMultiple)
          ? equityMultiple.toFixed(2)
          : "0.00",
        totalReturn: totalDistributions,
        lpReturn: distributions.lp,
        gpReturn: gpReturnWithPromote,
        lpIRR: isFinite(lpIRR) ? lpIRR.toFixed(2) : "0.00",
        gpIRR: isFinite(gpIRR) ? gpIRR.toFixed(2) : "0.00",
        paybackPeriod: paybackPeriod,
        irrMessage: irrResult.message,
        sponsorPromoteFee: sponsorPromoteFee,
      };
    } catch (e) {
      console.error("Error calculating returns:", e);
      return {
        irr: "0.00",
        equityMultiple: "0.00",
        totalReturn: 0,
        lpReturn: 0,
        gpReturn: 0,
        lpIRR: "0.00",
        gpIRR: "0.00",
        paybackPeriod: 0,
        sponsorPromoteFee: 0,
      };
    }
  }, [
    calculateCashFlows,
    waterfallTiers,
    debouncedEquityStructure,
    operatingAssumptions.holdPeriod,
  ]);

  // Calculate Additional Metrics
  const calculateAdditionalMetrics = useMemo(() => {
    try {
      const totalCost = calculateTotalCost.total || 0;
      const year1NOI = calculateCashFlows?.year1NOI || 0;
      const initialEquity = calculateFinancing.equityRequired || 0;

      const yieldOnCost = totalCost > 0 ? (year1NOI / totalCost) * 100 : 0;
      const developmentSpread = yieldOnCost - operatingAssumptions.capRate;

      const stabilizedValue =
        operatingAssumptions.capRate > 0
          ? year1NOI / (operatingAssumptions.capRate / 100)
          : 0;
      const developmentProfit = stabilizedValue - totalCost;
      const profitMargin =
        totalCost > 0 ? (developmentProfit / totalCost) * 100 : 0;

      const returnOnCost = yieldOnCost;
      const returnOnInvestment =
        initialEquity > 0 ? (year1NOI / initialEquity) * 100 : 0;

      const peakEquity = calculateFinancing.equityRequired;

      const totalExpenses =
        calculateCashFlows?.cashFlows?.[1]?.operatingExpenses || 0;
      const debtService = calculateCashFlows?.cashFlows?.[1]?.debtService || 0;
      const requiredRevenue = totalExpenses + debtService;
      const potentialRevenue =
        calculateCashFlows?.cashFlows?.[1]?.grossRevenue || 1;
      const vacancyRate = operatingAssumptions.vacancy / 100;
      const breakEvenOccupancy =
        vacancyRate > 0 && vacancyRate < 1 && potentialRevenue > 0
          ? (requiredRevenue / (potentialRevenue / (1 - vacancyRate))) * 100
          : 0;

      return {
        yieldOnCost: isFinite(yieldOnCost) ? yieldOnCost.toFixed(2) : "0.00",
        developmentSpread: isFinite(developmentSpread)
          ? developmentSpread.toFixed(0)
          : "0",
        profitMargin: isFinite(profitMargin) ? profitMargin.toFixed(1) : "0.0",
        developmentProfit: developmentProfit,
        returnOnCost: isFinite(returnOnCost) ? returnOnCost.toFixed(2) : "0.00",
        returnOnInvestment: isFinite(returnOnInvestment)
          ? returnOnInvestment.toFixed(2)
          : "0.00",
        peakEquity: peakEquity,
        breakEvenOccupancy: isFinite(breakEvenOccupancy)
          ? breakEvenOccupancy.toFixed(1)
          : "0.0",
      };
    } catch (e) {
      console.error("Error calculating additional metrics:", e);
      return {
        yieldOnCost: "0.00",
        developmentSpread: "0",
        profitMargin: "0.0",
        developmentProfit: 0,
        returnOnCost: "0.00",
        returnOnInvestment: "0.00",
        peakEquity: 0,
        breakEvenOccupancy: "0.0",
      };
    }
  }, [
    calculateTotalCost,
    calculateCashFlows,
    calculateFinancing,
    operatingAssumptions,
  ]);

  // Calculate Cash-on-Cash Returns
  const calculateCashOnCashReturns = useMemo(() => {
    try {
      if (
        !calculateCashFlows ||
        !calculateCashFlows.cashFlows ||
        calculateCashFlows.cashFlows.length === 0
      ) {
        return [];
      }

      const { cashFlows } = calculateCashFlows;
      const initialEquity = Math.abs(cashFlows[0]?.cashFlow || 0);

      if (initialEquity === 0) {
        return [];
      }

      return cashFlows.slice(1).map((cf, index) => {
        const cashOnCash =
          ((cf.cashFlow - (cf.exitProceeds || 0)) / initialEquity) * 100;
        const cumulativeCashFlow = cashFlows
          .slice(1, index + 2)
          .reduce(
            (sum, flow) => sum + (flow.cashFlow - (flow.exitProceeds || 0)),
            0
          );
        const cumulativeCashOnCash = (cumulativeCashFlow / initialEquity) * 100;
        const yieldOnCost =
          calculateTotalCost.total > 0
            ? (cf.noi / calculateTotalCost.total) * 100
            : 0;
        const capRate =
          calculateTotalCost.total - landCost > 0
            ? (cf.noi / (calculateTotalCost.total - landCost)) * 100
            : 0;

        return {
          year: cf.year,
          cashOnCash: isFinite(cashOnCash) ? cashOnCash : 0,
          cumulativeCashOnCash: isFinite(cumulativeCashOnCash)
            ? cumulativeCashOnCash
            : 0,
          yieldOnCost: isFinite(yieldOnCost) ? yieldOnCost : 0,
          capRate: isFinite(capRate) ? capRate : 0,
        };
      });
    } catch (e) {
      console.error("Error calculating cash-on-cash returns:", e);
      return [];
    }
  }, [calculateCashFlows, calculateTotalCost, landCost]);

  // TIF Analysis Calculations
  const calculateTIFAnalysis = useMemo(() => {
    if (propertyType !== "cottonwoodHeights" || !cottonwoodHeights.tif.enabled) {
      return {
        annualRevenue: 0,
        totalRevenue: 0,
        npv: 0,
        incrementalValue: 0,
        projectedValue: 0,
        yearByYear: [],
        componentBreakdown: {},
        totalBondingCapacity: 0
      };
    }

    // Calculate TIF for each component
    const calculateComponentTIF = (component: any, componentName: string) => {
      const baseValue = component.baseAssessedValue;
      // Project values based on development cost and expected cap rates
      let projectedValue = baseValue;
      
      if (componentName === 'commercial') {
        // Medical office at 7.5% cap rate
        const medicalNOI = cottonwoodHeights.medicalOffice.enabled ? 
          cottonwoodHeights.medicalOffice.rentableSF * cottonwoodHeights.medicalOffice.baseRentPSF * 0.85 : 0;
        projectedValue = medicalNOI > 0 ? medicalNOI / 0.075 : baseValue;
      } else if (componentName === 'grocery') {
        // Grocery at 7% cap rate
        const groceryNOI = cottonwoodHeights.grocery.enabled ?
          cottonwoodHeights.grocery.totalSF * cottonwoodHeights.grocery.baseRentPSF * 0.90 : 0;
        projectedValue = groceryNOI > 0 ? groceryNOI / 0.07 : baseValue;
      } else if (componentName === 'residential') {
        // Townhomes at 5.5% cap rate
        const townhomeNOI = cottonwoodHeights.townhomes.enabled ?
          cottonwoodHeights.townhomes.units * cottonwoodHeights.townhomes.rentPerUnit * 12 * 0.60 : 0;
        projectedValue = townhomeNOI > 0 ? townhomeNOI / 0.055 : baseValue;
      }
      
      const incrementalValue = Math.max(0, projectedValue - baseValue);
      const taxRate = component.taxRate / 100;
      const captureRate = component.captureRate / 100;
      const annualTIF = incrementalValue * taxRate * captureRate;
      
      let totalRevenue = 0;
      let npv = 0;
      const discountRate = component.discountRate / 100;
      const yearByYear = [];

      for (let year = 1; year <= component.term; year++) {
        const yearRevenue = annualTIF;
        totalRevenue += yearRevenue;
        const discountedValue = yearRevenue / Math.pow(1 + discountRate, year);
        npv += discountedValue;
        
        yearByYear.push({
          year,
          revenue: yearRevenue,
          discountedValue,
          cumulativeRevenue: totalRevenue,
          cumulativeNPV: npv
        });
      }

      return {
        baseValue,
        projectedValue,
        incrementalValue,
        annualRevenue: annualTIF,
        totalRevenue,
        npv,
        bondingCapacity: npv * 0.9, // 90% of NPV for bonding
        yearByYear
      };
    };

    // Calculate for each component
    const commercialTIF = calculateComponentTIF(cottonwoodHeights.tif.commercial, 'commercial');
    const groceryTIF = calculateComponentTIF(cottonwoodHeights.tif.grocery, 'grocery');
    const residentialTIF = calculateComponentTIF(cottonwoodHeights.tif.residential, 'residential');

    // Consolidate results
    const totalAnnualRevenue = commercialTIF.annualRevenue + groceryTIF.annualRevenue + residentialTIF.annualRevenue;
    const totalNPV = commercialTIF.npv + groceryTIF.npv + residentialTIF.npv;
    const totalBondingCapacity = commercialTIF.bondingCapacity + groceryTIF.bondingCapacity + residentialTIF.bondingCapacity;

    // Merge year-by-year data
    const maxTerm = Math.max(
      cottonwoodHeights.tif.commercial.term,
      cottonwoodHeights.tif.grocery.term,
      cottonwoodHeights.tif.residential.term
    );
    
    const consolidatedYearByYear = [];
    for (let year = 1; year <= maxTerm; year++) {
      const commercialYear = commercialTIF.yearByYear.find(y => y.year === year) || { revenue: 0, discountedValue: 0 };
      const groceryYear = groceryTIF.yearByYear.find(y => y.year === year) || { revenue: 0, discountedValue: 0 };
      const residentialYear = residentialTIF.yearByYear.find(y => y.year === year) || { revenue: 0, discountedValue: 0 };
      
      consolidatedYearByYear.push({
        year,
        revenue: commercialYear.revenue + groceryYear.revenue + residentialYear.revenue,
        discountedValue: commercialYear.discountedValue + groceryYear.discountedValue + residentialYear.discountedValue,
        commercialRevenue: commercialYear.revenue,
        groceryRevenue: groceryYear.revenue,
        residentialRevenue: residentialYear.revenue
      });
    }

    return {
      annualRevenue: totalAnnualRevenue,
      totalRevenue: commercialTIF.totalRevenue + groceryTIF.totalRevenue + residentialTIF.totalRevenue,
      npv: totalNPV,
      incrementalValue: commercialTIF.incrementalValue + groceryTIF.incrementalValue + residentialTIF.incrementalValue,
      projectedValue: commercialTIF.projectedValue + groceryTIF.projectedValue + residentialTIF.projectedValue,
      yearByYear: consolidatedYearByYear,
      componentBreakdown: {
        commercial: commercialTIF,
        grocery: groceryTIF,
        residential: residentialTIF
      },
      totalBondingCapacity
    };
  }, [propertyType, cottonwoodHeights]);

  // Prepare metric breakdown data
  const getMetricBreakdownData = (metric: string) => {
    switch (metric) {
      case 'Project IRR':
        return {
          cashFlows: calculateCashFlows?.cashFlows || [],
          initialEquity: Math.abs(calculateCashFlows?.cashFlows?.[0]?.cashFlow || 0),
          npvSensitivity: Array.from({ length: 21 }, (_, i) => {
            const rate = i;
            const npv = calculateCashFlows?.cashFlows?.reduce((sum, cf, index) => {
              return sum + (cf.cashFlow || 0) / Math.pow(1 + rate / 100, index);
            }, 0) || 0;
            return { rate, npv };
          })
        };
      
      case 'Equity Multiple':
        const initialEquity = Math.abs(calculateCashFlows?.cashFlows?.[0]?.cashFlow || 0);
        const cashDistributions = calculateCashFlows?.cashFlows?.slice(1)
          .reduce((sum, cf) => sum + (cf.cashFlow || 0) - (cf.exitProceeds || 0), 0) || 0;
        const exitProceeds = calculateCashFlows?.cashFlows?.[calculateCashFlows.cashFlows.length - 1]?.exitProceeds || 0;
        const totalDistributions = cashDistributions + exitProceeds;
        
        return {
          initialEquity,
          cashDistributions,
          exitProceeds,
          totalDistributions,
          equityMultiple: initialEquity > 0 ? totalDistributions / initialEquity : 0,
          distributions: calculateCashFlows?.cashFlows?.slice(1).map((cf, i) => ({
            label: i === calculateCashFlows.cashFlows.length - 2 ? `Year ${i + 1} (Exit)` : `Year ${i + 1}`,
            amount: cf.cashFlow || 0
          })) || [],
          // Include waterfall breakdown
          lpDistributions: combinedReturns.lpReturn,
          gpDistributions: combinedReturns.gpReturn,
          sponsorPromote: combinedReturns.sponsorPromoteFee || 0,
          waterfallTiers: waterfallTiers
        };
      
      case 'Total Development Cost':
        // Calculate hard cost components
        const siteAreaSF = Math.max(0, siteAreaAcres * 43560);
        const parkingSpaces = includeParking ? Math.round((buildingGFA / 1000) * parkingRatio) : 0;
        
        let hardCostBreakdown: any = {};
        let totalBuildingSF = buildingGFA;
        
        if (propertyType === 'cottonwoodHeights') {
          // Calculate total SF for all Cottonwood Heights components
          let totalCommercialSF = 0;
          if (cottonwoodHeights.retail.enabled) totalCommercialSF += cottonwoodHeights.retail.totalSF;
          if (cottonwoodHeights.grocery.enabled) totalCommercialSF += cottonwoodHeights.grocery.totalSF;
          
          let totalResidentialSF = 0;
          if (cottonwoodHeights.townhomes.enabled) {
            totalResidentialSF += cottonwoodHeights.townhomes.units * cottonwoodHeights.townhomes.avgSize;
          }
          
          totalBuildingSF = totalCommercialSF + totalResidentialSF;
          const parkingSpacesNeeded = Math.round((totalBuildingSF / 1000) * parkingRatio);
          
          hardCostBreakdown = {
            'Building Construction': (hardCosts.coreShell + hardCosts.tenantImprovements) * totalBuildingSF,
            'Site Work': cottonwoodSiteWork.totalCost,
            'Structured Parking': parkingSpacesNeeded * hardCosts.parkingStructured,
            'Landscaping': hardCosts.landscaping * siteAreaSF,
            // 'Public Land Contribution': -cottonwoodHeights.publicFinancing.landContribution,
            // 'Public Infrastructure Contribution': -cottonwoodHeights.publicFinancing.infrastructureContribution,
            'Contingency': ((hardCosts.coreShell + hardCosts.tenantImprovements) * totalBuildingSF + cottonwoodSiteWork.totalCost + parkingSpacesNeeded * hardCosts.parkingStructured + hardCosts.landscaping * siteAreaSF) * (hardCosts.contingency / 100)
          };
        } else if (propertyType === 'forSale') {
          // Use unit mix for unit count
          const totalUnits = getTotalUnitCount();
          totalBuildingSF = totalUnits * salesAssumptions.avgUnitSize;
          
          // Calculate site work based on input method
          let siteWorkBase = hardCosts.siteWork;
          if (hardCosts.siteWorkInputMethod === 'perUnit') {
            siteWorkBase = hardCosts.siteWorkPerUnit * totalUnits;
          }
          
          const parkingCost = includeParking ? parkingSpaces * hardCosts.parkingSurface : 0;
          const landscapingCost = hardCosts.landscapingEnabled ? hardCosts.landscaping * siteAreaSF : 0;
          const totalSiteWork = siteWorkBase + parkingCost + landscapingCost;
          
          hardCostBreakdown = {
            'Building Construction': (hardCosts.coreShell + hardCosts.tenantImprovements) * totalBuildingSF,
            'Site Work (includes parking & landscaping)': totalSiteWork,
            'Contingency': ((hardCosts.coreShell + hardCosts.tenantImprovements) * totalBuildingSF + totalSiteWork) * (hardCosts.contingency / 100)
          };
        } else {
          const parkingCost = includeParking ? parkingSpaces * hardCosts.parkingSurface : 0;
          const landscapingCost = hardCosts.landscapingEnabled ? hardCosts.landscaping * siteAreaSF : 0;
          
          hardCostBreakdown = {
            'Core & Shell': hardCosts.coreShell * totalBuildingSF,
            'Tenant Improvements': hardCosts.tenantImprovements * totalBuildingSF,
            'Site Work': hardCosts.siteWork,
            'Parking': parkingCost,
            'Landscaping': landscapingCost,
            'Contingency': (hardCosts.coreShell * totalBuildingSF + hardCosts.tenantImprovements * totalBuildingSF + hardCosts.siteWork + parkingCost + landscapingCost) * (hardCosts.contingency / 100)
          };
        }
        
        // Calculate soft cost components
        const hardCostTotal = Object.values(hardCostBreakdown).reduce((sum: number, val: any) => sum + val, 0);
        
        const softCostBreakdownWithoutDevFee = {
          'Architecture & Engineering': softCosts.architectureEngineeringEnabled ? (hardCostTotal * softCosts.architectureEngineering) / 100 : 0,
          'Permits & Impact Fees': softCosts.permitsImpactFeesEnabled ? totalBuildingSF * softCosts.permitsImpactFees : 0,
          'Legal & Accounting': softCosts.legalAccountingEnabled ? softCosts.legalAccounting : 0,
          'Property Tax During Construction': softCosts.propertyTaxConstructionEnabled ? (calculateLandCost * softCosts.propertyTaxConstruction) / 100 : 0,
          'Insurance During Construction': softCosts.insuranceConstructionEnabled ? (hardCostTotal * softCosts.insuranceConstruction) / 100 : 0,
          'Marketing & Leasing': softCosts.marketingLeasingEnabled ? softCosts.marketingLeasing : 0,
          'Construction Management Fee': softCosts.constructionMgmtFeeEnabled ? (hardCostTotal * softCosts.constructionMgmtFee) / 100 : 0
        };
        
        const softCostSubtotal = Object.values(softCostBreakdownWithoutDevFee).reduce((sum: number, val: any) => sum + val, 0);
        const developerFee = softCosts.developerFeeEnabled ? ((calculateLandCost + hardCostTotal + softCostSubtotal) * softCosts.developerFee) / 100 : 0;
        
        const softCostBreakdown = {
          ...softCostBreakdownWithoutDevFee,
          'Developer Fee': developerFee
        };
        
        return {
          costBreakdown: {
            'Land Cost': calculateLandCost,
            'Hard Costs': calculateTotalCost.hardCost,
            'Soft Costs': calculateTotalCost.softCost,
            'Construction Interest': calculateFinancing.constructionInterest,
            'Loan Fees': calculateFinancing.loanFees
          },
          hardCostBreakdown,
          softCostBreakdown,
          total: calculateFinancing.totalProjectCost,
          metrics: {
            costPerSF: buildingGFA > 0 ? calculateFinancing.totalProjectCost / buildingGFA : 0,
            costPerUnit: propertyType === 'apartment' && unitMix.reduce((sum, unit) => sum + unit.units, 0) > 0 ? calculateFinancing.totalProjectCost / unitMix.reduce((sum, unit) => sum + unit.units, 0) : null
          }
        };
      
      case 'Equity Required':
        return {
          totalProjectCost: calculateFinancing.totalProjectCost,
          debtAmount: calculateFinancing.constructionLoanAmount,
          equityRequired: calculateFinancing.equityRequired,
          constructionInterest: calculateFinancing.constructionInterest,
          loanFees: calculateFinancing.loanFees,
          ltc: constructionLoan.ltc,
          lpEquity: calculateFinancing.lpEquity,
          gpEquity: calculateFinancing.totalGPCommitment,
          lpPercent: equityStructure.lpEquity,
          gpPercent: equityStructure.gpEquity
        };
      
      case 'Avg Cash-on-Cash':
        const annualReturns = calculateCashOnCashReturns || [];
        return {
          annualReturns: annualReturns.map(ret => ({
            year: ret.year,
            cashOnCash: ret.cashOnCash,
            cashFlow: calculateCashFlows?.cashFlows?.[ret.year]?.cashFlow || 0,
            initialEquity: Math.abs(calculateCashFlows?.cashFlows?.[0]?.cashFlow || 0)
          })),
          cumulativeReturns: annualReturns.map((ret, i) => ({
            year: ret.year,
            cumulative: ret.cumulativeCashOnCash
          }))
        };
      
      case 'Yield on Cost':
        const stabilizedNOI = calculateCashFlows?.cashFlows?.[1]?.noi || 0;
        const grossRevenue = calculateCashFlows?.cashFlows?.[1]?.grossRevenue || 
          ((buildingGFA * 0.85) * operatingAssumptions.rentPSF);
        const vacancyLoss = grossRevenue * (operatingAssumptions.vacancy / 100);
        const effectiveGrossIncome = grossRevenue - vacancyLoss;
        const operatingExpenses = (buildingGFA * 0.85) * operatingAssumptions.opex;
        
        return {
          stabilizedNOI,
          totalCost: calculateFinancing.totalProjectCost,
          noiBreakdown: {
            grossRevenue,
            vacancyRate: operatingAssumptions.vacancy,
            vacancyLoss,
            effectiveGrossIncome,
            operatingExpenses
          },
          comparisons: {
            marketCapRate: operatingAssumptions.capRate,
            developmentSpread: calculateAdditionalMetrics.developmentSpread
          }
        };
      
      default:
        return {};
    }
  };

  // Cross-Subsidization Analysis
  const calculateCrossSubsidy = useMemo(() => {
    if (propertyType !== "cottonwoodHeights") {
      return {
        commercialNOI: 0,
        marketRateNOI: 0,
        netSubsidy: 0,
        subsidyPerUnit: 0
      };
    }

    let commercialNOI = 0;
    
    // Calculate retail NOI from all retail tenants
    if (cottonwoodHeights.retail.enabled) {
      cottonwoodTenants.retail.forEach(tenant => {
        const tenantRevenue = tenant.sf * tenant.rentPSF * (1 - 5 / 100); // Assuming 5% vacancy
        const tenantExpenses = tenant.sf * 7; // Assuming $7/SF opex
        commercialNOI += tenantRevenue - tenantExpenses;
      });
    }
    
    // Calculate grocery NOI from all grocery tenants
    if (cottonwoodHeights.grocery.enabled) {
      cottonwoodTenants.grocery.forEach(tenant => {
        const tenantRevenue = tenant.sf * tenant.rentPSF * (1 - 0 / 100); // Assuming 0% vacancy for grocery
        const tenantExpenses = tenant.sf * 5; // Assuming $5/SF opex
        commercialNOI += tenantRevenue - tenantExpenses;
      });
    }

    // Calculate townhome NOI (market rate housing)
    let townhomeNOI = 0;
    if (cottonwoodHeights.townhomes.enabled) {
      const townhomeRevenue = cottonwoodHeights.townhomes.units * cottonwoodHeights.townhomes.rentPerUnit * 12 * (1 - cottonwoodHeights.townhomes.vacancy / 100);
      const townhomeExpenses = cottonwoodHeights.townhomes.units * cottonwoodHeights.townhomes.opexPerUnit;
      townhomeNOI = townhomeRevenue - townhomeExpenses;
    }

    const netSubsidy = commercialNOI + townhomeNOI;
    const subsidyPerUnit = cottonwoodHeights.townhomes.units > 0 ? townhomeNOI / cottonwoodHeights.townhomes.units : 0;

    return {
      commercialNOI,
      marketRateNOI: townhomeNOI,
      netSubsidy,
      subsidyPerUnit
    };
  }, [propertyType, cottonwoodHeights, cottonwoodTenants]);


  // Average Cash-on-Cash calculation
  const avgCashOnCash = useMemo(() => {
    try {
      if (calculateCashOnCashReturns.length === 0) return "0.00";
      const validReturns = calculateCashOnCashReturns.filter((yr) =>
        isFinite(yr.cashOnCash)
      );
      if (validReturns.length === 0) return "0.00";
      const avg =
        validReturns.reduce((sum, yr) => sum + yr.cashOnCash, 0) /
        validReturns.length;
      return isFinite(avg) ? avg.toFixed(2) : "0.00";
    } catch (e) {
      console.error("Error calculating average cash-on-cash:", e);
      return "0.00";
    }
  }, [calculateCashOnCashReturns]);

  // Combined returns object
  const combinedReturns = useMemo(() => {
    return {
      irr: calculateReturns?.irr || "0.00",
      equityMultiple: calculateReturns?.equityMultiple || "0.00",
      totalReturn: calculateReturns?.totalReturn || 0,
      lpReturn: calculateReturns?.lpReturn || 0,
      gpReturn: calculateReturns?.gpReturn || 0,
      lpIRR: calculateReturns?.lpIRR || "0.00",
      gpIRR: calculateReturns?.gpIRR || "0.00",
      avgCashOnCash: avgCashOnCash,
      paybackPeriod: calculateReturns?.paybackPeriod || 0,
      sponsorPromoteFee: calculateReturns?.sponsorPromoteFee || 0,
    };
  }, [calculateReturns, avgCashOnCash]);

  // IRR validation - separate useEffect after combinedReturns is defined
  useEffect(() => {
    const projectIRR = parseFloat(combinedReturns.irr);
    if (projectIRR < 0) {
      setValidationWarnings(prev => {
        const filtered = prev.filter(w => w.field !== "Project IRR");
        return [...filtered, {
          field: "Project IRR",
          message: "Negative IRR indicates project is losing money",
          severity: "error",
        }];
      });
    } else {
      setValidationWarnings(prev => prev.filter(w => w.field !== "Project IRR"));
    }
  }, [combinedReturns.irr]);

  // Calculate Sensitivity Analysis
  const calculateSensitivityAnalysis = useMemo(() => {
    try {
      const sensitivityRanges = {
        rent: [-15, -10, -5, 0, 5, 10, 15],
        construction: [-10, -5, -2.5, 0, 2.5, 5, 10],
        capRate: [-75, -50, -25, 0, 25, 50, 75],
        interestRate: [-100, -75, -50, -25, 0, 25, 50, 75, 100],
      };

      const baseIRR = parseFloat(combinedReturns.irr) || 10;
      const results: any[] = [];

      if (!sensitivityRanges[sensitivityVariable]) {
        return results;
      }

      sensitivityRanges[sensitivityVariable].forEach((change) => {
        let modifiedIRR = baseIRR;

        switch (sensitivityVariable) {
          case "rent":
            modifiedIRR = baseIRR + change * 1.5 * 0.01 * baseIRR;
            break;
          case "construction":
            modifiedIRR = baseIRR - change * 0.8 * 0.01 * baseIRR;
            break;
          case "capRate":
            modifiedIRR = baseIRR - change * 0.02 * 0.01 * baseIRR;
            break;
          case "interestRate":
            modifiedIRR = baseIRR - change * 0.01 * 0.5 * 0.01 * baseIRR;
            break;
        }

        results.push({
          change: change,
          irr: isFinite(modifiedIRR) ? modifiedIRR : 0,
          delta: isFinite(modifiedIRR - baseIRR) ? modifiedIRR - baseIRR : 0,
        });
      });

      return results;
    } catch (e) {
      console.error("Error calculating sensitivity analysis:", e);
      return [];
    }
  }, [sensitivityVariable, combinedReturns.irr]);

  // Monte Carlo Simulation
  const runMonteCarloSimulation = useMemo(() => {
    try {
      const results: number[] = [];

      // Helper function for normal distribution (Box-Muller transform)
      const normalRandom = () => {
        let u = 0, v = 0;
        while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      };

      for (let i = 0; i < monteCarloParams.iterations; i++) {
        // Normal distribution for rent (mean=0, std=volatility/3 to keep 99.7% within ±volatility)
        const rentVariation = (normalRandom() * monteCarloParams.rentVolatility / 3) / 100;
        
        // Uniform distribution for costs
        const costVariation =
          ((Math.random() - 0.5) * 2 * monteCarloParams.costVolatility) / 100;
        
        // Uniform distribution for cap rate
        const capRateVariation =
          ((Math.random() - 0.5) * 2 * monteCarloParams.capRateVolatility) /
          100;

        const simulatedRent =
          operatingAssumptions.rentPSF * (1 + rentVariation);
        const simulatedCost = calculateTotalCost.total * (1 + costVariation);
        const simulatedCapRate =
          operatingAssumptions.capRate + capRateVariation;

        const simulatedYieldOnCost =
          simulatedCost > 0
            ? ((simulatedRent *
                buildingGFA *
                (1 - operatingAssumptions.vacancy / 100)) /
                simulatedCost) *
              100
            : 0;
        const simulatedIRR =
          simulatedYieldOnCost +
          (simulatedYieldOnCost - simulatedCapRate) * 0.5;

        if (isFinite(simulatedIRR)) {
          results.push(simulatedIRR);
        }
      }

      if (results.length === 0) {
        return {
          mean: "0.00",
          p10: "0.00",
          p50: "0.00",
          p90: "0.00",
          distribution: [],
        };
      }

      results.sort((a, b) => a - b);
      const mean = results.reduce((sum, val) => sum + val, 0) / results.length;
      const p10 = results[Math.floor(results.length * 0.1)] || 0;
      const p50 = results[Math.floor(results.length * 0.5)] || 0;
      const p90 = results[Math.floor(results.length * 0.9)] || 0;

      return {
        mean: mean.toFixed(2),
        p10: p10.toFixed(2),
        p50: p50.toFixed(2),
        p90: p90.toFixed(2),
        distribution: results,
      };
    } catch (e) {
      console.error("Error running Monte Carlo simulation:", e);
      return {
        mean: "0.00",
        p10: "0.00",
        p50: "0.00",
        p90: "0.00",
        distribution: [],
      };
    }
  }, [monteCarloParams, operatingAssumptions, calculateTotalCost, buildingGFA]);

  // Calculate Scenario Analysis
  const calculateScenarioAnalysis = useMemo(() => {
    try {
      const scenarios = ["downside", "baseCase", "upside"] as const;

      return scenarios.map((scenario) => {
        const assumptions = scenarioAssumptions[scenario];

        const adjustedRent =
          operatingAssumptions.rentPSF * (1 + assumptions.rentAdjustment / 100);
        const adjustedCost =
          calculateTotalCost.total * (1 + assumptions.costAdjustment / 100);
        const adjustedCapRate =
          operatingAssumptions.capRate + assumptions.capRateAdjustment / 100;

        const adjustedNOI =
          adjustedRent * buildingGFA * (1 - operatingAssumptions.vacancy / 100);
        const adjustedYieldOnCost =
          adjustedCost > 0 ? (adjustedNOI / adjustedCost) * 100 : 0;
        const adjustedIRR =
          adjustedYieldOnCost + (adjustedYieldOnCost - adjustedCapRate) * 0.5;

        return {
          scenario:
            scenario === "baseCase"
              ? "Base Case"
              : scenario === "upside"
              ? "Upside"
              : "Downside",
          probability: assumptions.probability,
          irr: isFinite(adjustedIRR) ? adjustedIRR.toFixed(2) : "0.00",
          equityMultiple: isFinite(adjustedIRR / 10)
            ? (adjustedIRR / 10).toFixed(2)
            : "0.00",
        };
      });
    } catch (e) {
      console.error("Error calculating scenario analysis:", e);
      return [];
    }
  }, [
    scenarioAssumptions,
    operatingAssumptions,
    calculateTotalCost,
    buildingGFA,
  ]);

  // Calculate probability-weighted IRR
  const probabilityWeightedIRR = useMemo(() => {
    try {
      const weighted = calculateScenarioAnalysis.reduce((sum, scenario) => {
        const irrValue = parseFloat(scenario.irr) || 0;
        const probability = scenario.probability || 0;
        return sum + (irrValue * probability) / 100;
      }, 0);
      return weighted.toFixed(2);
    } catch (e) {
      console.error("Error calculating probability-weighted IRR:", e);
      return "0.00";
    }
  }, [calculateScenarioAnalysis]);

  // Calculate Distributions
  const calculateDistributions = useMemo(() => {
    try {
      if (
        !calculateCashFlows ||
        !calculateCashFlows.cashFlows ||
        calculateCashFlows.cashFlows.length <= 1
      ) {
        return [];
      }

      const distributions: any[] = [];
      let lpCumulative = 0;
      let gpCumulative = 0;

      calculateCashFlows.cashFlows.slice(1).forEach((cf) => {
        const annualCashFlow = cf.cashFlow - (cf.exitProceeds || 0);
        const quarterlyCashFlow = annualCashFlow / 4;

        for (let q = 1; q <= 4; q++) {
          const lpDist = quarterlyCashFlow * (equityStructure.lpEquity / 100);
          const gpDist = quarterlyCashFlow * (equityStructure.gpEquity / 100);

          lpCumulative += lpDist;
          gpCumulative += gpDist;

          distributions.push({
            year: cf.year,
            quarter: q,
            cashAvailable: quarterlyCashFlow,
            lpDistribution: lpDist,
            gpDistribution: gpDist,
            lpCumulative: lpCumulative,
            gpCumulative: gpCumulative,
          });
        }
      });

      return distributions;
    } catch (e) {
      console.error("Error calculating distributions:", e);
      return [];
    }
  }, [calculateCashFlows, equityStructure]);

  // Helper functions
  const formatSensitivityLabel = (variable: string) => {
    switch (variable) {
      case "rent":
        return "Rent PSF";
      case "construction":
        return "Construction Costs";
      case "capRate":
        return "Exit Cap Rate";
      case "interestRate":
        return "Interest Rate";
      default:
        return variable;
    }
  };

  const getSensitivityColor = (delta: number) => {
    const absChange = Math.abs(delta);
    if (delta > 0) {
      if (absChange > 5) return "bg-green-500 text-white";
      if (absChange > 3) return "bg-green-400 text-white";
      if (absChange > 1) return "bg-green-300";
      return "bg-green-100";
    } else {
      if (absChange > 5) return "bg-red-500 text-white";
      if (absChange > 3) return "bg-red-400 text-white";
      if (absChange > 1) return "bg-red-300";
      return "bg-red-100";
    }
  };

  // Chart data
  const cashFlowChartData = calculateCashFlows?.cashFlows
    ? calculateCashFlows.cashFlows.map((cf) => ({
        year: `Year ${cf.year}`,
        cashFlow: cf.cashFlow - (cf.exitProceeds || 0) - (cf.refinanceProceeds || 0),
        noi: cf.noi,
        refinanceProceeds: cf.refinanceProceeds || 0,
      }))
    : [];

  const cashOnCashChartData = calculateCashOnCashReturns.map((data) => ({
    year: `Year ${data.year}`,
    cashOnCash: Number(data.cashOnCash.toFixed(2)),
    yieldOnCost: Number(data.yieldOnCost.toFixed(2)),
    cumulativeCashOnCash: Number(data.cumulativeCashOnCash.toFixed(2)),
  }));

  const sourcesUsesData = [
    {
      name: "Senior Debt",
      value: calculateFinancing.constructionLoanAmount || 0,
    },
    { name: "LP Equity", value: calculateFinancing.lpEquity || 0 },
    { name: "GP Equity", value: calculateFinancing.totalGPCommitment || 0 },
  ].filter((item) => item.value > 0);

  const distributionChartData = calculateDistributions
    .slice(0, 20)
    .map((d) => ({
      period: `Y${d.year}Q${d.quarter}`,
      lpDist: d.lpDistribution || 0,
      gpDist: d.gpDistribution || 0,
    }));

  const monteCarloChartData = useMemo(() => {
    try {
      const bins = 20;
      const data = runMonteCarloSimulation.distribution;
      if (!data || data.length === 0) return [];

      const min = Math.min(...data);
      const max = Math.max(...data);
      const binSize = (max - min) / bins || 1;

      const histogram = Array(bins)
        .fill(0)
        .map((_, i) => {
          const binMin = min + i * binSize;
          const binMax = binMin + binSize;
          const count = data.filter((v) => v >= binMin && v < binMax).length;
          return {
            irr: `${binMin.toFixed(1)}-${binMax.toFixed(1)}`,
            count: count,
            probability: data.length > 0 ? (count / data.length) * 100 : 0,
          };
        });

      return histogram;
    } catch (e) {
      console.error("Error creating Monte Carlo chart data:", e);
      return [];
    }
  }, [runMonteCarloSimulation]);

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B"];

  // Save/Load Functions
  const saveScenario = () => {
    try {
      const scenarioNameToUse =
        scenarioName.trim() ||
        `${propertyTypes[propertyType].name}_${new Date()
          .toLocaleDateString()
          .replace(/\//g, "-")}`;

      const scenario = {
        id: Date.now().toString(),
        name: scenarioNameToUse,
        date: new Date().toISOString(),
        summary: {
          propertyType: propertyTypes[propertyType].name,
          totalCost: calculateTotalCost.total,
          irr: combinedReturns.irr,
          equityMultiple: combinedReturns.equityMultiple,
        },
        data: {
          propertyType,
          projectName,
          landCost,
          siteAreaAcres,
          buildingGFA,
          parkingRatio,
          includeParking,
          parkingRevenue,
          hardCosts,
          softCosts,
          timeline,
          constructionLoan,
          permanentLoan,
          equityStructure,
          waterfallTiers,
          operatingAssumptions,
          rentEscalations,
          unitMix,
          salesAssumptions,
          salesPhasing,
          tenants,
          leasingAssumptions,
          scenarioAssumptions,
          monteCarloParams,
          cottonwoodHeights,
        },
      };

      const updatedScenarios = [...savedScenarios, scenario];
      setSavedScenarios(updatedScenarios);
      localStorage.setItem(
        "realEstateProFormaScenarios",
        JSON.stringify(updatedScenarios)
      );

      setShowSaveDialog(false);
      setScenarioName("");
      alert("Scenario saved successfully!");
    } catch (e) {
      console.error("Error saving scenario:", e);
      alert("Error saving scenario. Please try again.");
    }
  };

  const loadScenarioV1 = (scenario: any) => {
    try {
      const data = scenario.data;
      setPropertyType(data.propertyType);
      setProjectName(data.projectName);
      setLandCost(data.landCost);
      setSiteAreaAcres(data.siteAreaAcres);
      setBuildingGFA(data.buildingGFA);
      setParkingRatio(data.parkingRatio);
      setIncludeParking(data.includeParking);
      setParkingRevenue(data.parkingRevenue || parkingRevenue);
      setHardCosts(data.hardCosts);
      setSoftCosts(data.softCosts);
      setTimeline(data.timeline);
      setConstructionLoan(data.constructionLoan);
      setPermanentLoan(data.permanentLoan);
      setEquityStructure(data.equityStructure);
      setWaterfallTiers(data.waterfallTiers);
      setOperatingAssumptions(data.operatingAssumptions);
      setRentEscalations(data.rentEscalations);
      setUnitMix(data.unitMix);
      setSalesAssumptions(data.salesAssumptions || salesAssumptions);
      setSalesPhasing(data.salesPhasing || salesPhasing);
      setTenants(data.tenants);
      setLeasingAssumptions(data.leasingAssumptions);
      setScenarioAssumptions(data.scenarioAssumptions || scenarioAssumptions);
      setMonteCarloParams(data.monteCarloParams || monteCarloParams);
      if (data.cottonwoodHeights) {
        setCottonwoodHeights(data.cottonwoodHeights);
      }

      alert(`Loaded scenario: ${scenario.name}`);
    } catch (e) {
      console.error("Error loading scenario:", e);
      alert("Error loading scenario. The saved data may be corrupted.");
    }
  };

  const deleteScenarioV1 = (id: string) => {
    try {
      const updatedScenarios = savedScenarios.filter((s) => s.id !== id);
      setSavedScenarios(updatedScenarios);
      localStorage.setItem(
        "realEstateProFormaScenarios",
        JSON.stringify(updatedScenarios)
      );
    } catch (e) {
      console.error("Error deleting scenario:", e);
    }
  };

  // CSV Export Function
  const exportToCSV = useCallback(() => {
    try {
      // Prepare data for CSV export
      const summaryData = [
        ["REAL ESTATE DEVELOPMENT PRO FORMA"],
        ["Project Name", projectName],
        ["Property Type", propertyTypes[propertyType].name],
        ["Date", new Date().toLocaleDateString()],
        [""],
        ["KEY METRICS"],
        ["Total Development Cost", calculateTotalCost.total],
        ["Total Equity Required", calculateFinancing.equityRequired],
        ["Project IRR", combinedReturns.irr + "%"],
        ["Equity Multiple", combinedReturns.equityMultiple + "x"],
        [""],
        ["DEVELOPMENT COSTS"],
        ["Land Cost", landCost],
        ["Hard Costs", calculateTotalCost.hardCost],
        ["Soft Costs", calculateTotalCost.softCost],
        ["Developer Fee", calculateTotalCost.developerFee],
        [""],
        ["FINANCING"],
        ["Construction Loan", calculateFinancing.constructionLoanAmount],
        ["Construction Interest", calculateFinancing.constructionInterest],
        ["Permanent Loan", calculateCashFlows?.permanentLoanAmount || 0],
        [""],
        ["RETURNS"],
        ["LP IRR", combinedReturns.lpIRR + "%"],
        ["GP IRR", combinedReturns.gpIRR + "%"],
        ["Average Cash-on-Cash", combinedReturns.avgCashOnCash + "%"],
        [""],
        [
          "SENSITIVITY ANALYSIS - " +
            (sensitivityVariable === "rent"
              ? "RENT PSF"
              : sensitivityVariable === "construction"
              ? "CONSTRUCTION COSTS"
              : sensitivityVariable === "capRate"
              ? "EXIT CAP RATE"
              : "INTEREST RATE"),
        ],
        ["Change %", "IRR", "Delta from Base"],
      ];

      // Add sensitivity data
      calculateSensitivityAnalysis.forEach((item) => {
        summaryData.push([
          item.change + "%",
          item.irr.toFixed(2) + "%",
          item.delta.toFixed(2) + "%",
        ]);
      });

      summaryData.push([""]);
      summaryData.push(["CASH FLOWS"]);
      summaryData.push([
        "Year",
        "Gross Revenue",
        "Operating Expenses",
        "NOI",
        "Debt Service",
        "Cash Flow",
        "Cumulative Cash Flow",
      ]);

      // Add cash flow data
      if (
        calculateCashFlows?.cashFlows &&
        calculateCashFlows.cashFlows.length > 0
      ) {
        calculateCashFlows.cashFlows.forEach((cf) => {
          summaryData.push([
            cf.year,
            cf.grossRevenue || 0,
            cf.operatingExpenses || 0,
            cf.noi,
            cf.debtService,
            cf.cashFlow,
            cf.cumulativeCashFlow,
          ]);
        });
      }

      // Convert to CSV string
      const csvContent = summaryData
        .map((row) =>
          row
            .map((cell) => {
              // Handle numbers and strings
              const cellStr = cell?.toString() || "";
              // Escape quotes and wrap in quotes if contains comma
              return cellStr.includes(",")
                ? `"${cellStr.replace(/"/g, '""')}"`
                : cellStr;
            })
            .join(",")
        )
        .join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${projectName.replace(/\s+/g, "_")}_ProForma_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Error exporting to CSV:", e);
      alert("Error exporting to CSV. Please try again.");
    }
  }, [
    projectName,
    propertyType,
    calculateTotalCost,
    calculateFinancing,
    combinedReturns,
    landCost,
    calculateCashFlows,
    propertyTypes,
    calculateSensitivityAnalysis,
    sensitivityVariable,
  ]);
  const [showPDFExport, setShowPDFExport] = useState(false);
  const [showGoalSeek, setShowGoalSeek] = useState(false);

  const exportToPDF = () => {
    setShowPDFExport(true);
  };

  // Prepare data for PDF export
  const preparePDFData = () => {
    const projectData = {
      // Key Metrics
      totalCost: calculateTotalCost.total,
      equityRequired: calculateFinancing.equityRequired,
      irr: combinedReturns.irr,
      equityMultiple: combinedReturns.equityMultiple,
      avgCashOnCash: combinedReturns.avgCashOnCash,
      yieldOnCost: calculateAdditionalMetrics.yieldOnCost,
      developmentSpread: calculateAdditionalMetrics.developmentSpread,
      
      // Property Details
      siteArea: siteAreaAcres,
      buildingGFA: buildingGFA,
      units: propertyType === "apartment" ? unitMix.reduce((sum, unit) => sum + unit.units, 0) : 
             propertyType === "forSale" ? salesAssumptions.totalUnits : undefined,
      parkingSpaces: calculateTotalCost.parkingSpaces,
      
      // Financial Details
      landCost: calculateLandCost,
      hardCosts: calculateTotalCost.hardCost,
      softCosts: calculateTotalCost.softCost,
      developerFee: calculateTotalCost.developerFee,
      constructionLoanAmount: calculateFinancing.constructionLoanAmount,
      permanentLoanAmount: calculateCashFlows?.permanentLoanAmount || 0,
      lpEquity: calculateFinancing.lpEquity,
      gpEquity: calculateFinancing.totalGPCommitment,
      
      // Operating Assumptions
      rentPSF: propertyType !== "apartment" && propertyType !== "forSale" ? operatingAssumptions.rentPSF : undefined,
      avgUnitRent: propertyType === "apartment" ? 
        unitMix.reduce((sum, unit) => sum + (unit.units * unit.rent), 0) / 
        unitMix.reduce((sum, unit) => sum + unit.units, 0) : undefined,
      vacancy: operatingAssumptions.vacancy,
      opex: operatingAssumptions.opex,
      capRate: operatingAssumptions.capRate,
      holdPeriod: operatingAssumptions.holdPeriod,
      
      // Cottonwood Heights Specific
      cottonwoodHeights: propertyType === "cottonwoodHeights" ? {
        commercialNOI: calculateCrossSubsidy.commercialNOI,
        marketRateNOI: calculateCrossSubsidy.marketRateNOI,
        tifRevenue: calculateTIFAnalysis.annualRevenue,
        crossSubsidy: calculateCrossSubsidy.netSubsidy,
      } : undefined,
    };

    const chartData = {
      cashFlowData: calculateCashFlows?.cashFlows?.map(cf => ({
        year: cf.year,
        noi: cf.noi || 0,
        cashFlow: cf.cashFlow || 0,
        cumulativeCashFlow: cf.cumulativeCashFlow || 0,
      })) || [],
      sensitivityData: [],
      sourcesUsesData: sourcesUsesData.map(item => ({
        ...item,
        percentage: calculateTotalCost.total > 0 ? (item.value / calculateTotalCost.total) * 100 : 0,
      })),
    };

    return { projectData, chartData };
  };

  const addTenant = () => {
    setTenants([
      ...tenants,
      {
        name: `Tenant ${tenants.length + 1}`,
        sf: 5000,
        rentPSF: operatingAssumptions.rentPSF,
        term: 5,
        freeRent: 0,
        tiPSF: 35,
        startMonth: 0,
        renewalProbability: 70,
        percentageRent: propertyType === "retail",
        breakpoint: 0,
      },
    ]);
  };

  const removeTenant = (index: number) => {
    setTenants(tenants.filter((_, i) => i !== index));
  };

  const updateTenant = (index: number, field: string, value: any) => {
    const updated = [...tenants];
    updated[index] = { ...updated[index], [field]: value };
    setTenants(updated);
  };

  // Add sales phase
  const addSalesPhase = () => {
    const totalUnitsInPhases = salesPhasing.reduce(
      (sum, phase) => sum + phase.units,
      0
    );
    const remainingUnits = salesAssumptions.totalUnits - totalUnitsInPhases;

    if (remainingUnits > 0) {
      setSalesPhasing([
        ...salesPhasing,
        {
          phase: salesPhasing.length + 1,
          units: Math.min(30, remainingUnits),
          startMonth: salesPhasing.length * 6,
          deliveryMonth: timeline.construction + salesPhasing.length * 6,
        },
      ]);
    }
  };

  const updateSalesPhase = (index: number, field: string, value: any) => {
    const updated = [...salesPhasing];
    updated[index] = { ...updated[index], [field]: value };
    setSalesPhasing(updated);
  };

  const removeSalesPhase = (index: number) => {
    setSalesPhasing(salesPhasing.filter((_, i) => i !== index));
  };

  // Calculate total leased SF
  const totalLeasedSF = useMemo(() => {
    return tenants.reduce((sum, tenant) => sum + tenant.sf, 0);
  }, [tenants]);

  // Add unit type function
  const addUnitType = () => {
    setUnitMix([
      ...unitMix,
      {
        type: `Type ${unitMix.length + 1}`,
        units: 10,
        size: 800,
        rent: 2000,
        marketRent: 2100,
      },
    ]);
  };

  const updateUnitMix = (index: number, field: string, value: any) => {
    const updated = [...unitMix];
    updated[index] = { ...updated[index], [field]: value };
    setUnitMix(updated);
  };

  const removeUnitType = (index: number) => {
    setUnitMix(unitMix.filter((_, i) => i !== index));
  };

  // v2 Scenario Management Functions
  const getCurrentScenarioData = (): ScenarioData => {
    return {
      propertyType,
      projectName,
      landCost,
      siteAreaAcres,
      buildingGFA,
      parkingRatio,
      includeParking,
      parkingRevenue,
      hardCosts,
      softCosts,
      timeline,
      constructionLoan,
      permanentLoan,
      equityStructure,
      waterfallTiers,
      operatingAssumptions,
      rentEscalations,
      unitMix,
      salesAssumptions,
      salesPhasing,
      tenants,
      leasingAssumptions,
      scenarioAssumptions,
      monteCarloParams,
      cottonwoodHeights,
    };
  };

  const getCurrentScenarioMetrics = (): ScenarioMetrics => {
    return {
      irr: combinedReturns.irr,
      equityMultiple: combinedReturns.equityMultiple,
      totalCost: calculateTotalCost.total,
      totalEquity: calculateFinancing.equityRequired,
      avgCashOnCash: combinedReturns.avgCashOnCash,
      yieldOnCost: calculateAdditionalMetrics.yieldOnCost,
    };
  };

  const saveCurrentScenario = async (name: string, description?: string) => {
    setIsSaving(true);
    
    const scenario: Scenario = {
      id: activeScenarioId || Date.now().toString(),
      name,
      description,
      createdAt: activeScenarioId ? scenarios.find(s => s.id === activeScenarioId)?.createdAt || new Date() : new Date(),
      updatedAt: new Date(),
      isActive: true,
      data: getCurrentScenarioData(),
      metrics: getCurrentScenarioMetrics(),
    };

    // Deactivate other scenarios
    const updatedScenarios = scenarios.map(s => ({ ...s, isActive: false }));
    
    if (activeScenarioId) {
      // Update existing scenario
      const index = updatedScenarios.findIndex(s => s.id === activeScenarioId);
      if (index >= 0) {
        updatedScenarios[index] = scenario;
      }
    } else {
      // Add new scenario
      updatedScenarios.push(scenario);
      setActiveScenarioId(scenario.id);
    }

    setScenarios(updatedScenarios);
    await saveScenarioToDB(scenario);
    setLastSaved(new Date());
    setHasUnsavedChanges(false);
    
    // Reset the saving flag after a short delay to ensure state updates complete
    setTimeout(() => setIsSaving(false), 100);
  };

  const loadScenario = (scenarioId: string) => {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return;

    const data = scenario.data;
    setPropertyType(data.propertyType);
    setProjectName(data.projectName);
    setLandCost(data.landCost);
    setSiteAreaAcres(data.siteAreaAcres);
    setBuildingGFA(data.buildingGFA);
    setParkingRatio(data.parkingRatio);
    setIncludeParking(data.includeParking);
    setParkingRevenue(data.parkingRevenue);
    setHardCosts(data.hardCosts);
    setSoftCosts(data.softCosts);
    setTimeline(data.timeline);
    setConstructionLoan(data.constructionLoan);
    setPermanentLoan(data.permanentLoan);
    setEquityStructure(data.equityStructure);
    setWaterfallTiers(data.waterfallTiers);
    setOperatingAssumptions(data.operatingAssumptions);
    setRentEscalations(data.rentEscalations);
    setUnitMix(data.unitMix);
    setSalesAssumptions(data.salesAssumptions);
    setSalesPhasing(data.salesPhasing);
    setTenants(data.tenants);
    setLeasingAssumptions(data.leasingAssumptions);
    setScenarioAssumptions(data.scenarioAssumptions);
    setMonteCarloParams(data.monteCarloParams);
    if (data.cottonwoodHeights) {
      setCottonwoodHeights(data.cottonwoodHeights);
    }

    setActiveScenarioId(scenarioId);
    setHasUnsavedChanges(false);
    
    // Update active status
    const updatedScenarios = scenarios.map(s => ({
      ...s,
      isActive: s.id === scenarioId
    }));
    setScenarios(updatedScenarios);
  };

  const duplicateScenario = async (scenarioId: string) => {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return;

    const newScenario: Scenario = {
      ...scenario,
      id: Date.now().toString(),
      name: `${scenario.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: false,
    };

    setScenarios([...scenarios, newScenario]);
    await saveScenarioToDB(newScenario);
  };

  const deleteScenario = async (scenarioId: string) => {
    if (activeScenarioId === scenarioId) {
      alert("Cannot delete active scenario. Please switch to another scenario first.");
      return;
    }

    setScenarios(scenarios.filter(s => s.id !== scenarioId));
    await deleteScenarioFromDB(scenarioId);
  };

  const updateScenarioName = async (scenarioId: string, newName: string) => {
    const updatedScenarios = scenarios.map(s => 
      s.id === scenarioId 
        ? { ...s, name: newName, updatedAt: new Date() }
        : s
    );
    setScenarios(updatedScenarios);
    
    const scenario = updatedScenarios.find(s => s.id === scenarioId);
    if (scenario) {
      await saveScenarioToDB(scenario);
    }
    
    setEditingScenarioId(null);
    setEditingScenarioName("");
  };

  // Goal Seek callback to test different input values
  const handleGoalSeekRecalculate = useCallback((variable: string, value: number) => {
    // This is a simplified calculation for the goal seek solver
    // In a production environment, this would trigger a full recalculation
    // with the test value applied temporarily
    
    // Get current metrics as baseline
    const currentIRR = parseFloat(combinedReturns.irr) || 0;
    const currentEquityMultiple = parseFloat(combinedReturns.equityMultiple) || 0;
    const currentYieldOnCost = parseFloat(calculateAdditionalMetrics.yieldOnCost) || 0;
    const currentCashOnCash = parseFloat(combinedReturns.avgCashOnCash) || 0;
    
    // Calculate current NPV
    const discountRate = 0.10;
    let currentNPV = -calculateFinancing.equityRequired;
    calculateCashFlows.cashFlows.forEach((cf, index) => {
      if (index > 0) {
        currentNPV += cf.cashFlow / Math.pow(1 + discountRate, index);
      }
    });

    // Apply sensitivity adjustments based on variable
    let sensitivityFactor = 0;
    switch (variable) {
      case 'rent':
        // Rent typically has high impact on metrics
        sensitivityFactor = (value - operatingAssumptions.rentPSF) / operatingAssumptions.rentPSF;
        return {
          irr: currentIRR * (1 + sensitivityFactor * 0.8),
          npv: currentNPV * (1 + sensitivityFactor * 1.2),
          equityMultiple: currentEquityMultiple * (1 + sensitivityFactor * 0.6),
          yieldOnCost: (buildingGFA * value * 12 * (1 - operatingAssumptions.vacancy / 100) - buildingGFA * operatingAssumptions.opex * 12) / calculateTotalCost.total * 100,
          cashOnCash: currentCashOnCash * (1 + sensitivityFactor * 0.7),
        };
      case 'costs':
        // Costs have inverse impact
        const currentHardCostPSF = hardCosts.coreShell + hardCosts.tenantImprovements;
        sensitivityFactor = (value - currentHardCostPSF) / currentHardCostPSF;
        const hardCostWithContingency = (buildingGFA * value) * (1 + hardCosts.contingency / 100);
        const softCostEstimate = calculateTotalCost.softCost * (hardCostWithContingency / calculateTotalCost.hardCost);
        const newTotalCost = calculateLandCost + hardCostWithContingency + softCostEstimate;
        return {
          irr: currentIRR * (1 - sensitivityFactor * 0.5),
          npv: currentNPV * (1 - sensitivityFactor * 0.8),
          equityMultiple: currentEquityMultiple * (1 - sensitivityFactor * 0.4),
          yieldOnCost: (calculateCashFlows.year1NOI / newTotalCost) * 100,
          cashOnCash: currentCashOnCash * (1 - sensitivityFactor * 0.3),
        };
      case 'leverage':
        // Leverage affects return metrics
        sensitivityFactor = (value - permanentLoan.ltv) / permanentLoan.ltv;
        return {
          irr: currentIRR * (1 + sensitivityFactor * 0.3),
          npv: currentNPV, // NPV doesn't change with leverage
          equityMultiple: currentEquityMultiple * (1 + sensitivityFactor * 0.2),
          yieldOnCost: currentYieldOnCost, // Yield on cost doesn't change with leverage
          cashOnCash: currentCashOnCash * (1 + sensitivityFactor * 0.5),
        };
      case 'capRate':
      case 'exitCap':
        // Cap rate affects exit value
        const currentCap = operatingAssumptions.capRate;
        sensitivityFactor = (currentCap - value) / currentCap; // Inverse relationship
        return {
          irr: currentIRR * (1 + sensitivityFactor * 0.6),
          npv: currentNPV * (1 + sensitivityFactor * 0.9),
          equityMultiple: currentEquityMultiple * (1 + sensitivityFactor * 0.5),
          yieldOnCost: currentYieldOnCost,
          cashOnCash: currentCashOnCash,
        };
      default:
        return {
          irr: currentIRR,
          npv: currentNPV,
          equityMultiple: currentEquityMultiple,
          yieldOnCost: currentYieldOnCost,
          cashOnCash: currentCashOnCash,
        };
    }
  }, [propertyType, operatingAssumptions, buildingGFA, calculateTotalCost, permanentLoan, combinedReturns, calculateAdditionalMetrics, calculateFinancing, calculateCashFlows, hardCosts, calculateLandCost]);

  // Handle applying the goal seek solution
  const handleGoalSeekSolutionFound = useCallback((variable: string, value: number) => {
    switch (variable) {
      case 'rent':
        setOperatingAssumptions(prev => ({ ...prev, rentPSF: value }));
        break;
      case 'costs':
        // Split the cost PSF between core shell and TI
        const ratio = hardCosts.coreShell / (hardCosts.coreShell + hardCosts.tenantImprovements);
        setHardCosts(prev => ({ 
          ...prev, 
          coreShell: value * ratio,
          tenantImprovements: value * (1 - ratio)
        }));
        break;
      case 'leverage':
        setPermanentLoan(prev => ({ ...prev, ltv: value }));
        break;
      case 'capRate':
        setOperatingAssumptions(prev => ({ ...prev, capRate: value }));
        break;
      case 'exitCap':
        // Since we don't have separate exit cap, use the same cap rate
        setOperatingAssumptions(prev => ({ ...prev, capRate: value }));
        break;
    }
    setShowGoalSeek(false);
  }, []);

  // Load scenarios from IndexedDB on mount
  useEffect(() => {
    const loadScenarios = async () => {
      try {
        const loadedScenarios = await loadScenariosFromDB();
        setScenarios(loadedScenarios);
        
        const activeScenario = loadedScenarios.find(s => s.isActive);
        if (activeScenario) {
          setActiveScenarioId(activeScenario.id);
          // Will load scenario after component mounts
        }
      } catch (error) {
        console.error("Error loading scenarios:", error);
      }
    };
    loadScenarios();
  }, []);

  // Load active scenario only when explicitly changed
  useEffect(() => {
    // Only load when activeScenarioId changes (not on save)
    if (activeScenarioId && scenarios.length > 0 && !isSaving) {
      const activeScenario = scenarios.find(s => s.id === activeScenarioId);
      if (activeScenario) {
        // Only load if this is actually a different scenario
        const currentData = getCurrentScenarioData();
        if (activeScenario.data.projectName !== currentData.projectName) {
          loadScenario(activeScenarioId);
        }
      }
    }
  }, [activeScenarioId]); // Only depend on activeScenarioId

  // Track unsaved changes
  useEffect(() => {
    if (activeScenarioId && !isSaving) {
      setHasUnsavedChanges(true);
    }
  }, [
    propertyType, projectName, landCost, siteAreaAcres, buildingGFA,
    hardCosts, softCosts, timeline, constructionLoan, permanentLoan,
    equityStructure, operatingAssumptions, salesAssumptions, unitMix
  ]);

  // Keyboard shortcut for saving (Ctrl+S or Cmd+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeScenarioId && hasUnsavedChanges && !isSaving) {
          const activeScenario = scenarios.find(s => s.id === activeScenarioId);
          if (activeScenario) {
            saveCurrentScenario(activeScenario.name, activeScenario.description);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeScenarioId, hasUnsavedChanges, isSaving, scenarios]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-gray-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Mobile Header */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between">
              <OnyxLogo height={32} className="hover:scale-105 transition-transform cursor-pointer" />
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 text-gray-100 hover:bg-gray-800 rounded-lg transition-colors"
              >
                {showMobileMenu ? <CloseIcon size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
          
          {/* Desktop Header */}
          <div className="hidden lg:flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Onyx Logo */}
              <OnyxLogo 
                height={40} 
                className="hover:scale-105 transition-transform cursor-pointer"
              />
              <div className="border-l border-gray-700 pl-6 flex items-center gap-4">
                <div>
                  <h1 className="text-xl font-bold text-gray-100">Onyx Pro Forma Calculator</h1>
                  <p className="text-sm text-gray-400">Institutional-Grade Investment Analysis</p>
                </div>
                {activeScenarioId && (
                  <span className="ml-4 text-sm text-gray-400">
                    {isSaving ? (
                      <span className="flex items-center gap-1">
                        <span className="animate-pulse">Saving...</span>
                      </span>
                    ) : hasUnsavedChanges ? (
                      <span className="text-yellow-400">Unsaved changes</span>
                    ) : lastSaved ? (
                      `Last saved ${lastSaved.toLocaleTimeString()}`
                    ) : null}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {/* v2 Scenario Management Buttons */}
              <button
                onClick={() => setShowScenarioManager(true)}
                className="px-4 py-2 bg-yellow-600 text-gray-900 rounded-lg hover:bg-yellow-500 font-medium flex items-center gap-2 transition-colors"
              >
                <Briefcase size={20} />
                Scenarios
              </button>
              <button
                onClick={() => setShowScenarioComparison(true)}
                className="px-4 py-2 bg-gray-700 text-gray-100 rounded-lg hover:bg-gray-600 border border-gray-600 flex items-center gap-2 transition-colors"
                disabled={scenarios.length < 2}
              >
                <BarChartIcon size={20} />
                Compare
              </button>
              {/* Manual Save Button */}
              <button
                onClick={async () => {
                  if (activeScenarioId) {
                    const activeScenario = scenarios.find(s => s.id === activeScenarioId);
                    if (activeScenario) {
                      await saveCurrentScenario(activeScenario.name, activeScenario.description);
                    }
                  } else {
                    setShowSaveDialog(true);
                  }
                }}
                disabled={isSaving}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  hasUnsavedChanges 
                    ? 'bg-yellow-600 text-gray-900 hover:bg-yellow-500 font-medium animate-pulse' 
                    : 'bg-gray-700 text-gray-100 hover:bg-gray-600 border border-gray-600'
                }`}
              >
                <Save size={20} />
                {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved'}
              </button>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-gray-700 text-gray-100 rounded-lg hover:bg-gray-600 border border-gray-600 flex items-center gap-2 transition-colors"
              >
                <Download size={20} />
                Export CSV
              </button>
              <button
                onClick={exportToPDF}
                className="px-4 py-2 bg-yellow-600 text-gray-900 rounded-lg hover:bg-yellow-500 font-medium flex items-center gap-2 transition-colors"
              >
                <FileText size={20} />
                Export PDF
              </button>
              <button
                onClick={() => setShowGoalSeek(true)}
                className="px-4 py-2 bg-gray-700 text-gray-100 rounded-lg hover:bg-gray-600 border border-gray-600 flex items-center gap-2 transition-colors"
              >
                <Target size={20} />
                Goal Seek
              </button>
              <button
                onClick={() => setShowApiKeyModal(true)}
                className="px-3 py-2 bg-gray-800 text-gray-100 rounded-lg hover:bg-gray-700 border border-gray-700 flex items-center gap-2 transition-colors"
                title="API Settings"
              >
                <Settings size={20} />
              </button>
            </div>
          </div>
          
          {/* Mobile Menu */}
          {showMobileMenu && (
            <div className="lg:hidden mt-4 space-y-2 pb-4 border-t border-gray-800 pt-4">
              <button
                onClick={() => { setShowScenarioManager(true); setShowMobileMenu(false); }}
                className="w-full px-4 py-2 bg-yellow-600 text-gray-900 rounded-lg hover:bg-yellow-500 font-medium flex items-center gap-2 transition-colors"
              >
                <Briefcase size={20} />
                Scenarios
              </button>
              <button
                onClick={() => { setShowScenarioComparison(true); setShowMobileMenu(false); }}
                className="w-full px-4 py-2 bg-gray-700 text-gray-100 rounded-lg hover:bg-gray-600 border border-gray-600 flex items-center gap-2 transition-colors"
                disabled={scenarios.length < 2}
              >
                <BarChartIcon size={20} />
                Compare
              </button>
              <button
                onClick={() => { setShowSaveDialog(true); setShowMobileMenu(false); }}
                className="w-full px-4 py-2 bg-gray-700 text-gray-100 rounded-lg hover:bg-gray-600 border border-gray-600 flex items-center gap-2 transition-colors"
              >
                <Save size={20} />
                Save
              </button>
              <button
                onClick={() => { exportToCSV(); setShowMobileMenu(false); }}
                className="w-full px-4 py-2 bg-gray-700 text-gray-100 rounded-lg hover:bg-gray-600 border border-gray-600 flex items-center gap-2 transition-colors"
              >
                <Download size={20} />
                Export CSV
              </button>
              <button
                onClick={() => { exportToPDF(); setShowMobileMenu(false); }}
                className="w-full px-4 py-2 bg-yellow-600 text-gray-900 rounded-lg hover:bg-yellow-500 font-medium flex items-center gap-2 transition-colors"
              >
                <FileText size={20} />
                Export PDF
              </button>
              <button
                onClick={() => { setShowGoalSeek(true); setShowMobileMenu(false); }}
                className="w-full px-4 py-2 bg-gray-700 text-gray-100 rounded-lg hover:bg-gray-600 border border-gray-600 flex items-center gap-2 transition-colors"
              >
                <Target size={20} />
                Goal Seek
              </button>
              <button
                onClick={() => { setShowApiKeyModal(true); setShowMobileMenu(false); }}
                className="w-full px-3 py-2 bg-gray-800 text-gray-100 rounded-lg hover:bg-gray-700 border border-gray-700 flex items-center gap-2 transition-colors"
              >
                <Settings size={20} />
                API Settings
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4">
        {/* Property Type Selection */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Property Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(
                Object.keys(propertyTypes) as Array<keyof typeof propertyTypes>
              ).map((key) => {
                const type = propertyTypes[key];
                const Icon = type.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setPropertyType(key)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      propertyType === key
                        ? "border-yellow-500 bg-yellow-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <Icon
                      className={`w-8 h-8 mx-auto mb-2 ${
                        propertyType === key ? "text-yellow-600" : "text-gray-500"
                      }`}
                    />
                    <p
                      className={`font-medium ${
                        propertyType === key ? "text-yellow-900" : "text-gray-700"
                      }`}
                    >
                      {type.name}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="mt-4 flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">
              Input Mode:
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode("simple")}
                className={`px-4 py-2 rounded-lg ${
                  mode === "simple"
                    ? "bg-yellow-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Simple
              </button>
              <button
                onClick={() => setMode("detailed")}
                className={`px-4 py-2 rounded-lg ${
                  mode === "detailed"
                    ? "bg-yellow-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Detailed
              </button>
            </div>
          </div>
        </div>

        {/* Validation Warnings */}
        {validationWarnings.length > 0 && (
          <div className="space-y-3 mb-6">
            {validationWarnings.filter((w) => w.severity === "error").length >
              0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <AlertTriangle className="text-red-600 mr-2" size={20} />
                  <h3 className="font-semibold text-red-900">
                    Critical Issues
                  </h3>
                </div>
                <ul className="space-y-1 text-sm text-red-800">
                  {validationWarnings
                    .filter((w) => w.severity === "error")
                    .map((warning, index) => (
                      <li key={index}>
                        • {warning.field}: {warning.message}
                      </li>
                    ))}
                </ul>
              </div>
            )}
            {validationWarnings.filter((w) => w.severity === "warning").length >
              0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <AlertTriangle className="text-yellow-600 mr-2" size={20} />
                  <h3 className="font-semibold text-yellow-900">Warnings</h3>
                </div>
                <ul className="space-y-1 text-sm text-yellow-800">
                  {validationWarnings
                    .filter((w) => w.severity === "warning")
                    .map((warning, index) => (
                      <li key={index}>
                        • {warning.field}: {warning.message}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Inputs */}
          <div className="lg:col-span-2 space-y-6">
            {/* Land & Site Section */}
            <div className="bg-white rounded-lg shadow-sm">
              <button
                onClick={() => toggleSection("land")}
                className="w-full p-4 flex justify-between items-center hover:bg-gray-50"
              >
                <h2 className="text-xl font-semibold">Land & Site</h2>
                {expandedSections.land ? <ChevronDown /> : <ChevronRight />}
              </button>
              {expandedSections.land && (
                <div className="p-4 border-t space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {propertyType !== "cottonwoodHeights" ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Land Cost
                        </label>
                        <input
                          type="text"
                          value={formatNumber(landCost)}
                          onChange={(e) =>
                            handleFormattedInput(e.target.value, setLandCost)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        />
                      </div>
                    ) : (
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Land Parcels - Total Cost: {formatCurrency(calculateLandCost)} ({(landParcels || []).filter(p => !p.isDonated).reduce((sum, p) => sum + p.acres, 0)} purchased acres)
                        </label>
                        <div className="space-y-2">
                          <div className="mb-2 p-2 bg-blue-50 rounded">
                            <label className="text-sm text-blue-700">Quick Set Total Land Cost:</label>
                            <div className="flex gap-2 mt-1">
                              <input
                                type="number"
                                placeholder="Enter total land cost"
                                className="px-2 py-1 border border-blue-300 rounded text-sm"
                                step="100000"
                                onChange={(e) => {
                                  const totalDesired = Number(e.target.value);
                                  const purchasedAcres = (landParcels || []).filter(p => !p.isDonated).reduce((sum, p) => sum + p.acres, 0);
                                  if (purchasedAcres > 0 && totalDesired >= 0) {
                                    const pricePerAcre = Math.round(totalDesired / purchasedAcres);
                                    const updated = landParcels.map(p => ({
                                      ...p,
                                      pricePerAcre: p.isDonated ? 0 : pricePerAcre
                                    }));
                                    setLandParcels(updated);
                                  }
                                }}
                              />
                              <span className="text-sm text-gray-600 self-center">÷ {(landParcels || []).filter(p => !p.isDonated).reduce((sum, p) => sum + p.acres, 0)} acres</span>
                            </div>
                          </div>
                          {landParcels.map((parcel, index) => (
                            <div key={parcel.id} className="grid grid-cols-5 gap-2 items-center p-2 bg-gray-50 rounded">
                              <input
                                type="text"
                                value={parcel.name}
                                onChange={(e) => {
                                  if (!landParcels) return;
                                  const updated = [...landParcels];
                                  updated[index].name = e.target.value;
                                  setLandParcels(updated);
                                }}
                                className="px-2 py-1 border border-gray-300 rounded"
                                placeholder="Parcel name"
                              />
                              <input
                                type="number"
                                value={parcel.acres}
                                onChange={(e) => {
                                  if (!landParcels) return;
                                  const updated = [...landParcels];
                                  updated[index].acres = Number(e.target.value);
                                  setLandParcels(updated);
                                }}
                                className="px-2 py-1 border border-gray-300 rounded"
                                placeholder="Acres"
                                step="0.1"
                              />
                              <input
                                type="number"
                                value={parcel.pricePerAcre}
                                onChange={(e) => {
                                  if (!landParcels) return;
                                  const updated = [...landParcels];
                                  updated[index].pricePerAcre = Number(e.target.value);
                                  setLandParcels(updated);
                                }}
                                disabled={parcel.isDonated}
                                className={`px-2 py-1 border border-gray-300 rounded ${parcel.isDonated ? 'bg-gray-100' : ''}`}
                                placeholder="$/acre"
                                step="1000"
                              />
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={parcel.isDonated}
                                  onChange={(e) => {
                                    if (!landParcels) return;
                                    const updated = [...landParcels];
                                    updated[index].isDonated = e.target.checked;
                                    if (e.target.checked) {
                                      updated[index].pricePerAcre = 0;
                                    }
                                    setLandParcels(updated);
                                  }}
                                  className="mr-1"
                                />
                                Donated
                              </label>
                              <button
                                onClick={() => {
                                  setLandParcels(landParcels.filter(p => p.id !== parcel.id));
                                }}
                                className="text-red-600 hover:text-red-800"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              setLandParcels([...(landParcels || []), {
                                id: Date.now(),
                                name: `Parcel ${(landParcels || []).length + 1}`,
                                acres: 0,
                                pricePerAcre: 0,
                                isDonated: false
                              }]);
                            }}
                            className="mt-2 text-yellow-600 hover:text-yellow-800 text-sm"
                          >
                            + Add Parcel
                          </button>
                        </div>
                        
                        {/* Site Work for Cottonwood Heights */}
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-3">Site Work & Infrastructure</h4>
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Total Site Work Cost
                              </label>
                              <input
                                type="number"
                                value={cottonwoodSiteWork.totalCost}
                                onChange={(e) => setCottonwoodSiteWork({
                                  ...cottonwoodSiteWork,
                                  totalCost: Number(e.target.value)
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                step="10000"
                              />
                              <div className="mt-2 text-xs text-gray-600">
                                <div className="font-medium mb-1">Typically includes:</div>
                                <ul className="list-disc list-inside space-y-1">
                                  {cottonwoodSiteWork.includedItems.map((item, idx) => (
                                    <li key={idx}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes
                              </label>
                              <textarea
                                value={cottonwoodSiteWork.notes}
                                onChange={(e) => setCottonwoodSiteWork({
                                  ...cottonwoodSiteWork,
                                  notes: e.target.value
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                rows={2}
                                placeholder="Additional site work details or assumptions..."
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Site Area (Acres)
                      </label>
                      {propertyType === "cottonwoodHeights" ? (
                        <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg">
                          {landParcels.reduce((sum, parcel) => sum + parcel.acres, 0).toFixed(1)}
                          <span className="text-xs text-gray-500 ml-1">(from parcels)</span>
                        </div>
                      ) : (
                        <input
                          type="number"
                          value={siteAreaAcres}
                          onChange={(e) =>
                            setSiteAreaAcres(Number(e.target.value))
                          }
                          step="0.1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {propertyType === "forSale"
                          ? "Total Units"
                          : "Building GFA (SF)"}
                      </label>
                      {propertyType === "forSale" ? (
                        <input
                          type="number"
                          value={salesAssumptions.totalUnits}
                          onChange={(e) =>
                            setSalesAssumptions({
                              ...salesAssumptions,
                              totalUnits: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        />
                      ) : (
                        <input
                          type="text"
                          value={formatNumber(buildingGFA)}
                          onChange={(e) =>
                            handleFormattedInput(e.target.value, setBuildingGFA)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <input
                          type="checkbox"
                          checked={includeParking}
                          onChange={(e) => setIncludeParking(e.target.checked)}
                          className="mr-2"
                        />
                        Parking Ratio (per 1,000 SF)
                      </label>
                      <input
                        type="number"
                        value={parkingRatio}
                        onChange={(e) =>
                          setParkingRatio(Number(e.target.value))
                        }
                        disabled={!includeParking}
                        step="0.1"
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${
                          !includeParking ? "bg-gray-100" : ""
                        }`}
                      />
                    </div>
                  </div>

                  {/* Parking Revenue */}
                  {includeParking && mode === "detailed" && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-3">
                        Parking Revenue
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Monthly Rate
                          </label>
                          <input
                            type="number"
                            value={parkingRevenue.monthlyRate}
                            onChange={(e) =>
                              setParkingRevenue({
                                ...parkingRevenue,
                                monthlyRate: Number(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Reserved (%)
                          </label>
                          <input
                            type="number"
                            value={parkingRevenue.reserved}
                            onChange={(e) =>
                              setParkingRevenue({
                                ...parkingRevenue,
                                reserved: Number(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Transient Occupancy (%)
                          </label>
                          <input
                            type="number"
                            value={parkingRevenue.occupancy}
                            onChange={(e) =>
                              setParkingRevenue({
                                ...parkingRevenue,
                                occupancy: Number(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">FAR</p>
                      <p className="text-lg font-semibold">
                        {propertyType === "forSale"
                          ? (
                              (salesAssumptions.totalUnits *
                                salesAssumptions.avgUnitSize) /
                              (siteAreaAcres * 43560)
                            ).toFixed(2)
                          : (buildingGFA / (siteAreaAcres * 43560)).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Land $/SF</p>
                      <p className="text-lg font-semibold">
                        $
                        {propertyType === "forSale"
                          ? salesAssumptions.totalUnits *
                              salesAssumptions.avgUnitSize >
                            0
                            ? (
                                landCost /
                                (salesAssumptions.totalUnits *
                                  salesAssumptions.avgUnitSize)
                              ).toFixed(0)
                            : "0"
                          : buildingGFA > 0
                          ? (landCost / buildingGFA).toFixed(0)
                          : "0"}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Total Parking</p>
                      <p className="text-lg font-semibold">
                        {includeParking
                          ? calculateTotalCost.parkingSpaces
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Construction Costs Section */}
            <div className="bg-white rounded-lg shadow-sm">
              <button
                onClick={() => toggleSection("construction")}
                className="w-full p-4 flex justify-between items-center hover:bg-gray-50"
              >
                <h2 className="text-xl font-semibold">Construction Costs</h2>
                {expandedSections.construction ? (
                  <ChevronDown />
                ) : (
                  <ChevronRight />
                )}
              </button>
              {expandedSections.construction && (
                <div className="p-4 border-t space-y-4">
                  {/* For-Sale Unit Configuration */}
                  {propertyType === "forSale" && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">
                        Unit Configuration
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Number of Units
                          </label>
                          <input
                            type="number"
                            value={salesAssumptions.totalUnits}
                            onChange={(e) =>
                              setSalesAssumptions({
                                ...salesAssumptions,
                                totalUnits: Number(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Avg SF per Unit
                          </label>
                          <input
                            type="number"
                            value={salesAssumptions.avgUnitSize}
                            onChange={(e) =>
                              setSalesAssumptions({
                                ...salesAssumptions,
                                avgUnitSize: Number(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Total SF
                          </label>
                          <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg">
                            {formatNumber(getTotalUnitCount() * salesAssumptions.avgUnitSize)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">
                      Hard Costs
                    </h3>
                    {propertyType === 'cottonwoodHeights' && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm text-blue-900">
                          <div className="font-medium mb-1">Construction costs are configured per component:</div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span>• Retail: {formatNumber(cottonwoodHeights.retail.totalSF)} SF @ ${cottonwoodHeights.retail.hardCostPSF}/SF</span>
                              <span>{formatCurrency(cottonwoodHeights.retail.totalSF * cottonwoodHeights.retail.hardCostPSF)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>• Grocery: {formatNumber(cottonwoodHeights.grocery.totalSF)} SF @ ${cottonwoodHeights.grocery.hardCostPSF}/SF</span>
                              <span>{formatCurrency(cottonwoodHeights.grocery.totalSF * cottonwoodHeights.grocery.hardCostPSF)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>• Townhomes: {cottonwoodHeights.townhomes.units} units × {formatNumber(cottonwoodHeights.townhomes.avgSize)} SF @ ${cottonwoodHeights.townhomes.hardCostPSF}/SF</span>
                              <span>{formatCurrency(cottonwoodHeights.townhomes.units * cottonwoodHeights.townhomes.avgSize * cottonwoodHeights.townhomes.hardCostPSF)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {propertyType === 'forSale' && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <div className="text-sm text-blue-900">
                          <span className="font-medium">Total Construction SF:</span> {formatNumber(getTotalUnitCount() * salesAssumptions.avgUnitSize)} SF
                          <span className="text-xs ml-2">({getTotalUnitCount()} units × {formatNumber(salesAssumptions.avgUnitSize)} SF/unit)</span>
                        </div>
                      </div>
                    )}
                    {propertyType !== 'cottonwoodHeights' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Core & Shell ($/SF)
                          </label>
                          <input
                            type="number"
                            value={hardCosts.coreShell}
                            onChange={(e) =>
                              setHardCosts({
                                ...hardCosts,
                                coreShell: Number(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {propertyType === "forSale"
                              ? "Interior Finishes ($/SF)"
                              : "TI Allowance ($/SF)"}
                          </label>
                          <input
                            type="number"
                            value={hardCosts.tenantImprovements}
                            onChange={(e) =>
                              setHardCosts({
                                ...hardCosts,
                                tenantImprovements: Number(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                          />
                        </div>
                      {/* Site Work Input with Toggle */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-1">
                            <label className="block text-sm font-medium text-gray-700">
                              Site Work
                            </label>
                            {shouldShowPerUnitOption() && (
                              <div className="relative">
                                <button
                                  type="button"
                                  onMouseEnter={() => setShowSiteWorkTooltip(true)}
                                  onMouseLeave={() => setShowSiteWorkTooltip(false)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <Info size={14} />
                                </button>
                                
                                {showSiteWorkTooltip && (
                                  <div className="absolute z-10 left-0 top-6 w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                                    <div className="font-semibold mb-2">Typical Site Work Costs per Unit:</div>
                                    <div className="space-y-1">
                                      <div className="flex justify-between">
                                        <span>• Townhomes (attached):</span>
                                        <span>$15,000 - $25,000</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>• Single-family (production):</span>
                                        <span>$25,000 - $40,000</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>• Single-family (custom):</span>
                                        <span>$40,000 - $80,000</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>• Condos (wrap/podium):</span>
                                        <span>$10,000 - $20,000</span>
                                      </div>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-gray-700 text-gray-300">
                                      Includes utilities, grading, roads, and common areas. Varies by site conditions and local requirements.
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          {/* Show toggle for residential projects */}
                          {shouldShowPerUnitOption() && (
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => setHardCosts({...hardCosts, siteWorkInputMethod: 'total'})}
                                className={`px-2 py-0.5 text-xs rounded ${
                                  hardCosts.siteWorkInputMethod === 'total'
                                    ? 'bg-yellow-500 text-white'
                                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                }`}
                              >
                                Total
                              </button>
                              <button
                                type="button"
                                onClick={() => setHardCosts({...hardCosts, siteWorkInputMethod: 'perUnit'})}
                                className={`px-2 py-0.5 text-xs rounded ${
                                  hardCosts.siteWorkInputMethod === 'perUnit'
                                    ? 'bg-yellow-500 text-white'
                                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                }`}
                              >
                                Per Unit
                              </button>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          {hardCosts.siteWorkInputMethod === 'perUnit' && shouldShowPerUnitOption() ? (
                            <>
                              <input
                                type="text"
                                value={formatNumber(hardCosts.siteWorkPerUnit)}
                                onChange={(e) => {
                                  const parsed = parseFormattedNumber(e.target.value);
                                  const totalUnits = getTotalUnitCount();
                                  setHardCosts({
                                    ...hardCosts,
                                    siteWorkPerUnit: parsed,
                                    siteWork: parsed * totalUnits
                                  });
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                                placeholder="Cost per unit"
                              />
                              <div className="text-xs text-gray-500">
                                {getTotalUnitCount()} units × {formatCurrency(hardCosts.siteWorkPerUnit)} = {formatCurrency(hardCosts.siteWorkPerUnit * getTotalUnitCount())}
                              </div>
                            </>
                          ) : (
                            <input
                              type="text"
                              value={formatNumber(hardCosts.siteWork)}
                              onChange={(e) => {
                                const parsed = parseFormattedNumber(e.target.value);
                                const totalUnits = getTotalUnitCount();
                                setHardCosts({
                                  ...hardCosts,
                                  siteWork: parsed,
                                  siteWorkPerUnit: totalUnits > 0 ? Math.round(parsed / totalUnits) : 0
                                });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                            />
                          )}
                          
                          {/* Quick Set Buttons for Per Unit */}
                          {hardCosts.siteWorkInputMethod === 'perUnit' && shouldShowPerUnitOption() && (
                            <div className="flex gap-2 mt-2">
                              <div className="text-xs text-gray-500">Quick set:</div>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => setHardCosts({...hardCosts, siteWorkPerUnit: 15000})}
                                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                                    hardCosts.siteWorkPerUnit === 15000
                                      ? 'bg-yellow-500 text-white border-yellow-500'
                                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                                  }`}
                                  title="Typical for attached units"
                                >
                                  $15k
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setHardCosts({...hardCosts, siteWorkPerUnit: 25000})}
                                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                                    hardCosts.siteWorkPerUnit === 25000
                                      ? 'bg-yellow-500 text-white border-yellow-500'
                                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                                  }`}
                                  title="Typical for production homes"
                                >
                                  $25k
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setHardCosts({...hardCosts, siteWorkPerUnit: 40000})}
                                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                                    hardCosts.siteWorkPerUnit === 40000
                                      ? 'bg-yellow-500 text-white border-yellow-500'
                                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                                  }`}
                                  title="Typical for semi-custom homes"
                                >
                                  $40k
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setHardCosts({...hardCosts, siteWorkPerUnit: 60000})}
                                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                                    hardCosts.siteWorkPerUnit === 60000
                                      ? 'bg-yellow-500 text-white border-yellow-500'
                                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                                  }`}
                                  title="Typical for custom homes"
                                >
                                  $60k
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Site Work Validation Message */}
                        {siteWorkValidation && (
                          <div className="mt-2 flex items-center gap-1 text-xs">
                            <AlertTriangle size={12} className="text-amber-500" />
                            <span className="text-amber-600">{siteWorkValidation}</span>
                          </div>
                        )}
                      </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contingency (%)
                          </label>
                          <input
                            type="number"
                            value={hardCosts.contingency}
                            onChange={(e) =>
                              setHardCosts({
                                ...hardCosts,
                                contingency: Number(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                          />
                        </div>
                      </div>
                    )}
                    {mode === "detailed" && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-sm font-medium text-gray-700">
                                Landscaping ($/SF site)
                              </label>
                              <input
                                type="checkbox"
                                checked={hardCosts.landscapingEnabled}
                                onChange={(e) =>
                                  setHardCosts({
                                    ...hardCosts,
                                    landscapingEnabled: e.target.checked,
                                  })
                                }
                                className="rounded border-gray-300"
                              />
                            </div>
                            <input
                              type="number"
                              value={hardCosts.landscaping}
                              onChange={(e) =>
                                setHardCosts({
                                  ...hardCosts,
                                  landscaping: Number(e.target.value),
                                })
                              }
                              disabled={!hardCosts.landscapingEnabled}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Note: Parking and landscaping costs are included in Site Work total
                        </p>
                      </>
                    )}
                  </div>

                  {/* Parking Structure Section */}
                  {includeParking && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">
                        Parking Structure
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Surface Parking ($/space)
                          </label>
                          <input
                            type="number"
                            value={hardCosts.parkingSurface}
                            onChange={(e) =>
                              setHardCosts({
                                ...hardCosts,
                                parkingSurface: Number(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Structured Parking ($/space)
                          </label>
                          <input
                            type="number"
                            value={hardCosts.parkingStructured}
                            onChange={(e) =>
                              setHardCosts({
                                ...hardCosts,
                                parkingStructured: Number(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                          />
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <div className="text-sm text-gray-700">
                          <div className="flex justify-between mb-1">
                            <span>Total Parking Spaces:</span>
                            <span className="font-medium">
                              {Math.round((propertyType === "cottonwoodHeights" ? 
                                (cottonwoodHeights.retail.enabled ? (cottonwoodHeights.retail.totalSF / 1000) * cottonwoodHeights.retail.parkingRatio : 0) +
                                (cottonwoodHeights.grocery.enabled ? (cottonwoodHeights.grocery.totalSF / 1000) * cottonwoodHeights.grocery.parkingRatio : 0)
                                : (buildingGFA / 1000) * parkingRatio
                              ))}
                            </span>
                          </div>
                          {propertyType === "cottonwoodHeights" && (
                            <>
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>Retail Spaces:</span>
                                <span>{cottonwoodHeights.retail.enabled ? Math.round((cottonwoodHeights.retail.totalSF / 1000) * cottonwoodHeights.retail.parkingRatio) : 0}</span>
                              </div>
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>Grocery Spaces:</span>
                                <span>{cottonwoodHeights.grocery.enabled ? Math.round((cottonwoodHeights.grocery.totalSF / 1000) * cottonwoodHeights.grocery.parkingRatio) : 0}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {mode === "detailed" && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">
                        Soft Costs
                      </h3>
                      {propertyType === 'cottonwoodHeights' && (
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                          <div className="text-sm text-blue-900">
                            <div className="font-medium mb-1">Soft costs will be allocated proportionally:</div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="font-medium">Commercial (Retail + Grocery):</div>
                                <div className="text-xs">
                                  {formatNumber(cottonwoodHeights.retail.totalSF + cottonwoodHeights.grocery.totalSF)} SF
                                  ({Math.round(((cottonwoodHeights.retail.totalSF + cottonwoodHeights.grocery.totalSF) / 
                                    (cottonwoodHeights.retail.totalSF + cottonwoodHeights.grocery.totalSF + 
                                     cottonwoodHeights.townhomes.units * cottonwoodHeights.townhomes.avgSize)) * 100)}%)
                                </div>
                              </div>
                              <div>
                                <div className="font-medium">Residential (Townhomes):</div>
                                <div className="text-xs">
                                  {formatNumber(cottonwoodHeights.townhomes.units * cottonwoodHeights.townhomes.avgSize)} SF
                                  ({Math.round(((cottonwoodHeights.townhomes.units * cottonwoodHeights.townhomes.avgSize) / 
                                    (cottonwoodHeights.retail.totalSF + cottonwoodHeights.grocery.totalSF + 
                                     cottonwoodHeights.townhomes.units * cottonwoodHeights.townhomes.avgSize)) * 100)}%)
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">
                              A&E (% of Hard)
                            </label>
                            <input
                              type="checkbox"
                              checked={softCosts.architectureEngineeringEnabled}
                              onChange={(e) =>
                                setSoftCosts({
                                  ...softCosts,
                                  architectureEngineeringEnabled: e.target.checked,
                                })
                              }
                              className="rounded border-gray-300"
                            />
                          </div>
                          <input
                            type="number"
                            value={softCosts.architectureEngineering}
                            onChange={(e) =>
                              setSoftCosts({
                                ...softCosts,
                                architectureEngineering: Number(e.target.value),
                              })
                            }
                            disabled={!softCosts.architectureEngineeringEnabled}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">
                              Developer Fee (%)
                            </label>
                            <input
                              type="checkbox"
                              checked={softCosts.developerFeeEnabled}
                              onChange={(e) =>
                                setSoftCosts({
                                  ...softCosts,
                                  developerFeeEnabled: e.target.checked,
                                })
                              }
                              className="rounded border-gray-300"
                            />
                          </div>
                          <input
                            type="number"
                            value={softCosts.developerFee}
                            onChange={(e) =>
                              setSoftCosts({
                                ...softCosts,
                                developerFee: Number(e.target.value),
                              })
                            }
                            disabled={!softCosts.developerFeeEnabled}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Legal & Accounting
                          </label>
                          <input
                            type="text"
                            value={formatNumber(softCosts.legalAccounting)}
                            onChange={(e) => {
                              const parsed = parseFormattedNumber(e.target.value);
                              setSoftCosts({ ...softCosts, legalAccounting: parsed });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Marketing & Leasing
                          </label>
                          <input
                            type="text"
                            value={formatNumber(softCosts.marketingLeasing)}
                            onChange={(e) => {
                              const parsed = parseFormattedNumber(e.target.value);
                              setSoftCosts({ ...softCosts, marketingLeasing: parsed });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">
                              Permits/Impact ($/SF)
                            </label>
                            <input
                              type="checkbox"
                              checked={softCosts.permitsImpactFeesEnabled}
                              onChange={(e) =>
                                setSoftCosts({
                                  ...softCosts,
                                  permitsImpactFeesEnabled: e.target.checked,
                                })
                              }
                              className="rounded border-gray-300"
                            />
                          </div>
                          <input
                            type="number"
                            value={softCosts.permitsImpactFees}
                            onChange={(e) =>
                              setSoftCosts({
                                ...softCosts,
                                permitsImpactFees: Number(e.target.value),
                              })
                            }
                            disabled={!softCosts.permitsImpactFeesEnabled}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">
                              Constr. Mgmt (% of Hard)
                            </label>
                            <input
                              type="checkbox"
                              checked={softCosts.constructionMgmtFeeEnabled}
                              onChange={(e) =>
                                setSoftCosts({
                                  ...softCosts,
                                  constructionMgmtFeeEnabled: e.target.checked,
                                })
                              }
                              className="rounded border-gray-300"
                            />
                          </div>
                          <input
                            type="number"
                            value={softCosts.constructionMgmtFee}
                            onChange={(e) =>
                              setSoftCosts({
                                ...softCosts,
                                constructionMgmtFee: Number(e.target.value),
                              })
                            }
                            disabled={!softCosts.constructionMgmtFeeEnabled}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Financing Section */}
            {propertyType === "cottonwoodHeights" ? (
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h2 className="text-xl font-semibold mb-3">Financing Structure</h2>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    Financing for Cottonwood Heights is configured separately for each component in the 
                    <span className="font-medium"> Separate Financing</span> section within Property Configuration above.
                  </p>
                  <div className="mt-3 space-y-1 text-xs text-blue-700">
                    <div>• Retail/Commercial: {cottonwoodFinancing.retailConstruction.ltc}% LTC construction, {cottonwoodFinancing.retailPermanent.ltv}% LTV permanent</div>
                    <div>• Townhomes: {cottonwoodFinancing.townhomeConstruction.ltc}% LTC construction, {cottonwoodFinancing.townhomePermanent.ltv}% LTV permanent</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm">
                <button
                  onClick={() => toggleSection("financing")}
                  className="w-full p-4 flex justify-between items-center hover:bg-gray-50"
                >
                  <h2 className="text-xl font-semibold">Financing Structure</h2>
                  {expandedSections.financing ? (
                    <ChevronDown />
                  ) : (
                    <ChevronRight />
                  )}
                </button>
                {expandedSections.financing && (
                <div className="p-4 border-t space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-gray-900">
                        Construction Loan
                      </h3>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={constructionLoan.enabled}
                          onChange={(e) =>
                            setConstructionLoan({
                              ...constructionLoan,
                              enabled: e.target.checked,
                            })
                          }
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-600">Enabled</span>
                      </label>
                    </div>
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!constructionLoan.enabled ? 'opacity-50' : ''}`}>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                          LTC (%)
                          <InfoTooltip content="Loan-to-Cost ratio: The percentage of total project cost that can be financed. Typical range is 60-75%." />
                        </label>
                        <input
                          type="number"
                          value={constructionLoan.ltc}
                          onChange={(e) =>
                            setConstructionLoan({
                              ...constructionLoan,
                              ltc: Number(e.target.value),
                            })
                          }
                          disabled={!constructionLoan.enabled}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                          Interest Rate (%)
                          <InfoTooltip content="Annual interest rate for construction loan. Typically 1-3% above prime rate." />
                        </label>
                        <input
                          type="number"
                          value={constructionLoan.rate}
                          onChange={(e) =>
                            setConstructionLoan({
                              ...constructionLoan,
                              rate: Number(e.target.value),
                            })
                          }
                          disabled={!constructionLoan.enabled}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                          Origination Fee (%)
                          <InfoTooltip content="Loan origination fee as a percentage of loan amount. Typically 0.5-2%." />
                        </label>
                        <input
                          type="number"
                          value={constructionLoan.originationFee}
                          onChange={(e) =>
                            setConstructionLoan({
                              ...constructionLoan,
                              originationFee: Number(e.target.value),
                            })
                          }
                          disabled={!constructionLoan.enabled}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                          Avg Outstanding (%)
                          <InfoTooltip content="Average percentage of loan outstanding during construction. Typically 50-70%." />
                        </label>
                        <input
                          type="number"
                          value={constructionLoan.avgOutstandingPercent}
                          onChange={(e) =>
                            setConstructionLoan({
                              ...constructionLoan,
                              avgOutstandingPercent: Number(e.target.value),
                            })
                          }
                          disabled={!constructionLoan.enabled}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        />
                      </div>
                    </div>
                  </div>

                  {propertyType !== "forSale" && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-gray-900">
                          Permanent Financing
                        </h3>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={permanentLoan.enabled}
                            onChange={(e) =>
                              setPermanentLoan({
                                ...permanentLoan,
                                enabled: e.target.checked,
                              })
                            }
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm text-gray-600">Enabled</span>
                        </label>
                      </div>
                      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!permanentLoan.enabled ? 'opacity-50' : ''}`}>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                            LTV (%)
                            <InfoTooltip content="Loan-to-Value ratio: The percentage of stabilized property value that can be financed. Typical range is 65-75%." />
                          </label>
                          <input
                            type="number"
                            value={permanentLoan.ltv}
                            onChange={(e) =>
                              setPermanentLoan({
                                ...permanentLoan,
                                ltv: Number(e.target.value),
                              })
                            }
                            disabled={!permanentLoan.enabled}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                            Interest Rate (%)
                            <InfoTooltip content="Annual interest rate for permanent financing. Usually lower than construction loan rate." />
                          </label>
                          <input
                            type="number"
                            value={permanentLoan.rate}
                            onChange={(e) =>
                              setPermanentLoan({
                                ...permanentLoan,
                                rate: Number(e.target.value),
                              })
                            }
                            disabled={!permanentLoan.enabled}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                    {propertyType === "forSale" ? (
                      <>
                        <div className="text-center p-3 bg-yellow-50 rounded-lg">
                          <p className="text-sm text-gray-600">
                            Total Sales Revenue
                          </p>
                          <p className="text-lg font-semibold text-yellow-600">
                            {formatCurrency(
                              salesAssumptions.totalUnits *
                                salesAssumptions.avgPricePerUnit
                            )}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <p className="text-sm text-gray-600">Gross Margin</p>
                          <p className="text-lg font-semibold text-green-600">
                            {calculateTotalCost.total > 0
                              ? (
                                  ((salesAssumptions.totalUnits *
                                    salesAssumptions.avgPricePerUnit -
                                    calculateTotalCost.total) /
                                    (salesAssumptions.totalUnits *
                                      salesAssumptions.avgPricePerUnit)) *
                                  100
                                ).toFixed(1) + "%"
                              : "0.0%"}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <p className="text-sm text-gray-600">
                            Sellout Period
                          </p>
                          <p className="text-lg font-semibold text-purple-600">
                            {salesAssumptions.salesPace > 0
                              ? Math.ceil(
                                  salesAssumptions.totalUnits /
                                    salesAssumptions.salesPace
                                ) + " months"
                              : "N/A"}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-center p-3 bg-yellow-50 rounded-lg">
                          <div className="text-sm text-gray-600 flex items-center justify-center">
                            Year 1 DSCR
                            <InfoTooltip content="Debt Service Coverage Ratio: NOI divided by annual debt service. Lenders typically require 1.20x minimum." />
                          </div>
                          <p className="text-lg font-semibold text-yellow-600">
                            {calculateCashFlows?.year1NOI &&
                            calculateCashFlows?.permanentLoanAmount &&
                            permanentLoan.rate > 0
                              ? (
                                  calculateCashFlows.year1NOI /
                                  ((calculateCashFlows.permanentLoanAmount *
                                    permanentLoan.rate) /
                                    100)
                                ).toFixed(2)
                              : "N/A"}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <p className="text-sm text-gray-600">Refi Proceeds</p>
                          <p className="text-lg font-semibold text-green-600">
                            {calculateCashFlows?.permanentLoanAmount &&
                            calculateFinancing?.constructionLoanAmount &&
                            calculateCashFlows.permanentLoanAmount >
                              calculateFinancing.constructionLoanAmount
                              ? formatCurrency(
                                  calculateCashFlows.permanentLoanAmount -
                                    calculateFinancing.constructionLoanAmount
                                )
                              : "$0"}
                          </p>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg">
                          <div className="text-sm text-gray-600 flex items-center justify-center">
                            Debt Yield
                            <InfoTooltip content="Year 1 NOI divided by loan amount. Lenders typically require 8-10% minimum." />
                          </div>
                          <p className="text-lg font-semibold text-purple-600">
                            {calculateCashFlows?.year1NOI &&
                            calculateCashFlows?.permanentLoanAmount &&
                            calculateCashFlows.permanentLoanAmount > 0
                              ? (
                                  (calculateCashFlows.year1NOI /
                                    calculateCashFlows.permanentLoanAmount) *
                                  100
                                ).toFixed(1) + "%"
                              : "N/A"}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Operating Assumptions */}
            <div className="bg-white rounded-lg shadow-sm">
              <button
                onClick={() => toggleSection("operations")}
                className="w-full p-4 flex justify-between items-center hover:bg-gray-50"
              >
                <h2 className="text-xl font-semibold">Operating Assumptions</h2>
                {expandedSections.operations ? (
                  <ChevronDown />
                ) : (
                  <ChevronRight />
                )}
              </button>
              {expandedSections.operations && (
                <div className="p-4 border-t space-y-4">
                  {/* Property-specific sections */}
                  {propertyType === "apartment" && (
                    <>
                      {/* Unit Mix */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-medium text-gray-900">
                            Unit Mix
                          </h3>
                          <button
                            onClick={addUnitType}
                            className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                          >
                            + Add Unit Type
                          </button>
                        </div>
                        <div className="space-y-3">
                          {unitMix.map((unit, index) => (
                            <div
                              key={index}
                              className="p-3 border border-gray-200 rounded-lg"
                            >
                              <div className="grid grid-cols-5 gap-2">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Type
                                  </label>
                                  <input
                                    type="text"
                                    value={unit.type}
                                    onChange={(e) =>
                                      updateUnitMix(
                                        index,
                                        "type",
                                        e.target.value
                                      )
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Units
                                  </label>
                                  <input
                                    type="number"
                                    value={unit.units}
                                    onChange={(e) =>
                                      updateUnitMix(
                                        index,
                                        "units",
                                        Number(e.target.value)
                                      )
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Size (SF)
                                  </label>
                                  <input
                                    type="number"
                                    value={unit.size}
                                    onChange={(e) =>
                                      updateUnitMix(
                                        index,
                                        "size",
                                        Number(e.target.value)
                                      )
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Rent
                                  </label>
                                  <input
                                    type="number"
                                    value={unit.rent}
                                    onChange={(e) =>
                                      updateUnitMix(
                                        index,
                                        "rent",
                                        Number(e.target.value)
                                      )
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                                <div className="flex items-end">
                                  {unitMix.length > 1 && (
                                    <button
                                      onClick={() => removeUnitType(index)}
                                      className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            <div>
                              <span className="text-gray-600">
                                Total Units:
                              </span>
                              <span className="font-semibold ml-2">
                                {unitMix.reduce((sum, u) => sum + u.units, 0)}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">
                                Weighted Avg Rent:
                              </span>
                              <span className="font-semibold ml-2">
                                $
                                {unitMix.reduce((sum, u) => sum + u.units, 0) >
                                0
                                  ? Math.round(
                                      unitMix.reduce(
                                        (sum, u) => sum + u.units * u.rent,
                                        0
                                      ) /
                                        unitMix.reduce(
                                          (sum, u) => sum + u.units,
                                          0
                                        )
                                    )
                                  : 0}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Total SF:</span>
                              <span className="font-semibold ml-2">
                                {formatNumber(
                                  unitMix.reduce(
                                    (sum, u) => sum + u.units * u.size,
                                    0
                                  )
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Basic Operating Assumptions */}
                  {propertyType === "cottonwoodHeights" ? (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">
                        Market Parameters
                      </h3>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-blue-800">
                          Detailed operating assumptions are configured within each component (retail tenants, grocery tenants, and townhomes).
                          These market parameters apply to overall project valuation.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                            Exit Cap Rate - Retail/Grocery (%)
                            <InfoTooltip content="Exit cap rate for commercial components. Already configured in separate financing." />
                          </label>
                          <input
                            type="number"
                            value={cottonwoodFinancing.retailPermanent.exitCapRate}
                            onChange={(e) =>
                              setCottonwoodFinancing({
                                ...cottonwoodFinancing,
                                retailPermanent: { 
                                  ...cottonwoodFinancing.retailPermanent, 
                                  exitCapRate: Number(e.target.value) 
                                }
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                            Exit Cap Rate - Townhomes (%)
                            <InfoTooltip content="Exit cap rate for residential components. Already configured in separate financing." />
                          </label>
                          <input
                            type="number"
                            value={cottonwoodFinancing.townhomePermanent.exitCapRate}
                            onChange={(e) =>
                              setCottonwoodFinancing({
                                ...cottonwoodFinancing,
                                townhomePermanent: { 
                                  ...cottonwoodFinancing.townhomePermanent, 
                                  exitCapRate: Number(e.target.value) 
                                }
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                          />
                        </div>
                      </div>
                    </div>
                  ) : propertyType !== "forSale" && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">
                        Operating Parameters
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {propertyType === "apartment"
                              ? "Monthly Rent/SF"
                              : "Annual Rent/SF"}
                          </label>
                          <input
                            type="number"
                            value={operatingAssumptions.rentPSF}
                            onChange={(e) =>
                              setOperatingAssumptions({
                                ...operatingAssumptions,
                                rentPSF: Number(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Vacancy (%)
                          </label>
                          <input
                            type="number"
                            value={operatingAssumptions.vacancy}
                            onChange={(e) =>
                              setOperatingAssumptions({
                                ...operatingAssumptions,
                                vacancy: Number(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {propertyType === "apartment"
                              ? "OpEx/Unit"
                              : "OpEx/SF"}
                          </label>
                          <input
                            type="number"
                            value={operatingAssumptions.opex}
                            onChange={(e) =>
                              setOperatingAssumptions({
                                ...operatingAssumptions,
                                opex: Number(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                            Exit Cap Rate (%)
                            <InfoTooltip content="Capitalization rate used to determine sale price. Exit cap rates are typically 25-50 basis points higher than going-in cap rates." />
                          </label>
                          <input
                            type="number"
                            value={operatingAssumptions.capRate}
                            onChange={(e) =>
                              setOperatingAssumptions({
                                ...operatingAssumptions,
                                capRate: Number(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* For-Sale Specific */}
                  {propertyType === "forSale" && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Average Unit Size (SF)
                          </label>
                          <input
                            type="number"
                            value={salesAssumptions.avgUnitSize}
                            onChange={(e) =>
                              setSalesAssumptions({
                                ...salesAssumptions,
                                avgUnitSize: Number(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Price Per SF
                          </label>
                          <input
                            type="number"
                            value={salesAssumptions.pricePerSF}
                            onChange={(e) => {
                              const newPricePerSF = Number(e.target.value);
                              setSalesAssumptions({
                                ...salesAssumptions,
                                pricePerSF: newPricePerSF,
                                avgPricePerUnit:
                                  newPricePerSF * salesAssumptions.avgUnitSize,
                              });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Sales Pace (units/month)
                          </label>
                          <input
                            type="number"
                            value={salesAssumptions.salesPace}
                            onChange={(e) =>
                              setSalesAssumptions({
                                ...salesAssumptions,
                                salesPace: Number(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Price Escalation (%/year)
                          </label>
                          <input
                            type="number"
                            value={salesAssumptions.priceEscalation}
                            onChange={(e) =>
                              setSalesAssumptions({
                                ...salesAssumptions,
                                priceEscalation: Number(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                          />
                        </div>
                      </div>

                      {/* Sales Phasing */}
                      <div className="mt-4">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-medium text-gray-900">
                            Sales Phasing
                          </h3>
                          <button
                            onClick={addSalesPhase}
                            className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                          >
                            + Add Phase
                          </button>
                        </div>

                        <div className="space-y-3">
                          {salesPhasing.map((phase, index) => (
                            <div
                              key={index}
                              className="p-3 border border-gray-200 rounded-lg"
                            >
                              <div className="flex justify-between items-center mb-2">
                                <h4 className="font-medium">
                                  Phase {phase.phase}
                                </h4>
                                {salesPhasing.length > 1 && (
                                  <button
                                    onClick={() => removeSalesPhase(index)}
                                    className="text-red-500 hover:text-red-700 text-sm"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Units
                                  </label>
                                  <input
                                    type="number"
                                    value={phase.units}
                                    onChange={(e) =>
                                      updateSalesPhase(
                                        index,
                                        "units",
                                        Number(e.target.value)
                                      )
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Start Month
                                  </label>
                                  <input
                                    type="number"
                                    value={phase.startMonth}
                                    onChange={(e) =>
                                      updateSalesPhase(
                                        index,
                                        "startMonth",
                                        Number(e.target.value)
                                      )
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Delivery Month
                                  </label>
                                  <input
                                    type="number"
                                    value={phase.deliveryMonth}
                                    onChange={(e) =>
                                      updateSalesPhase(
                                        index,
                                        "deliveryMonth",
                                        Number(e.target.value)
                                      )
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Cottonwood Heights Mixed-Use */}
                  {propertyType === "cottonwoodHeights" && (
                    <div className="space-y-6">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h3 className="font-semibold text-yellow-900 mb-2">Cottonwood Heights Mixed-Use Development</h3>
                        <p className="text-sm text-yellow-800">
                          This property type models a mixed-use development with separate retail/grocery commercial 
                          and rental townhome components, each with their own financing.
                        </p>
                      </div>

                      {/* Ground Lease */}
                      <GroundLeaseSection
                        groundLease={cottonwoodHeights.groundLease}
                        onChange={(groundLease) => setCottonwoodHeights({
                          ...cottonwoodHeights,
                          groundLease
                        })}
                        projectedRevenue={calculateCashFlows?.cashFlows?.[1]?.grossRevenue || 0}
                        projectedNOI={calculateCashFlows?.cashFlows?.[1]?.noi || 0}
                      />

                      {/* State Funding */}
                      <StateFundingSection
                        funding={cottonwoodStateFunding}
                        onChange={setCottonwoodStateFunding}
                      />

                      {/* Commercial Components */}
                      <div>
                        <h3 className="font-medium text-gray-900 mb-3">Commercial Components</h3>

                        {/* Retail */}
                        <div className="mb-4 p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">Retail Space</h4>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={cottonwoodHeights.retail.enabled}
                                onChange={(e) => setCottonwoodHeights({
                                  ...cottonwoodHeights,
                                  retail: { ...cottonwoodHeights.retail, enabled: e.target.checked }
                                })}
                                className="mr-2"
                              />
                              <span className="text-sm">Enabled</span>
                            </label>
                          </div>
                          {cottonwoodHeights.retail.enabled && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Total SF</label>
                                  <input
                                    type="number"
                                    value={cottonwoodHeights.retail.totalSF}
                                    onChange={(e) => setCottonwoodHeights({
                                      ...cottonwoodHeights,
                                      retail: { ...cottonwoodHeights.retail, totalSF: Number(e.target.value) }
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Hard Cost/SF</label>
                                  <input
                                    type="number"
                                    value={cottonwoodHeights.retail.hardCostPSF}
                                    onChange={(e) => setCottonwoodHeights({
                                      ...cottonwoodHeights,
                                      retail: { ...cottonwoodHeights.retail, hardCostPSF: Number(e.target.value) }
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">TI Allowance/SF</label>
                                  <input
                                    type="number"
                                    value={cottonwoodHeights.retail.tiAllowance}
                                    onChange={(e) => setCottonwoodHeights({
                                      ...cottonwoodHeights,
                                      retail: { ...cottonwoodHeights.retail, tiAllowance: Number(e.target.value) }
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Parking Ratio</label>
                                  <input
                                    type="number"
                                    value={cottonwoodHeights.retail.parkingRatio}
                                    onChange={(e) => setCottonwoodHeights({
                                      ...cottonwoodHeights,
                                      retail: { ...cottonwoodHeights.retail, parkingRatio: Number(e.target.value) }
                                    })}
                                    step="0.5"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                              </div>
                              
                              {/* Retail Tenants */}
                              <div>
                                <div className="flex justify-between items-center mb-2">
                                  <h5 className="text-sm font-medium text-gray-700">Retail Tenants</h5>
                                  <div className="text-sm text-gray-500">
                                    Leased: {cottonwoodTenants.retail.reduce((sum, t) => sum + t.sf, 0).toLocaleString()} SF / 
                                    {cottonwoodHeights.retail.totalSF.toLocaleString()} SF
                                  </div>
                                </div>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                  {cottonwoodTenants.retail.map((tenant, index) => (
                                    <div key={tenant.id} className="p-3 bg-gray-50 rounded-lg">
                                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                                        <input
                                          type="text"
                                          value={tenant.name}
                                          onChange={(e) => {
                                            const updated = [...cottonwoodTenants.retail];
                                            updated[index].name = e.target.value;
                                            setCottonwoodTenants({...cottonwoodTenants, retail: updated});
                                          }}
                                          placeholder="Tenant name"
                                          className="px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                        <input
                                          type="number"
                                          value={tenant.sf}
                                          onChange={(e) => {
                                            const updated = [...cottonwoodTenants.retail];
                                            updated[index].sf = Number(e.target.value);
                                            setCottonwoodTenants({...cottonwoodTenants, retail: updated});
                                          }}
                                          placeholder="SF"
                                          className="px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                        <input
                                          type="number"
                                          value={tenant.rentPSF}
                                          onChange={(e) => {
                                            const updated = [...cottonwoodTenants.retail];
                                            updated[index].rentPSF = Number(e.target.value);
                                            setCottonwoodTenants({...cottonwoodTenants, retail: updated});
                                          }}
                                          placeholder="Rent/SF"
                                          className="px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                        <input
                                          type="number"
                                          value={tenant.term}
                                          onChange={(e) => {
                                            const updated = [...cottonwoodTenants.retail];
                                            updated[index].term = Number(e.target.value);
                                            setCottonwoodTenants({...cottonwoodTenants, retail: updated});
                                          }}
                                          placeholder="Term"
                                          className="px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="checkbox"
                                            checked={tenant.percentageRent}
                                            onChange={(e) => {
                                              const updated = [...cottonwoodTenants.retail];
                                              updated[index].percentageRent = e.target.checked;
                                              setCottonwoodTenants({...cottonwoodTenants, retail: updated});
                                            }}
                                            className="mr-1"
                                          />
                                          <span className="text-xs">% Rent</span>
                                        </div>
                                        <button
                                          onClick={() => {
                                            setCottonwoodTenants({
                                              ...cottonwoodTenants,
                                              retail: cottonwoodTenants.retail.filter((_, i) => i !== index)
                                            });
                                          }}
                                          className="text-red-600 hover:text-red-800 text-sm"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                      {tenant.percentageRent && (
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                          <input
                                            type="number"
                                            value={tenant.percentageRate}
                                            onChange={(e) => {
                                              const updated = [...cottonwoodTenants.retail];
                                              updated[index].percentageRate = Number(e.target.value);
                                              setCottonwoodTenants({...cottonwoodTenants, retail: updated});
                                            }}
                                            placeholder="% Rate"
                                            className="px-2 py-1 text-sm border border-gray-300 rounded"
                                          />
                                          <input
                                            type="number"
                                            value={tenant.breakpoint}
                                            onChange={(e) => {
                                              const updated = [...cottonwoodTenants.retail];
                                              updated[index].breakpoint = Number(e.target.value);
                                              setCottonwoodTenants({...cottonwoodTenants, retail: updated});
                                            }}
                                            placeholder="Breakpoint $/SF"
                                            className="px-2 py-1 text-sm border border-gray-300 rounded"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <button
                                  onClick={() => {
                                    setCottonwoodTenants({
                                      ...cottonwoodTenants,
                                      retail: [...cottonwoodTenants.retail, {
                                        id: Date.now(),
                                        name: `Retail Tenant ${cottonwoodTenants.retail.length + 1}`,
                                        sf: 2000,
                                        rentPSF: 35,
                                        term: 10,
                                        freeRent: 3,
                                        tiPSF: 40,
                                        startMonth: 0,
                                        renewalProbability: 80,
                                        percentageRent: false,
                                        percentageRate: 6,
                                        breakpoint: 350,
                                      }]
                                    });
                                  }}
                                  className="mt-2 text-yellow-600 hover:text-yellow-800 text-sm"
                                >
                                  + Add Retail Tenant
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Grocery */}
                        <div className="mb-4 p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">Grocery Anchor</h4>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={cottonwoodHeights.grocery.enabled}
                                onChange={(e) => setCottonwoodHeights({
                                  ...cottonwoodHeights,
                                  grocery: { ...cottonwoodHeights.grocery, enabled: e.target.checked }
                                })}
                                className="mr-2"
                              />
                              <span className="text-sm">Enabled</span>
                            </label>
                          </div>
                          {cottonwoodHeights.grocery.enabled && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Total SF</label>
                                  <input
                                    type="number"
                                    value={cottonwoodHeights.grocery.totalSF}
                                    onChange={(e) => setCottonwoodHeights({
                                      ...cottonwoodHeights,
                                      grocery: { ...cottonwoodHeights.grocery, totalSF: Number(e.target.value) }
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Hard Cost/SF</label>
                                  <input
                                    type="number"
                                    value={cottonwoodHeights.grocery.hardCostPSF}
                                    onChange={(e) => setCottonwoodHeights({
                                      ...cottonwoodHeights,
                                      grocery: { ...cottonwoodHeights.grocery, hardCostPSF: Number(e.target.value) }
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">TI Allowance/SF</label>
                                  <input
                                    type="number"
                                    value={cottonwoodHeights.grocery.tiAllowance}
                                    onChange={(e) => setCottonwoodHeights({
                                      ...cottonwoodHeights,
                                      grocery: { ...cottonwoodHeights.grocery, tiAllowance: Number(e.target.value) }
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Parking Ratio</label>
                                  <input
                                    type="number"
                                    value={cottonwoodHeights.grocery.parkingRatio}
                                    onChange={(e) => setCottonwoodHeights({
                                      ...cottonwoodHeights,
                                      grocery: { ...cottonwoodHeights.grocery, parkingRatio: Number(e.target.value) }
                                    })}
                                    step="0.5"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                              </div>
                              
                              {/* Grocery Tenants */}
                              <div>
                                <div className="flex justify-between items-center mb-2">
                                  <h5 className="text-sm font-medium text-gray-700">Grocery Tenants</h5>
                                  <div className="text-sm text-gray-500">
                                    Leased: {cottonwoodTenants.grocery.reduce((sum, t) => sum + t.sf, 0).toLocaleString()} SF / 
                                    {cottonwoodHeights.grocery.totalSF.toLocaleString()} SF
                                  </div>
                                </div>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                  {cottonwoodTenants.grocery.map((tenant, index) => (
                                    <div key={tenant.id} className="p-3 bg-gray-50 rounded-lg">
                                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                                        <input
                                          type="text"
                                          value={tenant.name}
                                          onChange={(e) => {
                                            const updated = [...cottonwoodTenants.grocery];
                                            updated[index].name = e.target.value;
                                            setCottonwoodTenants({...cottonwoodTenants, grocery: updated});
                                          }}
                                          placeholder="Tenant name"
                                          className="px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                        <input
                                          type="number"
                                          value={tenant.sf}
                                          onChange={(e) => {
                                            const updated = [...cottonwoodTenants.grocery];
                                            updated[index].sf = Number(e.target.value);
                                            setCottonwoodTenants({...cottonwoodTenants, grocery: updated});
                                          }}
                                          placeholder="SF"
                                          className="px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                        <input
                                          type="number"
                                          value={tenant.rentPSF}
                                          onChange={(e) => {
                                            const updated = [...cottonwoodTenants.grocery];
                                            updated[index].rentPSF = Number(e.target.value);
                                            setCottonwoodTenants({...cottonwoodTenants, grocery: updated});
                                          }}
                                          placeholder="Rent/SF"
                                          className="px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                        <input
                                          type="number"
                                          value={tenant.term}
                                          onChange={(e) => {
                                            const updated = [...cottonwoodTenants.grocery];
                                            updated[index].term = Number(e.target.value);
                                            setCottonwoodTenants({...cottonwoodTenants, grocery: updated});
                                          }}
                                          placeholder="Term"
                                          className="px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="checkbox"
                                            checked={tenant.percentageRent}
                                            onChange={(e) => {
                                              const updated = [...cottonwoodTenants.grocery];
                                              updated[index].percentageRent = e.target.checked;
                                              setCottonwoodTenants({...cottonwoodTenants, grocery: updated});
                                            }}
                                            className="mr-1"
                                          />
                                          <span className="text-xs">% Rent</span>
                                        </div>
                                        <button
                                          onClick={() => {
                                            setCottonwoodTenants({
                                              ...cottonwoodTenants,
                                              grocery: cottonwoodTenants.grocery.filter((_, i) => i !== index)
                                            });
                                          }}
                                          className="text-red-600 hover:text-red-800 text-sm"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                      {tenant.percentageRent && (
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                          <input
                                            type="number"
                                            value={tenant.percentageRate}
                                            onChange={(e) => {
                                              const updated = [...cottonwoodTenants.grocery];
                                              updated[index].percentageRate = Number(e.target.value);
                                              setCottonwoodTenants({...cottonwoodTenants, grocery: updated});
                                            }}
                                            placeholder="% Rate"
                                            className="px-2 py-1 text-sm border border-gray-300 rounded"
                                          />
                                          <input
                                            type="number"
                                            value={tenant.breakpoint}
                                            onChange={(e) => {
                                              const updated = [...cottonwoodTenants.grocery];
                                              updated[index].breakpoint = Number(e.target.value);
                                              setCottonwoodTenants({...cottonwoodTenants, grocery: updated});
                                            }}
                                            placeholder="Breakpoint $/SF"
                                            className="px-2 py-1 text-sm border border-gray-300 rounded"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <button
                                  onClick={() => {
                                    setCottonwoodTenants({
                                      ...cottonwoodTenants,
                                      grocery: [...cottonwoodTenants.grocery, {
                                        id: Date.now(),
                                        name: `Grocery Tenant ${cottonwoodTenants.grocery.length + 1}`,
                                        sf: 5000,
                                        rentPSF: 20,
                                        term: 15,
                                        freeRent: 6,
                                        tiPSF: 100,
                                        startMonth: 0,
                                        renewalProbability: 90,
                                        percentageRent: false,
                                        percentageRate: 2,
                                        breakpoint: 500,
                                      }]
                                    });
                                  }}
                                  className="mt-2 text-yellow-600 hover:text-yellow-800 text-sm"
                                >
                                  + Add Grocery Tenant
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Residential Components */}
                      <div>
                        <h3 className="font-medium text-gray-900 mb-3">Residential Components</h3>
                        
                        {/* Rental Townhomes */}
                        <div className="mb-4 p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">Rental Townhomes</h4>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={cottonwoodHeights.townhomes.enabled}
                                onChange={(e) => setCottonwoodHeights({
                                  ...cottonwoodHeights,
                                  townhomes: { ...cottonwoodHeights.townhomes, enabled: e.target.checked }
                                })}
                                className="mr-2"
                              />
                              <span className="text-sm">Enabled</span>
                            </label>
                          </div>
                          {cottonwoodHeights.townhomes.enabled && (
                            <>
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Units</label>
                                  <input
                                    type="number"
                                    value={cottonwoodHeights.townhomes.units}
                                    onChange={(e) => setCottonwoodHeights({
                                      ...cottonwoodHeights,
                                      townhomes: { ...cottonwoodHeights.townhomes, units: Number(e.target.value) }
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Avg Size (SF)</label>
                                  <input
                                    type="number"
                                    value={cottonwoodHeights.townhomes.avgSize}
                                    onChange={(e) => setCottonwoodHeights({
                                      ...cottonwoodHeights,
                                      townhomes: { ...cottonwoodHeights.townhomes, avgSize: Number(e.target.value) }
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Rent/Unit</label>
                                  <input
                                    type="number"
                                    value={cottonwoodHeights.townhomes.rentPerUnit}
                                    onChange={(e) => setCottonwoodHeights({
                                      ...cottonwoodHeights,
                                      townhomes: { ...cottonwoodHeights.townhomes, rentPerUnit: Number(e.target.value) }
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Hard Cost/SF</label>
                                  <input
                                    type="number"
                                    value={cottonwoodHeights.townhomes.hardCostPSF}
                                    onChange={(e) => setCottonwoodHeights({
                                      ...cottonwoodHeights,
                                      townhomes: { ...cottonwoodHeights.townhomes, hardCostPSF: Number(e.target.value) }
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Vacancy %</label>
                                  <input
                                    type="number"
                                    value={cottonwoodHeights.townhomes.vacancy}
                                    onChange={(e) => setCottonwoodHeights({
                                      ...cottonwoodHeights,
                                      townhomes: { ...cottonwoodHeights.townhomes, vacancy: Number(e.target.value) }
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">OpEx/Unit/Year</label>
                                  <input
                                    type="number"
                                    value={cottonwoodHeights.townhomes.opexPerUnit}
                                    onChange={(e) => setCottonwoodHeights({
                                      ...cottonwoodHeights,
                                      townhomes: { ...cottonwoodHeights.townhomes, opexPerUnit: Number(e.target.value) }
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                              </div>
                              
                              {/* Unit Matrix */}
                              <div className="mt-4">
                                <UnitMatrix
                                  unitTypes={cottonwoodHeights.townhomes.unitMatrix}
                                  onChange={(unitTypes) => {
                                    // Calculate aggregated values from unit matrix
                                    const totalUnits = unitTypes.reduce((sum, unit) => sum + unit.units, 0);
                                    const totalSF = unitTypes.reduce((sum, unit) => sum + (unit.units * unit.squareFootage), 0);
                                    const avgSize = totalUnits > 0 ? Math.round(totalSF / totalUnits) : 0;
                                    const weightedAvgRent = totalUnits > 0 
                                      ? unitTypes.reduce((sum, unit) => sum + (unit.units * unit.monthlyRent), 0) / totalUnits 
                                      : 0;
                                    
                                    setCottonwoodHeights({
                                      ...cottonwoodHeights,
                                      townhomes: { 
                                        ...cottonwoodHeights.townhomes, 
                                        unitMatrix: unitTypes,
                                        units: totalUnits,
                                        avgSize: avgSize,
                                        rentPerUnit: Math.round(weightedAvgRent)
                                      }
                                    });
                                  }}
                                  className="bg-gray-50 p-4 rounded-lg"
                                />
                              </div>
                            </>
                          )}
                        </div>

                      </div>

                      {/* Parking Assignments */}
                      <div>
                        <h3 className="font-medium text-gray-900 mb-3">Parking Assignments</h3>
                        
                        <div className="mb-4 p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">Parking Structure</h4>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={cottonwoodHeights.parking.enabled}
                                onChange={(e) => setCottonwoodHeights({
                                  ...cottonwoodHeights,
                                  parking: { ...cottonwoodHeights.parking, enabled: e.target.checked }
                                })}
                                className="mr-2"
                              />
                              <span className="text-sm">Enabled</span>
                            </label>
                          </div>
                          
                          {cottonwoodHeights.parking.enabled && (
                            <div className="space-y-4">
                              {/* Parking cost inputs */}
                              <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-gray-50 rounded">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Surface Cost/Space</label>
                                  <input
                                    type="number"
                                    value={cottonwoodHeights.parking.surfaceCostPerSpace}
                                    onChange={(e) => setCottonwoodHeights({
                                      ...cottonwoodHeights,
                                      parking: { ...cottonwoodHeights.parking, surfaceCostPerSpace: Number(e.target.value) }
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Structured Cost/Space</label>
                                  <input
                                    type="number"
                                    value={cottonwoodHeights.parking.structuredCostPerSpace}
                                    onChange={(e) => setCottonwoodHeights({
                                      ...cottonwoodHeights,
                                      parking: { ...cottonwoodHeights.parking, structuredCostPerSpace: Number(e.target.value) }
                                    })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                  />
                                </div>
                              </div>

                              {/* Component parking assignments */}
                              <div className="space-y-3">
                                <h5 className="text-sm font-medium text-gray-700">Parking Assignments by Component</h5>
                                
                                {/* Retail Parking */}
                                {cottonwoodHeights.retail.enabled && (
                                  <div className="p-3 bg-blue-50 rounded-lg">
                                    <h6 className="font-medium text-sm mb-2">Retail Parking</h6>
                                    <div className="grid grid-cols-3 gap-3">
                                      <div>
                                        <label className="block text-xs text-gray-600 mb-1">Required Spaces</label>
                                        <input
                                          type="number"
                                          value={cottonwoodHeights.parking.assignments.retail.requiredSpaces}
                                          onChange={(e) => setCottonwoodHeights({
                                            ...cottonwoodHeights,
                                            parking: {
                                              ...cottonwoodHeights.parking,
                                              assignments: {
                                                ...cottonwoodHeights.parking.assignments,
                                                retail: { ...cottonwoodHeights.parking.assignments.retail, requiredSpaces: Number(e.target.value) }
                                              }
                                            }
                                          })}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-600 mb-1">Surface</label>
                                        <input
                                          type="number"
                                          value={cottonwoodHeights.parking.assignments.retail.surfaceSpaces}
                                          onChange={(e) => setCottonwoodHeights({
                                            ...cottonwoodHeights,
                                            parking: {
                                              ...cottonwoodHeights.parking,
                                              assignments: {
                                                ...cottonwoodHeights.parking.assignments,
                                                retail: { ...cottonwoodHeights.parking.assignments.retail, surfaceSpaces: Number(e.target.value) }
                                              }
                                            }
                                          })}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-600 mb-1">Structured</label>
                                        <input
                                          type="number"
                                          value={cottonwoodHeights.parking.assignments.retail.structuredSpaces}
                                          onChange={(e) => setCottonwoodHeights({
                                            ...cottonwoodHeights,
                                            parking: {
                                              ...cottonwoodHeights.parking,
                                              assignments: {
                                                ...cottonwoodHeights.parking.assignments,
                                                retail: { ...cottonwoodHeights.parking.assignments.retail, structuredSpaces: Number(e.target.value) }
                                              }
                                            }
                                          })}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Medical Office Parking */}
                                {cottonwoodHeights.medicalOffice.enabled && (
                                  <div className="p-3 bg-green-50 rounded-lg">
                                    <h6 className="font-medium text-sm mb-2">Medical Office Parking</h6>
                                    <div className="grid grid-cols-3 gap-3">
                                      <div>
                                        <label className="block text-xs text-gray-600 mb-1">Required Spaces</label>
                                        <input
                                          type="number"
                                          value={cottonwoodHeights.parking.assignments.medicalOffice.requiredSpaces}
                                          onChange={(e) => setCottonwoodHeights({
                                            ...cottonwoodHeights,
                                            parking: {
                                              ...cottonwoodHeights.parking,
                                              assignments: {
                                                ...cottonwoodHeights.parking.assignments,
                                                medicalOffice: { ...cottonwoodHeights.parking.assignments.medicalOffice, requiredSpaces: Number(e.target.value) }
                                              }
                                            }
                                          })}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-600 mb-1">Surface</label>
                                        <input
                                          type="number"
                                          value={cottonwoodHeights.parking.assignments.medicalOffice.surfaceSpaces}
                                          onChange={(e) => setCottonwoodHeights({
                                            ...cottonwoodHeights,
                                            parking: {
                                              ...cottonwoodHeights.parking,
                                              assignments: {
                                                ...cottonwoodHeights.parking.assignments,
                                                medicalOffice: { ...cottonwoodHeights.parking.assignments.medicalOffice, surfaceSpaces: Number(e.target.value) }
                                              }
                                            }
                                          })}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-600 mb-1">Structured</label>
                                        <input
                                          type="number"
                                          value={cottonwoodHeights.parking.assignments.medicalOffice.structuredSpaces}
                                          onChange={(e) => setCottonwoodHeights({
                                            ...cottonwoodHeights,
                                            parking: {
                                              ...cottonwoodHeights.parking,
                                              assignments: {
                                                ...cottonwoodHeights.parking.assignments,
                                                medicalOffice: { ...cottonwoodHeights.parking.assignments.medicalOffice, structuredSpaces: Number(e.target.value) }
                                              }
                                            }
                                          })}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Grocery Parking */}
                                {cottonwoodHeights.grocery.enabled && (
                                  <div className="p-3 bg-orange-50 rounded-lg">
                                    <h6 className="font-medium text-sm mb-2">Grocery Parking</h6>
                                    <div className="grid grid-cols-3 gap-3">
                                      <div>
                                        <label className="block text-xs text-gray-600 mb-1">Required Spaces</label>
                                        <input
                                          type="number"
                                          value={cottonwoodHeights.parking.assignments.grocery.requiredSpaces}
                                          onChange={(e) => setCottonwoodHeights({
                                            ...cottonwoodHeights,
                                            parking: {
                                              ...cottonwoodHeights.parking,
                                              assignments: {
                                                ...cottonwoodHeights.parking.assignments,
                                                grocery: { ...cottonwoodHeights.parking.assignments.grocery, requiredSpaces: Number(e.target.value) }
                                              }
                                            }
                                          })}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-600 mb-1">Surface</label>
                                        <input
                                          type="number"
                                          value={cottonwoodHeights.parking.assignments.grocery.surfaceSpaces}
                                          onChange={(e) => setCottonwoodHeights({
                                            ...cottonwoodHeights,
                                            parking: {
                                              ...cottonwoodHeights.parking,
                                              assignments: {
                                                ...cottonwoodHeights.parking.assignments,
                                                grocery: { ...cottonwoodHeights.parking.assignments.grocery, surfaceSpaces: Number(e.target.value) }
                                              }
                                            }
                                          })}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-600 mb-1">Structured</label>
                                        <input
                                          type="number"
                                          value={cottonwoodHeights.parking.assignments.grocery.structuredSpaces}
                                          onChange={(e) => setCottonwoodHeights({
                                            ...cottonwoodHeights,
                                            parking: {
                                              ...cottonwoodHeights.parking,
                                              assignments: {
                                                ...cottonwoodHeights.parking.assignments,
                                                grocery: { ...cottonwoodHeights.parking.assignments.grocery, structuredSpaces: Number(e.target.value) }
                                              }
                                            }
                                          })}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Townhomes Parking */}
                                {cottonwoodHeights.townhomes.enabled && (
                                  <div className="p-3 bg-purple-50 rounded-lg">
                                    <h6 className="font-medium text-sm mb-2">Townhomes Parking</h6>
                                    <div className="grid grid-cols-3 gap-3">
                                      <div>
                                        <label className="block text-xs text-gray-600 mb-1">Required Spaces</label>
                                        <input
                                          type="number"
                                          value={cottonwoodHeights.parking.assignments.townhomes.requiredSpaces}
                                          onChange={(e) => setCottonwoodHeights({
                                            ...cottonwoodHeights,
                                            parking: {
                                              ...cottonwoodHeights.parking,
                                              assignments: {
                                                ...cottonwoodHeights.parking.assignments,
                                                townhomes: { ...cottonwoodHeights.parking.assignments.townhomes, requiredSpaces: Number(e.target.value) }
                                              }
                                            }
                                          })}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-600 mb-1">Surface</label>
                                        <input
                                          type="number"
                                          value={cottonwoodHeights.parking.assignments.townhomes.surfaceSpaces}
                                          onChange={(e) => setCottonwoodHeights({
                                            ...cottonwoodHeights,
                                            parking: {
                                              ...cottonwoodHeights.parking,
                                              assignments: {
                                                ...cottonwoodHeights.parking.assignments,
                                                townhomes: { ...cottonwoodHeights.parking.assignments.townhomes, surfaceSpaces: Number(e.target.value) }
                                              }
                                            }
                                          })}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-600 mb-1">Structured</label>
                                        <input
                                          type="number"
                                          value={cottonwoodHeights.parking.assignments.townhomes.structuredSpaces}
                                          onChange={(e) => setCottonwoodHeights({
                                            ...cottonwoodHeights,
                                            parking: {
                                              ...cottonwoodHeights.parking,
                                              assignments: {
                                                ...cottonwoodHeights.parking.assignments,
                                                townhomes: { ...cottonwoodHeights.parking.assignments.townhomes, structuredSpaces: Number(e.target.value) }
                                              }
                                            }
                                          })}
                                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Visitor Parking */}
                                <div className="p-3 bg-gray-50 rounded-lg">
                                  <h6 className="font-medium text-sm mb-2">Visitor/Overflow Parking</h6>
                                  <div className="grid grid-cols-3 gap-3">
                                    <div>
                                      <label className="block text-xs text-gray-600 mb-1">Required Spaces</label>
                                      <input
                                        type="number"
                                        value={cottonwoodHeights.parking.assignments.visitor.requiredSpaces}
                                        onChange={(e) => setCottonwoodHeights({
                                          ...cottonwoodHeights,
                                          parking: {
                                            ...cottonwoodHeights.parking,
                                            assignments: {
                                              ...cottonwoodHeights.parking.assignments,
                                              visitor: { ...cottonwoodHeights.parking.assignments.visitor, requiredSpaces: Number(e.target.value) }
                                            }
                                          }
                                        })}
                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-600 mb-1">Surface</label>
                                      <input
                                        type="number"
                                        value={cottonwoodHeights.parking.assignments.visitor.surfaceSpaces}
                                        onChange={(e) => setCottonwoodHeights({
                                          ...cottonwoodHeights,
                                          parking: {
                                            ...cottonwoodHeights.parking,
                                            assignments: {
                                              ...cottonwoodHeights.parking.assignments,
                                              visitor: { ...cottonwoodHeights.parking.assignments.visitor, surfaceSpaces: Number(e.target.value) }
                                            }
                                          }
                                        })}
                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-600 mb-1">Structured</label>
                                      <input
                                        type="number"
                                        value={cottonwoodHeights.parking.assignments.visitor.structuredSpaces}
                                        onChange={(e) => setCottonwoodHeights({
                                          ...cottonwoodHeights,
                                          parking: {
                                            ...cottonwoodHeights.parking,
                                            assignments: {
                                              ...cottonwoodHeights.parking.assignments,
                                              visitor: { ...cottonwoodHeights.parking.assignments.visitor, structuredSpaces: Number(e.target.value) }
                                            }
                                          }
                                        })}
                                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Parking Summary */}
                                <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                                  <h6 className="font-medium text-sm mb-2">Parking Summary</h6>
                                  <div className="grid grid-cols-3 gap-3 text-sm">
                                    <div>
                                      <div className="text-gray-600">Total Required:</div>
                                      <div className="font-medium">
                                        {Object.values(cottonwoodHeights.parking.assignments).reduce((sum, comp) => sum + comp.requiredSpaces, 0)}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-gray-600">Total Surface:</div>
                                      <div className="font-medium">
                                        {Object.values(cottonwoodHeights.parking.assignments).reduce((sum, comp) => sum + comp.surfaceSpaces, 0)}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-gray-600">Total Structured:</div>
                                      <div className="font-medium">
                                        {Object.values(cottonwoodHeights.parking.assignments).reduce((sum, comp) => sum + comp.structuredSpaces, 0)}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-2 text-xs text-gray-600">
                                    Total Cost: ${((Object.values(cottonwoodHeights.parking.assignments).reduce((sum, comp) => sum + comp.surfaceSpaces, 0) * cottonwoodHeights.parking.surfaceCostPerSpace) +
                                      (Object.values(cottonwoodHeights.parking.assignments).reduce((sum, comp) => sum + comp.structuredSpaces, 0) * cottonwoodHeights.parking.structuredCostPerSpace)).toLocaleString()}
                                  </div>
                                </div>
                              </div>

                              {/* Parking Revenue */}
                              <div className="mt-4 p-3 bg-gray-50 rounded">
                                <h5 className="text-sm font-medium text-gray-700 mb-2">Parking Revenue</h5>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">Monthly Rate/Space</label>
                                    <input
                                      type="number"
                                      value={cottonwoodHeights.parking.monthlyRevenue}
                                      onChange={(e) => setCottonwoodHeights({
                                        ...cottonwoodHeights,
                                        parking: { ...cottonwoodHeights.parking, monthlyRevenue: Number(e.target.value) }
                                      })}
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-600 mb-1">Utilization Rate %</label>
                                    <input
                                      type="number"
                                      value={cottonwoodHeights.parking.utilizationRate}
                                      onChange={(e) => setCottonwoodHeights({
                                        ...cottonwoodHeights,
                                        parking: { ...cottonwoodHeights.parking, utilizationRate: Number(e.target.value) }
                                      })}
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                      min="0"
                                      max="100"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Separate Financing */}
                      <div>
                        <h3 className="font-medium text-gray-900 mb-3">Separate Financing</h3>
                        
                        {/* Retail/Commercial Financing */}
                        <div className="mb-4 p-4 border border-blue-200 bg-blue-50 rounded-lg">
                          <h4 className="font-medium mb-3">Retail/Commercial Financing</h4>
                          
                          {/* Construction Loan */}
                          <div className="mb-3">
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Construction Loan</h5>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">LTC %</label>
                                <input
                                  type="number"
                                  value={cottonwoodFinancing.retailConstruction.ltc}
                                  onChange={(e) => setCottonwoodFinancing({
                                    ...cottonwoodFinancing,
                                    retailConstruction: { ...cottonwoodFinancing.retailConstruction, ltc: Number(e.target.value) }
                                  })}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Rate %</label>
                                <input
                                  type="number"
                                  value={cottonwoodFinancing.retailConstruction.rate}
                                  onChange={(e) => setCottonwoodFinancing({
                                    ...cottonwoodFinancing,
                                    retailConstruction: { ...cottonwoodFinancing.retailConstruction, rate: Number(e.target.value) }
                                  })}
                                  step="0.25"
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Term (mo)</label>
                                <input
                                  type="number"
                                  value={cottonwoodFinancing.retailConstruction.term}
                                  onChange={(e) => setCottonwoodFinancing({
                                    ...cottonwoodFinancing,
                                    retailConstruction: { ...cottonwoodFinancing.retailConstruction, term: Number(e.target.value) }
                                  })}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Orig Fee %</label>
                                <input
                                  type="number"
                                  value={cottonwoodFinancing.retailConstruction.originationFee}
                                  onChange={(e) => setCottonwoodFinancing({
                                    ...cottonwoodFinancing,
                                    retailConstruction: { ...cottonwoodFinancing.retailConstruction, originationFee: Number(e.target.value) }
                                  })}
                                  step="0.25"
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* Permanent Loan */}
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Permanent Loan</h5>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">LTV %</label>
                                <input
                                  type="number"
                                  value={cottonwoodFinancing.retailPermanent.ltv}
                                  onChange={(e) => setCottonwoodFinancing({
                                    ...cottonwoodFinancing,
                                    retailPermanent: { ...cottonwoodFinancing.retailPermanent, ltv: Number(e.target.value) }
                                  })}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Rate %</label>
                                <input
                                  type="number"
                                  value={cottonwoodFinancing.retailPermanent.rate}
                                  onChange={(e) => setCottonwoodFinancing({
                                    ...cottonwoodFinancing,
                                    retailPermanent: { ...cottonwoodFinancing.retailPermanent, rate: Number(e.target.value) }
                                  })}
                                  step="0.25"
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Amort (yr)</label>
                                <input
                                  type="number"
                                  value={cottonwoodFinancing.retailPermanent.amortization}
                                  onChange={(e) => setCottonwoodFinancing({
                                    ...cottonwoodFinancing,
                                    retailPermanent: { ...cottonwoodFinancing.retailPermanent, amortization: Number(e.target.value) }
                                  })}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Exit Cap %</label>
                                <input
                                  type="number"
                                  value={cottonwoodFinancing.retailPermanent.exitCapRate}
                                  onChange={(e) => setCottonwoodFinancing({
                                    ...cottonwoodFinancing,
                                    retailPermanent: { ...cottonwoodFinancing.retailPermanent, exitCapRate: Number(e.target.value) }
                                  })}
                                  step="0.25"
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Townhome Financing */}
                        <div className="mb-4 p-4 border border-green-200 bg-green-50 rounded-lg">
                          <h4 className="font-medium mb-3">Townhome Financing</h4>
                          
                          {/* Construction Loan */}
                          <div className="mb-3">
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Construction Loan</h5>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">LTC %</label>
                                <input
                                  type="number"
                                  value={cottonwoodFinancing.townhomeConstruction.ltc}
                                  onChange={(e) => setCottonwoodFinancing({
                                    ...cottonwoodFinancing,
                                    townhomeConstruction: { ...cottonwoodFinancing.townhomeConstruction, ltc: Number(e.target.value) }
                                  })}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Rate %</label>
                                <input
                                  type="number"
                                  value={cottonwoodFinancing.townhomeConstruction.rate}
                                  onChange={(e) => setCottonwoodFinancing({
                                    ...cottonwoodFinancing,
                                    townhomeConstruction: { ...cottonwoodFinancing.townhomeConstruction, rate: Number(e.target.value) }
                                  })}
                                  step="0.25"
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Term (mo)</label>
                                <input
                                  type="number"
                                  value={cottonwoodFinancing.townhomeConstruction.term}
                                  onChange={(e) => setCottonwoodFinancing({
                                    ...cottonwoodFinancing,
                                    townhomeConstruction: { ...cottonwoodFinancing.townhomeConstruction, term: Number(e.target.value) }
                                  })}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Orig Fee %</label>
                                <input
                                  type="number"
                                  value={cottonwoodFinancing.townhomeConstruction.originationFee}
                                  onChange={(e) => setCottonwoodFinancing({
                                    ...cottonwoodFinancing,
                                    townhomeConstruction: { ...cottonwoodFinancing.townhomeConstruction, originationFee: Number(e.target.value) }
                                  })}
                                  step="0.25"
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* Permanent Loan */}
                          <div>
                            <h5 className="text-sm font-medium text-gray-700 mb-2">Permanent Loan</h5>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">LTV %</label>
                                <input
                                  type="number"
                                  value={cottonwoodFinancing.townhomePermanent.ltv}
                                  onChange={(e) => setCottonwoodFinancing({
                                    ...cottonwoodFinancing,
                                    townhomePermanent: { ...cottonwoodFinancing.townhomePermanent, ltv: Number(e.target.value) }
                                  })}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Rate %</label>
                                <input
                                  type="number"
                                  value={cottonwoodFinancing.townhomePermanent.rate}
                                  onChange={(e) => setCottonwoodFinancing({
                                    ...cottonwoodFinancing,
                                    townhomePermanent: { ...cottonwoodFinancing.townhomePermanent, rate: Number(e.target.value) }
                                  })}
                                  step="0.25"
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Amort (yr)</label>
                                <input
                                  type="number"
                                  value={cottonwoodFinancing.townhomePermanent.amortization}
                                  onChange={(e) => setCottonwoodFinancing({
                                    ...cottonwoodFinancing,
                                    townhomePermanent: { ...cottonwoodFinancing.townhomePermanent, amortization: Number(e.target.value) }
                                  })}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Exit Cap %</label>
                                <input
                                  type="number"
                                  value={cottonwoodFinancing.townhomePermanent.exitCapRate}
                                  onChange={(e) => setCottonwoodFinancing({
                                    ...cottonwoodFinancing,
                                    townhomePermanent: { ...cottonwoodFinancing.townhomePermanent, exitCapRate: Number(e.target.value) }
                                  })}
                                  step="0.25"
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* TIF & Public Financing */}
                      <div>
                        <h3 className="font-medium text-gray-900 mb-3">TIF & Public Financing</h3>
                        
                        {/* TIF */}
                        <div className="mb-4 p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">Tax Increment Financing (TIF)</h4>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={cottonwoodHeights.tif.enabled}
                                onChange={(e) => setCottonwoodHeights({
                                  ...cottonwoodHeights,
                                  tif: { ...cottonwoodHeights.tif, enabled: e.target.checked }
                                })}
                                className="mr-2"
                              />
                              <span className="text-sm">Enabled</span>
                            </label>
                          </div>
                          {cottonwoodHeights.tif.enabled && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Capture Rate (%)
                                  <InfoTooltip content="Percentage of incremental property taxes captured by TIF" />
                                </label>
                                <input
                                  type="number"
                                  value={cottonwoodHeights.tif.commercial.captureRate}
                                  onChange={(e) => setCottonwoodHeights({
                                    ...cottonwoodHeights,
                                    tif: { 
                                      ...cottonwoodHeights.tif, 
                                      commercial: { ...cottonwoodHeights.tif.commercial, captureRate: Number(e.target.value) },
                                      grocery: { ...cottonwoodHeights.tif.grocery, captureRate: Number(e.target.value) },
                                      residential: { ...cottonwoodHeights.tif.residential, captureRate: Number(e.target.value) }
                                    }
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Term (Years)</label>
                                <input
                                  type="number"
                                  value={cottonwoodHeights.tif.commercial.term}
                                  onChange={(e) => setCottonwoodHeights({
                                    ...cottonwoodHeights,
                                    tif: { 
                                      ...cottonwoodHeights.tif, 
                                      commercial: { ...cottonwoodHeights.tif.commercial, term: Number(e.target.value) }
                                    }
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Public Financing - replaced by StateFundingSection */}

                        {/* Cross-Subsidization Summary */}
                        <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                          <h4 className="font-medium text-yellow-900 mb-2">Cross-Subsidization Analysis</h4>
                          <div className="text-sm text-yellow-800 space-y-1">
                            <p>• Commercial components subsidize market rate housing through higher returns</p>
                            <p>• TIF revenues support public infrastructure and market rate housing</p>
                            <p>• Mixed-use density allows for efficient land use and shared parking</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Analysis */}
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Key Metrics</h2>
              <div className="space-y-3">
                <div 
                  className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors"
                  onClick={() => setActiveMetricBreakdown('Project IRR')}
                >
                  <span className="text-gray-700 flex items-center">
                    Project IRR
                    <InfoTooltip content="Click to see detailed IRR breakdown" />
                  </span>
                  <span className="text-xl font-bold text-yellow-600">
                    {combinedReturns.irr}%
                  </span>
                </div>
                <div 
                  className="flex justify-between items-center p-3 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                  onClick={() => setActiveMetricBreakdown('Equity Multiple')}
                >
                  <span className="text-gray-700">Equity Multiple</span>
                  <span className="text-xl font-bold text-green-600">
                    {combinedReturns.equityMultiple}x
                  </span>
                </div>
                <div 
                  className="flex justify-between items-center p-3 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors"
                  onClick={() => setActiveMetricBreakdown('Total Development Cost')}
                >
                  <div>
                    <span className="text-gray-700">Total Development Cost</span>
                    {softCosts.developerFeeEnabled && calculateTotalCost.developerFee > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        Land: {formatCurrency(calculateLandCost)} + Hard/Soft: {formatCurrency(calculateTotalCost.total - calculateLandCost - calculateTotalCost.developerFee)} + Dev Fee ({softCosts.developerFee}%): {formatCurrency(calculateTotalCost.developerFee)}
                      </div>
                    )}
                    {/* Public financing display - replaced by StateFundingSection */}
                  </div>
                  <span className="text-lg font-bold text-purple-600">
                    {formatCurrency(calculateTotalCost.total)}
                  </span>
                </div>
                <div 
                  className="flex justify-between items-center p-3 bg-orange-50 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors"
                  onClick={() => setActiveMetricBreakdown('Equity Required')}
                >
                  <span className="text-gray-700">Equity Required</span>
                  <span className="text-lg font-bold text-orange-600">
                    {formatCurrency(calculateFinancing.equityRequired)}
                  </span>
                </div>
                {propertyType === "forSale" ? (
                  <>
                    <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                      <span className="text-gray-700">Gross Profit</span>
                      <span className="text-xl font-bold text-yellow-600">
                        {formatCurrency(
                          salesAssumptions.totalUnits *
                            salesAssumptions.avgPricePerUnit -
                            calculateTotalCost.total
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
                      <span className="text-gray-700">Gross Margin</span>
                      <span className="text-xl font-bold text-indigo-600">
                        {calculateTotalCost.total > 0 &&
                        salesAssumptions.totalUnits *
                          salesAssumptions.avgPricePerUnit >
                          0
                          ? (
                              ((salesAssumptions.totalUnits *
                                salesAssumptions.avgPricePerUnit -
                                calculateTotalCost.total) /
                                (salesAssumptions.totalUnits *
                                  salesAssumptions.avgPricePerUnit)) *
                              100
                            ).toFixed(1) + "%"
                          : "0.0%"}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div 
                      className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors"
                      onClick={() => setActiveMetricBreakdown('Avg Cash-on-Cash')}
                    >
                      <span className="text-gray-700">Avg Cash-on-Cash</span>
                      <span className="text-xl font-bold text-yellow-600">
                        {combinedReturns.avgCashOnCash}%
                      </span>
                    </div>
                    <div 
                      className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg cursor-pointer hover:bg-indigo-100 transition-colors"
                      onClick={() => setActiveMetricBreakdown('Yield on Cost')}
                    >
                      <span className="text-gray-700">Yield on Cost</span>
                      <span className="text-xl font-bold text-indigo-600">
                        {calculateAdditionalMetrics.yieldOnCost}%
                      </span>
                    </div>
                  </>
                )}
              </div>
              
              {/* Settings Toggle */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showWaterfallSection}
                      onChange={(e) => setShowWaterfallSection(e.target.checked)}
                      className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Show Waterfall Distribution
                    </span>
                  </label>
                  <InfoTooltip content="Toggle to show/hide the waterfall distribution analysis section" />
                </div>
              </div>
            </div>

            {/* AI Analysis */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">AI Analysis</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Powered by Claude</span>
                  {!ApiKeyManager.hasApiKey() && (
                    <span className="text-xs text-yellow-600 flex items-center gap-1">
                      <Settings size={12} />
                      API Key Required
                    </span>
                  )}
                </div>
              </div>
              
              {aiEnabled ? (
                <AIInsightsIntegration
                  scenario={{
                    propertyInfo: {
                      propertyType: propertyType,
                      address: 'Development Project',
                      netRentableArea: buildingGFA * 0.85, // Assuming 85% efficiency
                      units: propertyType === 'apartment' ? unitMix.reduce((sum, unit) => sum + unit.units, 0) : 1
                    },
                    acquisition: {
                      purchasePrice: landCost,
                      closingCosts: (landCost * 0.02), // Assuming 2% closing costs
                      renovationCosts: calculateTotalCost.hardCost + calculateTotalCost.softCost
                    },
                    financing: {
                      loanAmount: calculateCashFlows?.permanentLoanAmount || 0,
                      interestRate: permanentLoan.rate,
                      term: permanentLoan.amortization
                    },
                    income: {
                      baseRent: calculateCashFlows?.year1NOI || 0
                    },
                    assumptions: {
                      vacancy: operatingAssumptions.vacancy,
                      rentGrowth: operatingAssumptions.rentGrowth,
                      holdPeriod: operatingAssumptions.holdPeriod,
                      exitCapRate: operatingAssumptions.capRate
                    },
                    targets: {
                      irr: 15 // Default target
                    }
                  }}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-gray-900 font-medium"
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">AI features are disabled</p>
                  <button
                    onClick={() => setShowApiKeyModal(true)}
                    className="px-4 py-2 bg-yellow-600 text-gray-900 rounded-lg hover:bg-yellow-500 font-medium transition-colors"
                  >
                    Enable AI Features
                  </button>
                </div>
              )}
            </div>

            {/* Sources & Uses */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Sources & Uses</h2>
              <div className="h-64 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourcesUsesData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {sourcesUsesData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCurrency(value as number)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Senior Debt</span>
                  <span className="font-medium">
                    {formatCurrency(calculateFinancing.constructionLoanAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>LP Equity ({equityStructure.lpEquity}%)</span>
                  <span className="font-medium">
                    {formatCurrency(calculateFinancing.lpEquity)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>GP Equity ({equityStructure.gpEquity}%)</span>
                  <span className="font-medium">
                    {formatCurrency(calculateFinancing.totalGPCommitment)}
                  </span>
                </div>
              </div>
              
              {/* LP/GP Equity Split Slider */}
              <EquitySlider
                lpEquity={equityStructure.lpEquity}
                gpEquity={equityStructure.gpEquity}
                totalEquity={calculateFinancing.equityRequired}
                onEquityChange={(newLpEquity, newGpEquity) => {
                  setEquityStructure({
                    ...equityStructure,
                    lpEquity: newLpEquity,
                    gpEquity: newGpEquity
                  });
                }}
              />
            </div>

            {/* Additional Metrics */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">
                Development Metrics
              </h2>
              <div className="space-y-3">
                {propertyType === "forSale" ? (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Average Price/Unit
                      </span>
                      <span className="text-lg font-semibold">
                        {formatCurrency(salesAssumptions.avgPricePerUnit)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Cost/Unit</span>
                      <span className="text-lg font-semibold">
                        {formatCurrency(
                          calculateTotalCost.total / salesAssumptions.totalUnits
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Profit/Unit</span>
                      <span className="text-lg font-semibold">
                        {formatCurrency(
                          salesAssumptions.avgPricePerUnit -
                            calculateTotalCost.total /
                              salesAssumptions.totalUnits
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Presales Required
                      </span>
                      <span className="text-lg font-semibold">
                        {Math.ceil(
                          (salesAssumptions.totalUnits *
                            salesAssumptions.presalesRequired) /
                            100
                        )}{" "}
                        units
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Development Spread
                      </span>
                      <span className="text-lg font-semibold">
                        {calculateAdditionalMetrics.developmentSpread} bps
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Profit Margin
                      </span>
                      <span className="text-lg font-semibold">
                        {calculateAdditionalMetrics.profitMargin}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Break-even Occupancy
                      </span>
                      <span className="text-lg font-semibold">
                        {calculateAdditionalMetrics.breakEvenOccupancy}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Payback Period
                      </span>
                      <span className="text-lg font-semibold">
                        {combinedReturns.paybackPeriod} years
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* TIF Analysis for Cottonwood Heights */}
            {propertyType === "cottonwoodHeights" && cottonwoodHeights.tif.enabled && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">TIF Analysis</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Base Assessed Value</span>
                    <span className="text-lg font-semibold">
                      {formatCurrency(
                        cottonwoodHeights.tif.commercial.baseAssessedValue +
                        cottonwoodHeights.tif.grocery.baseAssessedValue +
                        cottonwoodHeights.tif.residential.baseAssessedValue
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Projected Value</span>
                    <span className="text-lg font-semibold">
                      {formatCurrency(calculateTIFAnalysis.projectedValue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Incremental Value</span>
                    <span className="text-lg font-semibold">
                      {formatCurrency(calculateTIFAnalysis.incrementalValue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                    <span className="text-gray-700 font-medium">Annual TIF Revenue</span>
                    <span className="text-xl font-bold text-yellow-600">
                      {formatCurrency(calculateTIFAnalysis.annualRevenue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-gray-700 font-medium">20-Year Total</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(calculateTIFAnalysis.totalRevenue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="text-gray-700 font-medium">NPV @ 5%</span>
                    <span className="text-xl font-bold text-purple-600">
                      {formatCurrency(calculateTIFAnalysis.npv)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Cross-Subsidization Analysis for Cottonwood Heights */}
            {propertyType === "cottonwoodHeights" && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Cross-Subsidization Analysis</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Commercial NOI</span>
                    <span className="text-lg font-semibold text-green-600">
                      {formatCurrency(calculateCrossSubsidy.commercialNOI)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Townhome NOI</span>
                    <span className="text-lg font-semibold text-blue-600">
                      {formatCurrency(calculateCrossSubsidy.marketRateNOI)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                    <span className="text-gray-700 font-medium">Net Project NOI</span>
                    <span className="text-xl font-bold text-yellow-600">
                      {formatCurrency(calculateCrossSubsidy.netSubsidy)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cash Flow Analysis */}
        <div className="mt-6 bg-white rounded-lg shadow-sm">
          <div
            className="p-6 cursor-pointer hover:bg-gray-50"
            onClick={() => toggleSection('cashflow')}
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <BarChartIcon className="w-6 h-6 text-blue-600" />
                Cash Flow Projection
              </h2>
              {expandedSections.cashflow ? (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-500" />
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Annual cash flow projections with detailed breakdown by year
            </p>
          </div>
          
          {expandedSections.cashflow && (
            <div className="p-6 pt-0">
              <div className="mb-6">
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cashFlowChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" />
                      <YAxis
                        tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                      />
                      <Tooltip
                        formatter={(value) => formatCurrency(value as number)}
                      />
                      <Legend />
                      <Bar dataKey="noi" fill="#10B981" name="NOI" />
                      <Bar dataKey="cashFlow" fill="#3B82F6" name="Cash Flow" />
                      <Bar dataKey="refinanceProceeds" fill="#F59E0B" name="Refinance Proceeds" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              {/* Detailed Cash Flow Table */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Detailed Cash Flow by Year</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Year</th>
                        <th className="text-right py-2 px-2">Revenue</th>
                        <th className="text-right py-2 px-2">Expenses</th>
                        <th className="text-right py-2 px-2">NOI</th>
                        {propertyType === "cottonwoodHeights" && (
                          <>
                            <th className="text-right py-2 px-2">TIF</th>
                            <th className="text-right py-2 px-2">Ground Lease</th>
                            <th className="text-right py-2 px-2">State Funding</th>
                          </>
                        )}
                        <th className="text-right py-2 px-2">Debt Service</th>
                        <th className="text-right py-2 px-2">Cash Flow</th>
                        <th className="text-right py-2 px-2">Cumulative</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculateCashFlows?.cashFlows?.map((cf, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-2 font-medium">{cf.year}</td>
                          <td className="text-right py-2 px-2">
                            {formatCurrency(cf.rent || cf.grossRevenue || 0)}
                          </td>
                          <td className="text-right py-2 px-2">
                            {formatCurrency(cf.expenses || cf.operatingExpenses || 0)}
                          </td>
                          <td className="text-right py-2 px-2 font-medium text-green-600">
                            {formatCurrency(cf.noi || 0)}
                          </td>
                          {propertyType === "cottonwoodHeights" && (
                            <>
                              <td className="text-right py-2 px-2 text-purple-600">
                                {formatCurrency(cf.tifRevenue || 0)}
                              </td>
                              <td className="text-right py-2 px-2 text-orange-600">
                                {formatCurrency(cf.groundLeasePayment || 0)}
                              </td>
                              <td className="text-right py-2 px-2 text-indigo-600">
                                {formatCurrency(cf.stateFunding || 0)}
                              </td>
                            </>
                          )}
                          <td className="text-right py-2 px-2">
                            {formatCurrency(cf.debtService || 0)}
                          </td>
                          <td className="text-right py-2 px-2 font-medium text-blue-600">
                            {formatCurrency(cf.cashFlow || 0)}
                          </td>
                          <td className="text-right py-2 px-2 font-bold">
                            {formatCurrency(cf.cumulativeCashFlow || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Waterfall Distribution */}
        {showWaterfallSection && (propertyType !== "cottonwoodHeights" || cottonwoodEquity.waterfallEnabled) && (
          <div className="mt-6 bg-white rounded-lg shadow-sm">
            <div
              className="p-6 cursor-pointer hover:bg-gray-50"
              onClick={() => toggleSection('waterfall')}
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Users className="w-6 h-6 text-purple-600" />
                  Waterfall Distribution
                </h2>
                {expandedSections.waterfall ? (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Partnership waterfall structure with sponsor promote fees
              </p>
            </div>
            
            {expandedSections.waterfall && (
              <div className="p-6 pt-0">
                {propertyType === "cottonwoodHeights" && (
                  <div className="mb-4 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={cottonwoodEquity.waterfallEnabled}
                      onChange={(e) => setCottonwoodEquity({
                        ...cottonwoodEquity,
                        waterfallEnabled: e.target.checked
                      })}
                      className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                    />
                    <label className="text-sm font-medium text-gray-700">
                      Enable Waterfall Distribution
                    </label>
                  </div>
                )}
                <WaterfallDistribution
                  totalDistributions={calculateCashFlows?.cashFlows?.reduce((sum, cf) => 
                    sum + (cf.cashFlow || 0), 0) || 0}
                  initialEquity={Math.abs(calculateCashFlows?.cashFlows?.[0]?.cashFlow || 0)}
                  preferredReturn={equityStructure.preferredReturn}
                  sponsorPromote={equityStructure.sponsorPromote}
                  setSponsorPromote={(value) => setEquityStructure({
                    ...equityStructure,
                    sponsorPromote: value
                  })}
                  waterfallTiers={waterfallTiers}
                  setWaterfallTiers={setWaterfallTiers}
                  equityStructure={equityStructure}
                />
              </div>
            )}
          </div>
        )}

        {/* Sensitivity Analysis */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Sensitivity Analysis</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setSensitivityVariable("rent")}
                className={`px-3 py-1 rounded-lg text-sm ${
                  sensitivityVariable === "rent"
                    ? "bg-yellow-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Rent
              </button>
              <button
                onClick={() => setSensitivityVariable("construction")}
                className={`px-3 py-1 rounded-lg text-sm ${
                  sensitivityVariable === "construction"
                    ? "bg-yellow-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Construction
              </button>
              <button
                onClick={() => setSensitivityVariable("capRate")}
                className={`px-3 py-1 rounded-lg text-sm ${
                  sensitivityVariable === "capRate"
                    ? "bg-yellow-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Cap Rate
              </button>
              <button
                onClick={() => setSensitivityVariable("interestRate")}
                className={`px-3 py-1 rounded-lg text-sm ${
                  sensitivityVariable === "interestRate"
                    ? "bg-yellow-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Interest
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left text-sm font-medium text-gray-700 pb-2">
                    {formatSensitivityLabel(sensitivityVariable)}
                  </th>
                  {calculateSensitivityAnalysis.map((item, index) => (
                    <th
                      key={index}
                      className="text-center text-sm font-medium text-gray-700 pb-2 px-2"
                    >
                      {sensitivityVariable === "capRate" ||
                      sensitivityVariable === "interestRate"
                        ? `${item.change > 0 ? "+" : ""}${item.change}bps`
                        : `${item.change > 0 ? "+" : ""}${item.change}%`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-sm font-medium text-gray-700 py-2">
                    Project IRR
                  </td>
                  {calculateSensitivityAnalysis.map((item, index) => (
                    <td
                      key={index}
                      className={`text-center text-sm font-semibold py-2 px-2 rounded ${
                        item.change === 0
                          ? "bg-gray-100 ring-2 ring-yellow-500"
                          : getSensitivityColor(item.delta)
                      }`}
                    >
                      {item.irr.toFixed(1)}%
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="text-sm font-medium text-gray-700 py-2">
                    Δ from Base
                  </td>
                  {calculateSensitivityAnalysis.map((item, index) => (
                    <td
                      key={index}
                      className={`text-center text-sm py-2 px-2 ${
                        item.change === 0 ? "text-gray-500" : ""
                      }`}
                    >
                      {item.change === 0
                        ? "-"
                        : `${item.delta > 0 ? "+" : ""}${item.delta.toFixed(
                            1
                          )}%`}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* TIF Revenue Chart for Cottonwood Heights */}
        {propertyType === "cottonwoodHeights" && cottonwoodHeights.tif.enabled && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">TIF Revenue Projection</h2>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={calculateTIFAnalysis.yearByYear}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" label={{ value: 'Year', position: 'insideBottom', offset: -5 }} />
                  <YAxis 
                    yAxisId="left"
                    tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                    label={{ value: 'Annual Revenue', angle: -90, position: 'insideLeft' }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                    label={{ value: 'Cumulative', angle: 90, position: 'insideRight' }}
                  />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3B82F6" 
                    name="Annual TIF Revenue"
                    strokeWidth={2}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="cumulativeRevenue" 
                    stroke="#10B981" 
                    name="Cumulative Revenue"
                    strokeWidth={2}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="cumulativeNPV" 
                    stroke="#8B5CF6" 
                    name="Cumulative NPV"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>This chart shows TIF revenue projections over the {cottonwoodHeights.tif.commercial.term}-year term.</p>
              <p>NPV calculated at 5% discount rate. Values update automatically as you change inputs.</p>
            </div>
          </div>
        )}

        {/* Risk Analysis Section */}
        {mode === "detailed" && (
          <div className="mt-6 bg-white rounded-lg shadow-sm">
            <button
              onClick={() => toggleSection("riskAnalysis")}
              className="w-full p-4 flex justify-between items-center hover:bg-gray-50"
            >
              <h2 className="text-xl font-semibold">Risk Analysis</h2>
              {expandedSections.riskAnalysis ? (
                <ChevronDown />
              ) : (
                <ChevronRight />
              )}
            </button>
            {expandedSections.riskAnalysis && (
              <div className="p-6 border-t space-y-6">
                {/* Scenario Analysis */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Scenario Analysis
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Scenario</th>
                          <th className="text-center py-2">Probability</th>
                          <th className="text-center py-2">IRR</th>
                          <th className="text-center py-2">Equity Multiple</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calculateScenarioAnalysis.map((scenario, index) => (
                          <tr key={index} className="border-b">
                            <td className="py-2">{scenario.scenario}</td>
                            <td className="text-center py-2">
                              {scenario.probability}%
                            </td>
                            <td className="text-center py-2 font-semibold">
                              {scenario.irr}%
                            </td>
                            <td className="text-center py-2">
                              {scenario.equityMultiple}x
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      Probability-Weighted IRR:{" "}
                      <span className="font-bold text-yellow-600">
                        {probabilityWeightedIRR}%
                      </span>
                    </p>
                  </div>
                </div>

                {/* Monte Carlo Simulation */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Monte Carlo Simulation
                  </h3>
                  
                  {/* Monte Carlo Settings */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-3">Simulation Parameters</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Rent uses normal distribution, construction costs use uniform distribution
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Iterations
                        </label>
                        <input
                          type="number"
                          value={monteCarloParams.iterations}
                          onChange={(e) => setMonteCarloParams({
                            ...monteCarloParams,
                            iterations: Number(e.target.value)
                          })}
                          min="100"
                          max="10000"
                          step="100"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Rent Volatility (%)
                        </label>
                        <input
                          type="number"
                          value={monteCarloParams.rentVolatility}
                          onChange={(e) => setMonteCarloParams({
                            ...monteCarloParams,
                            rentVolatility: Number(e.target.value)
                          })}
                          min="0"
                          max="50"
                          step="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cost Volatility (%)
                        </label>
                        <input
                          type="number"
                          value={monteCarloParams.costVolatility}
                          onChange={(e) => setMonteCarloParams({
                            ...monteCarloParams,
                            costVolatility: Number(e.target.value)
                          })}
                          min="0"
                          max="50"
                          step="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cap Rate Volatility (bps)
                        </label>
                        <input
                          type="number"
                          value={monteCarloParams.capRateVolatility}
                          onChange={(e) => setMonteCarloParams({
                            ...monteCarloParams,
                            capRateVolatility: Number(e.target.value)
                          })}
                          min="0"
                          max="200"
                          step="10"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Mean IRR</p>
                      <p className="text-lg font-semibold">
                        {runMonteCarloSimulation.mean}%
                      </p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-gray-600">10th Percentile</p>
                      <p className="text-lg font-semibold text-red-600">
                        {runMonteCarloSimulation.p10}%
                      </p>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-gray-600">50th Percentile</p>
                      <p className="text-lg font-semibold text-yellow-600">
                        {runMonteCarloSimulation.p50}%
                      </p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600">90th Percentile</p>
                      <p className="text-lg font-semibold text-green-600">
                        {runMonteCarloSimulation.p90}%
                      </p>
                    </div>
                  </div>
                  
                  {/* Additional Monte Carlo Metrics */}
                  <div className="mb-4 p-4 bg-yellow-50 rounded-lg">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-700">Probability of IRR &gt; 15%</p>
                        <p className="text-lg font-bold text-yellow-600">
                          {runMonteCarloSimulation.distribution ? 
                            ((runMonteCarloSimulation.distribution.filter(irr => irr > 15).length / 
                              runMonteCarloSimulation.distribution.length) * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-700">Value at Risk (95% confidence)</p>
                        <p className="text-lg font-bold text-red-600">
                          {runMonteCarloSimulation.distribution && runMonteCarloSimulation.distribution.length > 0 ? 
                            runMonteCarloSimulation.distribution[
                              Math.floor(runMonteCarloSimulation.distribution.length * 0.05)
                            ]?.toFixed(2) || "0.00" : "0.00"}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-700">Standard Deviation</p>
                        <p className="text-lg font-bold text-gray-600">
                          {runMonteCarloSimulation.distribution && runMonteCarloSimulation.distribution.length > 0 ? 
                            Math.sqrt(
                              runMonteCarloSimulation.distribution.reduce((sum, irr) => {
                                const diff = irr - parseFloat(runMonteCarloSimulation.mean);
                                return sum + diff * diff;
                              }, 0) / runMonteCarloSimulation.distribution.length
                            ).toFixed(2) : "0.00"}%
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {monteCarloChartData.length > 0 && (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monteCarloChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="irr" />
                          <YAxis />
                          <Tooltip />
                          <Bar
                            dataKey="probability"
                            fill="#3B82F6"
                            name="Probability (%)"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}


        {/* Save Dialog - Updated to use v2 Scenario Management */}
        {showSaveDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold mb-4">Save Scenario</h3>
              <input
                type="text"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="Enter scenario name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-yellow-500"
              />
              <textarea
                placeholder="Description (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-yellow-500"
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setScenarioName("");
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (scenarioName.trim()) {
                      await saveCurrentScenario(scenarioName.trim());
                      setShowSaveDialog(false);
                      setScenarioName("");
                      // Also save to v1 format for compatibility
                      saveScenario();
                    }
                  }}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* IRR Breakdown Dialog */}
        {showIRRBreakdown && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-semibold mb-4">IRR Breakdown Analysis</h3>
              
              <div className="mb-6">
                <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                  <div className="text-lg font-semibold text-yellow-900">Project IRR: {combinedReturns.irr}%</div>
                  <div className="text-sm text-yellow-700">Equity Multiple: {combinedReturns.equityMultiple}x</div>
                </div>
                
                <h4 className="font-medium text-gray-900 mb-3">Cash Flow Contributions by Year</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-4 py-2 text-left">Year</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Cash Flow</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">Present Value</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">% of Total PV</th>
                        <th className="border border-gray-300 px-4 py-2 text-right">IRR Impact</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculateCashFlows?.cashFlows && calculateCashFlows.cashFlows.map((cf, index) => {
                        const discountRate = parseFloat(combinedReturns.irr) / 100;
                        const presentValue = cf.cashFlow / Math.pow(1 + discountRate, cf.year);
                        const totalPV = calculateCashFlows.cashFlows.reduce((sum, flow) => 
                          sum + flow.cashFlow / Math.pow(1 + discountRate, flow.year), 0
                        );
                        const pvPercentage = totalPV !== 0 ? (presentValue / totalPV) * 100 : 0;
                        const irrImpact = pvPercentage * parseFloat(combinedReturns.irr) / 100;
                        
                        const notes = cf.year === 0 ? "Initial Investment" : 
                                    cf.exitProceeds ? "Exit Sale" :
                                    cf.refinanceProceeds && cf.refinanceProceeds > 0 ? "Includes Refinance" : 
                                    "Operating Cash Flow";
                        
                        return (
                          <tr key={index} className={cf.year === 0 ? "bg-red-50" : cf.exitProceeds ? "bg-green-50" : ""}>
                            <td className="border border-gray-300 px-4 py-2">{cf.year}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              {formatCurrency(cf.cashFlow)}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              {formatCurrency(presentValue)}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              {pvPercentage.toFixed(1)}%
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              {irrImpact.toFixed(2)}%
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">
                              {notes}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-4 space-y-2">
                  <h4 className="font-medium text-gray-900">Key Insights</h4>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    <li>Initial equity investment: {formatCurrency(calculateFinancing.equityRequired)}</li>
                    <li>Total cash returned: {formatCurrency(
                      calculateCashFlows?.cashFlows?.reduce((sum, cf) => 
                        cf.year > 0 ? sum + cf.cashFlow : sum, 0
                      ) || 0
                    )}</li>
                    <li>Hold period: {operatingAssumptions.holdPeriod} years</li>
                    {calculateCashFlows?.cashFlows && calculateCashFlows.cashFlows.find(cf => cf.refinanceProceeds && cf.refinanceProceeds > 0) && (
                      <li>Refinance proceeds in Year 1: {formatCurrency(
                        calculateCashFlows.cashFlows.find(cf => cf.refinanceProceeds && cf.refinanceProceeds > 0)?.refinanceProceeds || 0
                      )}</li>
                    )}
                  </ul>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={() => setShowIRRBreakdown(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* v2 Scenario Manager Modal */}
        {showScenarioManager && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-semibold">Scenario Manager</h3>
                <button
                  onClick={() => setShowScenarioManager(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="mb-6">
                <button
                  onClick={() => {
                    const name = prompt("Enter scenario name:");
                    if (name) {
                      saveCurrentScenario(name);
                    }
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  + New Scenario
                </button>
              </div>
              
              <div className="space-y-4">
                {scenarios.map(scenario => (
                  <div key={scenario.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg flex items-center gap-2">
                          {editingScenarioId === scenario.id ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingScenarioName}
                                onChange={(e) => setEditingScenarioName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    updateScenarioName(scenario.id, editingScenarioName);
                                  } else if (e.key === 'Escape') {
                                    setEditingScenarioId(null);
                                    setEditingScenarioName("");
                                  }
                                }}
                                className="px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                              />
                              <button
                                onClick={() => updateScenarioName(scenario.id, editingScenarioName)}
                                className="text-green-600 hover:text-green-700"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => {
                                  setEditingScenarioId(null);
                                  setEditingScenarioName("");
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                ✗
                              </button>
                            </div>
                          ) : (
                            <>
                              <span 
                                className="cursor-pointer hover:text-blue-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingScenarioId(scenario.id);
                                  setEditingScenarioName(scenario.name);
                                }}
                              >
                                {scenario.name}
                              </span>
                              {scenario.id === activeScenarioId && (
                                <span className="text-sm bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Active</span>
                              )}
                            </>
                          )}
                        </h4>
                        {scenario.description && (
                          <p className="text-gray-600 mt-1">{scenario.description}</p>
                        )}
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">IRR:</span>{" "}
                            <span className="font-medium">{scenario.metrics.irr}%</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Equity Multiple:</span>{" "}
                            <span className="font-medium">{scenario.metrics.equityMultiple}x</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Total Cost:</span>{" "}
                            <span className="font-medium">{formatCurrency(scenario.metrics.totalCost)}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Created: {new Date(scenario.createdAt).toLocaleDateString()} | 
                          Updated: {new Date(scenario.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        {scenario.id !== activeScenarioId && (
                          <button
                            onClick={() => loadScenario(scenario.id)}
                            className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                          >
                            Load
                          </button>
                        )}
                        <button
                          onClick={() => duplicateScenario(scenario.id)}
                          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                        >
                          Duplicate
                        </button>
                        <button
                          onClick={() => deleteScenario(scenario.id)}
                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                          disabled={scenario.id === activeScenarioId}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowScenarioManager(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* v2 Scenario Comparison Modal */}
        {showScenarioComparison && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-7xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-semibold">Scenario Comparison</h3>
                <button
                  onClick={() => setShowScenarioComparison(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 mb-4">Select up to 4 scenarios to compare:</p>
                <div className="flex flex-wrap gap-2">
                  {scenarios.map(scenario => (
                    <label key={scenario.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={comparisonScenarios.includes(scenario.id)}
                        onChange={(e) => {
                          if (e.target.checked && comparisonScenarios.length < 4) {
                            setComparisonScenarios([...comparisonScenarios, scenario.id]);
                          } else if (!e.target.checked) {
                            setComparisonScenarios(comparisonScenarios.filter(id => id !== scenario.id));
                          }
                        }}
                        disabled={!comparisonScenarios.includes(scenario.id) && comparisonScenarios.length >= 4}
                      />
                      <span>{scenario.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {comparisonScenarios.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-4 py-2 text-left">Metric</th>
                        {comparisonScenarios.map(id => {
                          const scenario = scenarios.find(s => s.id === id);
                          return scenario ? (
                            <th key={id} className="border border-gray-300 px-4 py-2 text-center">
                              {scenario.name}
                            </th>
                          ) : null;
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 font-medium">Property Type</td>
                        {comparisonScenarios.map(id => {
                          const scenario = scenarios.find(s => s.id === id);
                          return scenario ? (
                            <td key={id} className="border border-gray-300 px-4 py-2 text-center">
                              {propertyTypes[scenario.data.propertyType]?.name || scenario.data.propertyType}
                            </td>
                          ) : null;
                        })}
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 font-medium">IRR</td>
                        {comparisonScenarios.map(id => {
                          const scenario = scenarios.find(s => s.id === id);
                          return scenario ? (
                            <td key={id} className="border border-gray-300 px-4 py-2 text-center font-semibold">
                              {scenario.metrics.irr}%
                            </td>
                          ) : null;
                        })}
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 font-medium">Equity Multiple</td>
                        {comparisonScenarios.map(id => {
                          const scenario = scenarios.find(s => s.id === id);
                          return scenario ? (
                            <td key={id} className="border border-gray-300 px-4 py-2 text-center">
                              {scenario.metrics.equityMultiple}x
                            </td>
                          ) : null;
                        })}
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 font-medium">Total Cost</td>
                        {comparisonScenarios.map(id => {
                          const scenario = scenarios.find(s => s.id === id);
                          return scenario ? (
                            <td key={id} className="border border-gray-300 px-4 py-2 text-center">
                              {formatCurrency(scenario.metrics.totalCost)}
                            </td>
                          ) : null;
                        })}
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 font-medium">Equity Required</td>
                        {comparisonScenarios.map(id => {
                          const scenario = scenarios.find(s => s.id === id);
                          return scenario ? (
                            <td key={id} className="border border-gray-300 px-4 py-2 text-center">
                              {formatCurrency(scenario.metrics.totalEquity)}
                            </td>
                          ) : null;
                        })}
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 font-medium">Avg Cash-on-Cash</td>
                        {comparisonScenarios.map(id => {
                          const scenario = scenarios.find(s => s.id === id);
                          return scenario ? (
                            <td key={id} className="border border-gray-300 px-4 py-2 text-center">
                              {scenario.metrics.avgCashOnCash}%
                            </td>
                          ) : null;
                        })}
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-4 py-2 font-medium">Yield on Cost</td>
                        {comparisonScenarios.map(id => {
                          const scenario = scenarios.find(s => s.id === id);
                          return scenario ? (
                            <td key={id} className="border border-gray-300 px-4 py-2 text-center">
                              {scenario.metrics.yieldOnCost}%
                            </td>
                          ) : null;
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowScenarioComparison(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PDF Export Modal */}
        {showPDFExport && (
          <PDFExportSystem
            {...preparePDFData()}
            projectName={projectName}
            propertyType={propertyTypes[propertyType].name}
            onClose={() => setShowPDFExport(false)}
          />
        )}

        {/* Goal Seek Modal */}
        {showGoalSeek && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Target className="text-orange-500" />
                    Goal Seek Solver
                  </h2>
                  <button
                    onClick={() => setShowGoalSeek(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X size={20} />
                  </button>
                </div>
                <GoalSeekSolver
                  currentMetrics={{
                    irr: parseFloat(combinedReturns.irr) || 0,
                    npv: (() => {
                      // Calculate NPV using 10% discount rate
                      const discountRate = 0.10;
                      let npv = -calculateFinancing.equityRequired;
                      calculateCashFlows.cashFlows.forEach((cf, index) => {
                        if (index > 0) {
                          npv += cf.cashFlow / Math.pow(1 + discountRate, index);
                        }
                      });
                      return npv;
                    })(),
                    equityMultiple: parseFloat(combinedReturns.equityMultiple) || 0,
                    yieldOnCost: parseFloat(calculateAdditionalMetrics.yieldOnCost) || 0,
                    cashOnCash: parseFloat(combinedReturns.avgCashOnCash) || 0,
                  }}
                  currentInputs={{
                    rent: operatingAssumptions.rentPSF,
                    costs: hardCosts.coreShell + hardCosts.tenantImprovements,
                    leverage: permanentLoan.ltv,
                    capRate: operatingAssumptions.capRate,
                    exitCap: operatingAssumptions.capRate,
                  }}
                  onRecalculate={async (inputs) => {
                    // Convert async callback to sync
                    if (inputs.rent !== undefined) {
                      return handleGoalSeekRecalculate('rent', inputs.rent);
                    } else if (inputs.costs !== undefined) {
                      return handleGoalSeekRecalculate('costs', inputs.costs);
                    } else if (inputs.leverage !== undefined) {
                      return handleGoalSeekRecalculate('leverage', inputs.leverage);
                    } else if (inputs.capRate !== undefined) {
                      return handleGoalSeekRecalculate('capRate', inputs.capRate);
                    } else if (inputs.exitCap !== undefined) {
                      return handleGoalSeekRecalculate('exitCap', inputs.exitCap);
                    }
                    return {
                      irr: parseFloat(combinedReturns.irr) || 0,
                      npv: 0,
                      equityMultiple: parseFloat(combinedReturns.equityMultiple) || 0,
                      yieldOnCost: parseFloat(calculateAdditionalMetrics.yieldOnCost) || 0,
                      cashOnCash: parseFloat(combinedReturns.avgCashOnCash) || 0,
                    };
                  }}
                  onSolutionFound={(result, newInputs) => {
                    if (result.success) {
                      // Apply the successful solution
                      if (newInputs.rent !== undefined) {
                        handleGoalSeekSolutionFound('rent', newInputs.rent);
                      } else if (newInputs.costs !== undefined) {
                        handleGoalSeekSolutionFound('costs', newInputs.costs);
                      } else if (newInputs.leverage !== undefined) {
                        handleGoalSeekSolutionFound('leverage', newInputs.leverage);
                      } else if (newInputs.capRate !== undefined) {
                        handleGoalSeekSolutionFound('capRate', newInputs.capRate);
                      } else if (newInputs.exitCap !== undefined) {
                        handleGoalSeekSolutionFound('exitCap', newInputs.exitCap);
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Version Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          Real Estate Development Pro Forma v2.0.0 - Enhanced with Scenario Management
        </div>
      </div>

      {/* Metric Breakdown Modal */}
      {activeMetricBreakdown && (
        <MetricBreakdown
          metric={activeMetricBreakdown}
          value={
            activeMetricBreakdown === 'Project IRR' ? `${combinedReturns.irr}%` :
            activeMetricBreakdown === 'Equity Multiple' ? `${combinedReturns.equityMultiple}x` :
            activeMetricBreakdown === 'Total Development Cost' ? formatCurrency(calculateFinancing.totalProjectCost) :
            activeMetricBreakdown === 'Equity Required' ? formatCurrency(calculateFinancing.equityRequired) :
            activeMetricBreakdown === 'Avg Cash-on-Cash' ? `${combinedReturns.avgCashOnCash}%` :
            activeMetricBreakdown === 'Yield on Cost' ? `${calculateAdditionalMetrics.yieldOnCost}%` :
            '0'
          }
          data={getMetricBreakdownData(activeMetricBreakdown)}
          onClose={() => setActiveMetricBreakdown(null)}
        />
      )}
      
      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={showApiKeyModal}
        onClose={() => {
          setShowApiKeyModal(false);
          ApiKeyManager.setPrompted(true);
        }}
        onSubmit={(apiKey) => {
          setShowApiKeyModal(false);
          setAiEnabled(true);
          ApiKeyManager.setPrompted(true);
        }}
        onDecline={() => {
          setAiEnabled(false);
        }}
        showDeclineOption={true}
      />
      
      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <span>© 2024 Onyx Development</span>
              <span className="text-gray-600">|</span>
              <span>v2.0</span>
            </div>
            <OnyxLogo height={24} className="opacity-50 hover:opacity-75 transition-opacity" />
          </div>
        </div>
      </footer>
    </div>
  );
}
