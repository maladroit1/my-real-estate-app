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
import {
  ChevronDown,
  ChevronRight,
  Download,
  Save,
  FileText,
  DollarSign,
  Building,
  Home,
  ShoppingCart,
  Briefcase,
  AlertTriangle,
  Info,
  X,
  BarChart as BarChartIcon,
} from "lucide-react";
import { calculateIRR, formatIRR } from "./utils/irrCalculator";
import FormulaViewer from "./components/FormulaViewerSimple";

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
  sponsorFees?: number;
  dispositionFee?: number;
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
    office: { name: "Office", icon: Briefcase, color: "bg-blue-500" },
    retail: { name: "Retail", icon: ShoppingCart, color: "bg-green-500" },
    apartment: { name: "Apartment", icon: Building, color: "bg-purple-500" },
    forSale: { name: "For-Sale", icon: Home, color: "bg-orange-500" },
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
    siteWorkPerUnit: 40000, // New: per unit amount
    siteWorkInputMethod: 'total' as 'total' | 'perUnit', // New: toggle state
    parkingSurface: 5000,
    parkingStructured: 25000,
    landscaping: 10,
    contingency: 5,
  });

  const [softCosts, setSoftCosts] = useState({
    architectureEngineering: 6,
    permitsImpactFees: 15,
    legalAccounting: 0,
    propertyTaxConstruction: 1.2,
    insuranceConstruction: 0.5,
    marketingLeasing: 0,
    constructionMgmtFee: 3,
    developerFee: 4,
  });

  // Development Timeline
  const [timeline, setTimeline] = useState({
    preDevelopment: 6,
    construction: 24,
    leaseUp: 12,
  });

  // Financing
  const [constructionLoan, setConstructionLoan] = useState({
    ltc: 65,
    rate: 8.5,
    originationFee: 1,
    term: 24,
  });

  const [permanentLoan, setPermanentLoan] = useState({
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
  });

  // Waterfall Tiers
  const [waterfallTiers, setWaterfallTiers] = useState([
    { minIRR: 0, maxIRR: 8, lpShare: 90, gpShare: 10 },
    { minIRR: 8, maxIRR: 12, lpShare: 80, gpShare: 20 },
    { minIRR: 12, maxIRR: 15, lpShare: 70, gpShare: 30 },
    { minIRR: 15, maxIRR: 100, lpShare: 60, gpShare: 40 },
  ]);

  // Add compensation type toggle
  const [compensationType, setCompensationType] = useState<'promote' | 'sponsorFee'>('promote');

  // Add sponsor fees state
  const [sponsorFees, setSponsorFees] = useState({
    // One-time fees
    acquisitionFee: 1.5,              // % of total project cost
    developmentFee: 4,                // % of total project cost
    constructionManagementFee: 3,     // % of hard costs
    dispositionFee: 1.0,              // % of gross sale price
    
    // Ongoing fees
    assetManagementFee: 1.5,          // % of effective gross revenue annually
    propertyManagementFee: 0,         // % of EGR (optional, for apartments)
    
    // Performance-linked structure
    feeStructureType: 'standard' as 'standard' | 'performance',
    performanceHurdle: 8,             // % preferred return before full fees
    reducedFeePercent: 50,            // % of standard fees if below hurdle
  });

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

  const [salesPhasing, setSalesPhasing] = useState([
    { phase: 1, units: 40, startMonth: 0, deliveryMonth: 24 },
    { phase: 2, units: 30, startMonth: 6, deliveryMonth: 30 },
    { phase: 3, units: 30, startMonth: 12, deliveryMonth: 36 },
  ]);

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
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Use ref to avoid stale closures in interval
  const scenariosRef = useRef(scenarios);
  useEffect(() => {
    scenariosRef.current = scenarios;
  }, [scenarios]);
  
  // IRR Breakdown Modal
  const [showIRRBreakdown, setShowIRRBreakdown] = useState(false);
  
  // Fee Comparison Toggle
  const [showFeeComparison, setShowFeeComparison] = useState(false);
  const [feeComparisonData, setFeeComparisonData] = useState<{
    promote: any;
    sponsorFee: any;
  } | null>(null);
  
  // Tooltip States
  const [showSiteWorkTooltip, setShowSiteWorkTooltip] = useState(false);

  // Validation State
  const [validationWarnings, setValidationWarnings] = useState<any[]>([]);
  const [siteWorkValidation, setSiteWorkValidation] = useState<string | null>(null);

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
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Add drill-down state management
  const [drillDownState, setDrillDownState] = useState({
    totalDevelopmentCost: false,
    hardCosts: false,
    softCosts: false,
    landCosts: false,
    financingCosts: false,
    equityStructure: false,
    returnsBreakdown: false,
    sourcesUses: false,
    yearlyReturns: false
  });

  // Helper to toggle drill-down sections
  const toggleDrillDown = (section: keyof typeof drillDownState) => {
    setDrillDownState(prev => ({ ...prev, [section]: !prev[section] }));
  };

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
      let unitCount = 0;
      
      if (unitMix && unitMix.length > 0) {
        unitCount = unitMix.reduce((sum, unit) => sum + unit.units, 0);
      } else if (buildingGFA > 0) {
        const avgUnitSize = salesAssumptions?.avgUnitSize || 2000;
        unitCount = Math.round(buildingGFA / avgUnitSize);
      }
      
      // Ensure we always have at least 1 unit for calculations
      return Math.max(1, unitCount);
    } else if (propertyType === 'apartment') {
      return unitMix.reduce((sum, unit) => sum + unit.units, 0);
    }
    return 1; // For office/retail
  };

  // Smart detection for when to show per-unit option
  const shouldShowPerUnitOption = () => {
    // Show per-unit option for residential property types
    return ['forSale', 'apartment'].includes(propertyType);
    // Note: Add 'townhome', 'condo', 'mixedUse' to the list when those property types are added
  };

  // Debounced values for expensive calculations
  const debouncedLandCost = useDebounce(landCost, 300);
  const debouncedBuildingGFA = useDebounce(buildingGFA, 300);
  const debouncedHardCosts = useDebounce(hardCosts, 300);
  const debouncedSoftCosts = useDebounce(softCosts, 300);
  const debouncedOperatingAssumptions = useDebounce(operatingAssumptions, 300);

  // Calculate Total Development Cost
  const calculateTotalCost = useMemo(() => {
    try {
      const siteAreaSF = Math.max(0, siteAreaAcres * 43560);
      const parkingSpaces = includeParking
        ? Math.round((buildingGFA / 1000) * parkingRatio)
        : 0;

      // Calculate site work based on input method
      let siteWorkTotal = hardCosts.siteWork;
      if (shouldShowPerUnitOption() && hardCosts.siteWorkInputMethod === 'perUnit') {
        siteWorkTotal = hardCosts.siteWorkPerUnit * getTotalUnitCount();
      }

      let hardCostTotal;
      if (propertyType === "forSale") {
        const totalSF =
          salesAssumptions.totalUnits * salesAssumptions.avgUnitSize;
        hardCostTotal =
          (hardCosts.coreShell + hardCosts.tenantImprovements) * totalSF +
          siteWorkTotal + // Use calculated site work total
          parkingSpaces * hardCosts.parkingSurface +
          hardCosts.landscaping * siteAreaSF;
      } else {
        hardCostTotal =
          (hardCosts.coreShell + hardCosts.tenantImprovements) * buildingGFA +
          siteWorkTotal + // Use calculated site work total
          parkingSpaces * hardCosts.parkingSurface +
          hardCosts.landscaping * siteAreaSF;
      }

      const hardCostWithContingency =
        hardCostTotal * (1 + hardCosts.contingency / 100);

      const softCostTotal =
        (hardCostWithContingency * softCosts.architectureEngineering) / 100 +
        buildingGFA * softCosts.permitsImpactFees +
        softCosts.legalAccounting +
        (landCost * softCosts.propertyTaxConstruction) / 100 +
        (hardCostWithContingency * softCosts.insuranceConstruction) / 100 +
        softCosts.marketingLeasing +
        (hardCostWithContingency * softCosts.constructionMgmtFee) / 100;

      const totalBeforeDeveloperFee =
        landCost + hardCostWithContingency + softCostTotal;
      const developerFee =
        (totalBeforeDeveloperFee * softCosts.developerFee) / 100;

      return {
        hardCost: hardCostWithContingency,
        hardCostWithContingency: hardCostWithContingency,
        softCost: softCostTotal,
        softCostTotal: softCostTotal,
        developerFee: developerFee,
        total: totalBeforeDeveloperFee + developerFee,
        parkingSpaces: parkingSpaces,
        siteAreaSF: siteAreaSF,
        siteWorkTotal: siteWorkTotal // Add this for reference
      };
    } catch (e) {
      console.error("Error calculating total cost:", e);
      return {
        hardCost: 0,
        hardCostWithContingency: 0,
        softCost: 0,
        softCostTotal: 0,
        developerFee: 0,
        total: 0,
        parkingSpaces: 0,
        siteAreaSF: 0,
        siteWorkTotal: 0
      };
    }
  }, [
    debouncedLandCost,
    debouncedHardCosts,
    debouncedSoftCosts,
    debouncedBuildingGFA,
    parkingRatio,
    siteAreaAcres,
    includeParking,
    propertyType,
    salesAssumptions,
    unitMix
  ]);

  // Calculate Financing
  const calculateFinancing = useMemo(() => {
    try {
      const constructionLoanAmount =
        (calculateTotalCost.total * constructionLoan.ltc) / 100;
      const avgOutstandingBalance = constructionLoanAmount * 0.6;
      const constructionMonths = timeline.construction;
      const monthlyRate = constructionLoan.rate / 100 / 12;
      const constructionInterest =
        avgOutstandingBalance * monthlyRate * constructionMonths;
      const loanFees =
        (constructionLoanAmount * constructionLoan.originationFee) / 100;

      let totalProjectCost =
        calculateTotalCost.total + constructionInterest + loanFees;
      
      // Add sponsor fee calculations
      let totalSponsorFees = 0;
      let acquisitionFeeAmount = 0;
      let developmentFeeAmount = 0;
      let constructionMgmtFeeAmount = 0;
      
      if (compensationType === 'sponsorFee') {
        // Calculate one-time fees
        acquisitionFeeAmount = calculateTotalCost.total * sponsorFees.acquisitionFee / 100;
        developmentFeeAmount = calculateTotalCost.total * sponsorFees.developmentFee / 100;
        constructionMgmtFeeAmount = calculateTotalCost.hardCost * sponsorFees.constructionManagementFee / 100;
        
        totalSponsorFees = acquisitionFeeAmount + developmentFeeAmount + constructionMgmtFeeAmount;
        
        // Adjust total project cost to include fees
        totalProjectCost = totalProjectCost + totalSponsorFees;
        const equityRequiredWithFees = totalProjectCost - constructionLoanAmount;
        
        return {
          constructionLoanAmount,
          constructionInterest,
          loanFees,
          totalProjectCost,
          equityRequired: equityRequiredWithFees,
          lpEquity: equityRequiredWithFees, // 100% LP when using sponsor fees
          gpEquity: 0, // GP compensated through fees, not equity
          gpCoinvest: 0,
          totalGPCommitment: 0,
          avgOutstandingBalance,
          constructionMonths,
          totalSponsorFees,
          acquisitionFeeAmount,
          developmentFeeAmount,
          constructionMgmtFeeAmount,
        };
      }
      
      // Existing promote calculations
      const equityRequired = totalProjectCost - constructionLoanAmount;

      const gpCoinvestAmount =
        (equityRequired * equityStructure.gpCoinvest) / 100;
      const lpEquityAmount =
        equityRequired * (equityStructure.lpEquity / 100) - gpCoinvestAmount;
      const gpPromoteEquity = equityRequired * (equityStructure.gpEquity / 100);

      return {
        constructionLoanAmount,
        constructionInterest,
        loanFees,
        totalProjectCost,
        equityRequired,
        lpEquity: Math.max(0, lpEquityAmount),
        gpEquity: Math.max(0, gpPromoteEquity),
        gpCoinvest: Math.max(0, gpCoinvestAmount),
        totalGPCommitment: gpPromoteEquity + gpCoinvestAmount,
        avgOutstandingBalance,
        constructionMonths,
        totalSponsorFees: 0,
        acquisitionFeeAmount: 0,
        developmentFeeAmount: 0,
        constructionMgmtFeeAmount: 0,
        mezzanineLoanAmount: 0,
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
        totalSponsorFees: 0,
        acquisitionFeeAmount: 0,
        developmentFeeAmount: 0,
        constructionMgmtFeeAmount: 0,
        mezzanineLoanAmount: 0,
      };
    }
  }, [calculateTotalCost, constructionLoan, equityStructure, timeline, compensationType, sponsorFees]);

  // Calculate NOI and Cash Flows
  const calculateCashFlows = useMemo(() => {
    try {
      const cashFlows: CashFlowData[] = [];
      let currentRent = debouncedOperatingAssumptions.rentPSF;
      let currentExpenses = debouncedOperatingAssumptions.opex;

      const escalationKey = propertyType as keyof typeof rentEscalations;
      const escalation =
        rentEscalations[escalationKey] || rentEscalations.office;

      if (propertyType === "forSale") {
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
        debouncedOperatingAssumptions.capRate > 0
          ? year1NOI / (debouncedOperatingAssumptions.capRate / 100)
          : 0;
      const permanentLoanAmount = (stabilizedValue * permanentLoan.ltv) / 100;

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

        const rate = permanentLoan.rate / 100;
        let annualDebtService = 0;
        if (permanentLoanAmount > 0 && rate > 0) {
          annualDebtService =
            year <= permanentLoan.ioPeriod
              ? permanentLoanAmount * rate
              : permanentLoanAmount *
                (rate / (1 - Math.pow(1 + rate, -permanentLoan.amortization)));
        }

        // Calculate sponsor fees if applicable
        let annualSponsorFees = 0;
        if (compensationType === 'sponsorFee') {
          // Asset management fee
          const assetMgmtFee = totalRevenue * sponsorFees.assetManagementFee / 100;
          
          // Property management fee (for apartments)
          const propMgmtFee = propertyType === 'apartment' ? 
            totalRevenue * sponsorFees.propertyManagementFee / 100 : 0;
          
          // Apply performance adjustment if applicable
          if (sponsorFees.feeStructureType === 'performance') {
            const currentReturn = (noi - annualDebtService) / calculateFinancing.equityRequired * 100;
            if (currentReturn < sponsorFees.performanceHurdle) {
              annualSponsorFees = (assetMgmtFee + propMgmtFee) * sponsorFees.reducedFeePercent / 100;
            } else {
              annualSponsorFees = assetMgmtFee + propMgmtFee;
            }
          } else {
            annualSponsorFees = assetMgmtFee + propMgmtFee;
          }
        }

        let cashFlow = noi - annualDebtService - annualSponsorFees;
        
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
          sponsorFees: annualSponsorFees,
          cashFlow,
          cumulativeCashFlow:
            (cashFlows[year - 1]?.cumulativeCashFlow || 0) + cashFlow,
          refinanceProceeds: year === 1 ? refinanceProceeds : undefined,
        });

        currentExpenses *= 1 + operatingAssumptions.expenseGrowth / 100;
      }

      const exitNOI = cashFlows[operatingAssumptions.holdPeriod]?.noi || 0;
      const salePrice =
        operatingAssumptions.capRate > 0
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

      // Calculate disposition fee if applicable
      let dispositionFeeAmount = 0;
      if (compensationType === 'sponsorFee') {
        dispositionFeeAmount = salePrice * sponsorFees.dispositionFee / 100;
      }
      
      const exitProceeds = salePrice - exitCosts - remainingBalance - dispositionFeeAmount;

      if (cashFlows[operatingAssumptions.holdPeriod]) {
        cashFlows[operatingAssumptions.holdPeriod].cashFlow += exitProceeds;
        cashFlows[operatingAssumptions.holdPeriod].salePrice = salePrice;
        cashFlows[operatingAssumptions.holdPeriod].exitProceeds = exitProceeds;
        cashFlows[operatingAssumptions.holdPeriod].dispositionFee = dispositionFeeAmount;
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
    compensationType,
    sponsorFees,
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

  // Set defaults for residential projects
  useEffect(() => {
    if (shouldShowPerUnitOption() && hardCosts.siteWorkPerUnit === 40000) {
      // When switching to residential property types, default to per-unit input method
      setHardCosts(prev => ({
        ...prev,
        siteWorkInputMethod: 'perUnit' // Default to per-unit for residential
      }));
    }
  }, [propertyType, hardCosts.siteWorkPerUnit]);

  // Sync construction loan term with timeline
  useEffect(() => {
    setConstructionLoan((prev) => ({ ...prev, term: timeline.construction }));
  }, [timeline.construction]);

  // Sync site work values when switching input methods or unit count changes
  useEffect(() => {
    if (shouldShowPerUnitOption()) {
      if (hardCosts.siteWorkInputMethod === 'perUnit') {
        // When in per unit mode, update the total for display purposes
        const newTotal = hardCosts.siteWorkPerUnit * getTotalUnitCount();
        if (Math.abs(newTotal - hardCosts.siteWork) > 1) { // Avoid infinite loops
          setHardCosts(prev => ({ ...prev, siteWork: newTotal }));
        }
      } else {
        // When switching to total mode, calculate per unit for reference
        const unitCount = getTotalUnitCount();
        if (unitCount > 0) {
          const perUnit = Math.round(hardCosts.siteWork / unitCount);
          if (Math.abs(perUnit - hardCosts.siteWorkPerUnit) > 1) {
            setHardCosts(prev => ({ ...prev, siteWorkPerUnit: perUnit }));
          }
        }
      }
    }
  }, [hardCosts.siteWorkInputMethod, hardCosts.siteWorkPerUnit, hardCosts.siteWork, propertyType, unitMix, buildingGFA, salesAssumptions.avgUnitSize]);

  // Add validation check for site work
  useEffect(() => {
    if (shouldShowPerUnitOption() && hardCosts.siteWorkInputMethod === 'perUnit') {
      const unitCount = getTotalUnitCount();
      if (unitCount === 0) {
        setSiteWorkValidation('Please define units before using per-unit pricing');
      } else if (unitCount === 1 && buildingGFA > 3000) {
        setSiteWorkValidation('Warning: Only 1 unit calculated. Check unit mix configuration.');
      } else {
        setSiteWorkValidation(null);
      }
    } else {
      setSiteWorkValidation(null);
    }
  }, [propertyType, hardCosts.siteWorkInputMethod, unitMix, buildingGFA, salesAssumptions.avgUnitSize]);

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

  // Validation
  useEffect(() => {
    const warnings: any[] = [];

    // Financing validations
    if (constructionLoan.ltc > 75) {
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

    // Cost validations
    const costPerSF =
      propertyType === "forSale"
        ? calculateTotalCost.total /
          (salesAssumptions.totalUnits * salesAssumptions.avgUnitSize)
        : calculateTotalCost.total / buildingGFA;

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
          compensationType: compensationType,
          totalSponsorCompensation: 0,
          feeAsPercentOfEquity: "0.00",
          feeDragOnReturns: "0.00",
        };
      }

      const { cashFlows } = calculateCashFlows;
      
      // Handle sponsor fee compensation model
      if (compensationType === 'sponsorFee') {
        // Calculate LP returns (all cash flows minus fees)
        const lpCashFlows = cashFlows.map(cf => cf.cashFlow);
        const lpIRRResult = calculateIRR(lpCashFlows);
        const lpIRR = lpIRRResult.isValid ? lpIRRResult.irr * 100 : 0;
        
        // Calculate total LP distributions (exclude initial investment)
        const totalLPDistributions = lpCashFlows
          .slice(1)
          .reduce((sum, cf) => sum + Math.max(0, cf), 0);
        const initialEquity = Math.abs(lpCashFlows[0] || 0);
        const lpEquityMultiple = initialEquity > 0 ? totalLPDistributions / initialEquity : 0;
        
        // Calculate GP fee income
        const gpFeeCashFlows = [
          0, // No equity investment from GP
          ...cashFlows.slice(1).map(cf => cf.sponsorFees || 0)
        ];
        
        // Add disposition fee to final year
        if (cashFlows.length > 0) {
          const lastIndex = cashFlows.length - 1;
          if (cashFlows[lastIndex].dispositionFee) {
            gpFeeCashFlows[lastIndex] += cashFlows[lastIndex].dispositionFee || 0;
          }
        }
        
        // Calculate total sponsor compensation
        const totalFeeIncome = calculateFinancing.totalSponsorFees + 
          gpFeeCashFlows.slice(1).reduce((sum, fee) => sum + fee, 0);
        
        // Calculate IRR without fees for comparison
        const cashFlowsWithoutFees = cashFlows.map((cf, index) => {
          if (index === 0) return cf.cashFlow;
          return cf.cashFlow + (cf.sponsorFees || 0) + (cf.dispositionFee || 0);
        });
        const irrWithoutFeesResult = calculateIRR(cashFlowsWithoutFees);
        const irrWithoutFees = irrWithoutFeesResult.isValid ? irrWithoutFeesResult.irr * 100 : 0;
        
        // Calculate payback period
        let paybackPeriod = 0;
        let cumulativeReturn = 0;
        for (let i = 1; i < cashFlows.length; i++) {
          cumulativeReturn += cashFlows[i].cashFlow - (cashFlows[i].exitProceeds || 0);
          if (cumulativeReturn >= initialEquity) {
            paybackPeriod = i;
            break;
          }
        }
        
        return {
          irr: formatIRR(lpIRRResult),
          equityMultiple: isFinite(lpEquityMultiple) ? lpEquityMultiple.toFixed(2) : "0.00",
          totalReturn: totalLPDistributions,
          lpReturn: totalLPDistributions,
          gpReturn: totalFeeIncome,
          lpIRR: formatIRR(lpIRRResult),
          gpIRR: 'N/A', // GP has no equity investment
          paybackPeriod: paybackPeriod,
          compensationType: 'sponsorFee',
          totalSponsorCompensation: totalFeeIncome,
          feeAsPercentOfEquity: initialEquity > 0 ? (totalFeeIncome / initialEquity * 100).toFixed(2) : "0.00",
          feeDragOnReturns: (irrWithoutFees - lpIRR).toFixed(2),
          irrMessage: lpIRRResult.message,
        };
      }
      
      // Existing promote calculations
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
      const lpCapital = initialEquity * (equityStructure.lpEquity / 100);
      const gpCapital = initialEquity * (equityStructure.gpEquity / 100);
      const gpCoinvestment = gpCapital * (equityStructure.gpCoinvest / 100);

      // Step 1: Preferred Return (using compound interest)
      const preferredRate = equityStructure.preferredReturn / 100;
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
      if (equityStructure.catchUp && remainingCashFlow > 0) {
        // GP catches up to 20% of total distributions (typical promote)
        const targetGPShare = 0.20;
        const totalDistributedSoFar = distributions.lp + distributions.gp;
        const targetGPAmount = (totalDistributedSoFar + remainingCashFlow) * targetGPShare;
        const gpCatchUpNeeded = Math.max(0, targetGPAmount - distributions.gp);
        
        const catchUpAmount = Math.min(
          remainingCashFlow,
          gpCatchUpNeeded,
          remainingCashFlow * (equityStructure.catchUpPercentage / 100)
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

      const lpShare = equityStructure.lpEquity / 100;
      const gpShare = equityStructure.gpEquity / 100;
      const lpIRR =
        totalDistributions > 0 && lpShare > 0
          ? (irr * (distributions.lp / totalDistributions)) / lpShare
          : 0;
      const gpIRR =
        totalDistributions > 0 && gpShare > 0
          ? (irr * (distributions.gp / totalDistributions)) / gpShare
          : 0;

      return {
        irr: formatIRR(irrResult),
        equityMultiple: isFinite(equityMultiple)
          ? equityMultiple.toFixed(2)
          : "0.00",
        totalReturn: totalDistributions,
        lpReturn: distributions.lp,
        gpReturn: distributions.gp,
        lpIRR: isFinite(lpIRR) ? lpIRR.toFixed(2) : "0.00",
        gpIRR: isFinite(gpIRR) ? gpIRR.toFixed(2) : "0.00",
        paybackPeriod: paybackPeriod,
        irrMessage: irrResult.message,
        compensationType: 'promote',
        totalSponsorCompensation: distributions.gp,
        feeAsPercentOfEquity: "0.00", // Not applicable for promote
        feeDragOnReturns: "0.00", // Not applicable for promote
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
        compensationType: compensationType,
        totalSponsorCompensation: 0,
        feeAsPercentOfEquity: "0.00",
        feeDragOnReturns: "0.00",
      };
    }
  }, [
    calculateCashFlows,
    waterfallTiers,
    equityStructure,
    operatingAssumptions.holdPeriod,
    compensationType,
    calculateFinancing,
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
      compensationType: calculateReturns?.compensationType || 'promote',
      totalSponsorCompensation: calculateReturns?.totalSponsorCompensation || 0,
      feeAsPercentOfEquity: calculateReturns?.feeAsPercentOfEquity || "0.00",
      feeDragOnReturns: calculateReturns?.feeDragOnReturns || "0.00",
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

  // Calculate Fee Comparison Scenarios
  const calculateComparisonScenarios = useCallback(() => {
    // Save current compensation type
    const currentType = compensationType;
    
    // Calculate promote scenario
    const promoteScenario = {
      irr: calculateReturns?.compensationType === 'promote' ? 
        calculateReturns.irr : 
        (parseFloat(calculateReturns?.lpIRR || "0") + parseFloat(calculateReturns?.feeDragOnReturns || "0")).toFixed(2),
      lpIRR: calculateReturns?.compensationType === 'promote' ? 
        calculateReturns.lpIRR : 
        (parseFloat(calculateReturns?.lpIRR || "0") + parseFloat(calculateReturns?.feeDragOnReturns || "0")).toFixed(2),
      gpReturn: calculateReturns?.compensationType === 'promote' ? 
        calculateReturns.gpReturn : 
        calculateFinancing.equityRequired * (equityStructure.gpEquity / 100) * 0.2, // Estimate 20% promote
      lpReturn: calculateReturns?.compensationType === 'promote' ? 
        calculateReturns.lpReturn : 
        calculateReturns?.totalReturn || 0,
      totalCompensation: calculateReturns?.compensationType === 'promote' ? 
        calculateReturns.gpReturn : 
        calculateFinancing.equityRequired * (equityStructure.gpEquity / 100) * 0.2,
      equityMultiple: calculateReturns?.compensationType === 'promote' ? 
        calculateReturns.equityMultiple : 
        ((calculateReturns?.totalReturn || 0) / calculateFinancing.equityRequired).toFixed(2),
    };
    
    // Calculate sponsor fee scenario
    const sponsorFeeScenario = {
      irr: calculateReturns?.compensationType === 'sponsorFee' ? 
        calculateReturns.irr : 
        (parseFloat(calculateReturns?.irr || "0") - 2.0).toFixed(2), // Estimate 2% fee drag
      lpIRR: calculateReturns?.compensationType === 'sponsorFee' ? 
        calculateReturns.lpIRR : 
        (parseFloat(calculateReturns?.lpIRR || "0") - 2.0).toFixed(2),
      gpReturn: calculateReturns?.compensationType === 'sponsorFee' ? 
        calculateReturns.totalSponsorCompensation : 
        calculateFinancing.totalSponsorFees + 
          (calculateCashFlows?.year1NOI || 0) * sponsorFees.assetManagementFee / 100 * operatingAssumptions.holdPeriod,
      lpReturn: calculateReturns?.compensationType === 'sponsorFee' ? 
        calculateReturns.lpReturn : 
        calculateReturns?.totalReturn || 0,
      totalCompensation: calculateReturns?.compensationType === 'sponsorFee' ? 
        calculateReturns.totalSponsorCompensation : 
        calculateFinancing.totalSponsorFees + 
          (calculateCashFlows?.year1NOI || 0) * sponsorFees.assetManagementFee / 100 * operatingAssumptions.holdPeriod,
      equityMultiple: calculateReturns?.compensationType === 'sponsorFee' ? 
        calculateReturns.equityMultiple : 
        ((calculateReturns?.totalReturn || 0) / (calculateFinancing.equityRequired + calculateFinancing.totalSponsorFees)).toFixed(2),
      feeDrag: calculateReturns?.feeDragOnReturns || "2.00",
    };
    
    setFeeComparisonData({
      promote: promoteScenario,
      sponsorFee: sponsorFeeScenario
    });
  }, [compensationType, calculateReturns, calculateFinancing, equityStructure, sponsorFees, operatingAssumptions.holdPeriod, calculateCashFlows]);

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

      for (let i = 0; i < monteCarloParams.iterations; i++) {
        const rentVariation =
          ((Math.random() - 0.5) * 2 * monteCarloParams.rentVolatility) / 100;
        const costVariation =
          ((Math.random() - 0.5) * 2 * monteCarloParams.costVolatility) / 100;
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
        ["Site Work", calculateTotalCost.siteWorkTotal],
        shouldShowPerUnitOption() && hardCosts.siteWorkInputMethod === 'perUnit' 
          ? ["Site Work Detail", `${formatCurrency(hardCosts.siteWorkPerUnit)}/unit × ${getTotalUnitCount()} units`]
          : ["", ""],
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
  const exportToPDF = () => {
    try {
      const yearOneDSCR =
        calculateCashFlows?.year1NOI &&
        calculateCashFlows?.permanentLoanAmount &&
        permanentLoan.rate > 0
          ? (
              calculateCashFlows.year1NOI /
              ((calculateCashFlows.permanentLoanAmount * permanentLoan.rate) /
                100)
            ).toFixed(2)
          : "N/A";

      const debtYieldValue =
        calculateCashFlows?.year1NOI &&
        calculateCashFlows?.permanentLoanAmount &&
        calculateCashFlows.permanentLoanAmount > 0
          ? (
              (calculateCashFlows.year1NOI /
                calculateCashFlows.permanentLoanAmount) *
              100
            ).toFixed(1)
          : "N/A";

      const content = `
REAL ESTATE DEVELOPMENT PRO FORMA
=================================
Project: ${projectName}
Property Type: ${propertyTypes[propertyType].name}
Date: ${new Date().toLocaleDateString()}

EXECUTIVE SUMMARY
=================
Total Development Cost: ${formatCurrency(calculateTotalCost.total)}
Total Equity Required: ${formatCurrency(calculateFinancing.equityRequired)}
Project IRR: ${combinedReturns.irr}%
Equity Multiple: ${combinedReturns.equityMultiple}x
Average Cash-on-Cash: ${combinedReturns.avgCashOnCash}%
Development Spread: ${calculateAdditionalMetrics.developmentSpread} bps
Payback Period: ${combinedReturns.paybackPeriod} years

DEVELOPMENT SUMMARY
===================
Total Development Cost: ${formatCurrency(calculateTotalCost.total)}
- Land Cost: ${formatCurrency(landCost)}
- Hard Costs: ${formatCurrency(calculateTotalCost.hardCost)}
  ${shouldShowPerUnitOption() && hardCosts.siteWorkInputMethod === 'perUnit' 
    ? `• Site Work: ${formatCurrency(hardCosts.siteWorkPerUnit)}/unit × ${getTotalUnitCount()} units = ${formatCurrency(calculateTotalCost.siteWorkTotal)}`
    : `• Site Work: ${formatCurrency(calculateTotalCost.siteWorkTotal)}`
  }
- Soft Costs: ${formatCurrency(calculateTotalCost.softCost)}
- Developer Fee: ${formatCurrency(calculateTotalCost.developerFee)}

Cost Per SF: ${formatCurrency(calculateTotalCost.total / buildingGFA)}
FAR: ${(buildingGFA / (siteAreaAcres * 43560)).toFixed(2)}
Parking Spaces: ${calculateTotalCost.parkingSpaces}

FINANCING STRUCTURE
==================
Construction Loan: ${formatCurrency(
        calculateFinancing.constructionLoanAmount
      )} (${constructionLoan.ltc}% LTC)
- Rate: ${constructionLoan.rate}%
- Term: ${constructionLoan.term} months
- Origination Fee: ${constructionLoan.originationFee}%
Construction Interest: ${formatCurrency(
        calculateFinancing.constructionInterest
      )}

Permanent Loan: ${formatCurrency(
        calculateCashFlows?.permanentLoanAmount || 0
      )} (${permanentLoan.ltv}% LTV)
- Rate: ${permanentLoan.rate}%
- Amortization: ${permanentLoan.amortization} years
- I/O Period: ${permanentLoan.ioPeriod} years

Total Equity Required: ${formatCurrency(calculateFinancing.equityRequired)}
- LP Equity (${equityStructure.lpEquity}%): ${formatCurrency(
        calculateFinancing.lpEquity
      )}
- GP Equity (${equityStructure.gpEquity}%): ${formatCurrency(
        calculateFinancing.gpEquity
      )}
- GP Co-investment: ${formatCurrency(calculateFinancing.gpCoinvest)}

RETURNS SUMMARY
===============
Project IRR: ${combinedReturns.irr}%
Equity Multiple: ${combinedReturns.equityMultiple}x
Average Cash-on-Cash: ${combinedReturns.avgCashOnCash}%
LP IRR: ${combinedReturns.lpIRR}%
GP IRR: ${combinedReturns.gpIRR}%

Yield on Cost: ${calculateAdditionalMetrics.yieldOnCost}%
Development Spread: ${calculateAdditionalMetrics.developmentSpread} bps
Profit Margin: ${calculateAdditionalMetrics.profitMargin}%
Payback Period: ${combinedReturns.paybackPeriod} years

OPERATING ASSUMPTIONS
====================
${propertyType === "apartment" ? "Monthly" : "Annual"} Rent/SF: ${
        operatingAssumptions.rentPSF
      }
Vacancy: ${operatingAssumptions.vacancy}%
Operating Expenses: ${operatingAssumptions.opex} per ${
        propertyType === "apartment" ? "unit" : "SF"
      }
Exit Cap Rate: ${operatingAssumptions.capRate}%
Hold Period: ${operatingAssumptions.holdPeriod} years
Rent Growth: ${operatingAssumptions.rentGrowth}%
Expense Growth: ${operatingAssumptions.expenseGrowth}%

RISK ANALYSIS
=============
Probability-Weighted IRR: ${probabilityWeightedIRR}%

Scenario Analysis:
${calculateScenarioAnalysis
  .map((s) => `- ${s.scenario}: ${s.irr}% IRR (${s.probability}% probability)`)
  .join("\n")}

Monte Carlo Results (${monteCarloParams.iterations} iterations):
- Mean IRR: ${runMonteCarloSimulation.mean}%
- 10th Percentile: ${runMonteCarloSimulation.p10}%
- 50th Percentile: ${runMonteCarloSimulation.p50}%
- 90th Percentile: ${runMonteCarloSimulation.p90}%

KEY METRICS
===========
DSCR (Year 1): ${yearOneDSCR}
Debt Yield: ${debtYieldValue}%
Break-even Occupancy: ${calculateAdditionalMetrics.breakEvenOccupancy}%

${
  validationWarnings.length > 0
    ? `
WARNINGS
========
${validationWarnings.map((w) => `- ${w.field}: ${w.message}`).join("\n")}
`
    : ""
}

CASH FLOW SUMMARY
=================
${
  calculateCashFlows?.cashFlows
    ?.map(
      (cf) =>
        `Year ${cf.year}: NOI: ${formatCurrency(
          cf.noi
        )}, Cash Flow: ${formatCurrency(cf.cashFlow)}`
    )
    .join("\n") || "No cash flows calculated"
}
    `;

      const blob = new Blob([content], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${projectName.replace(/\s+/g, "_")}_ProForma_${
        new Date().toISOString().split("T")[0]
      }.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Error exporting PDF:", e);
      alert("Error generating export. Please try again.");
    }
  };

  // Add tenant function
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

    setActiveScenarioId(scenarioId);
    
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

  // Load active scenario after component mounts
  useEffect(() => {
    // Skip loading if we're in the middle of saving
    if (isSaving) return;
    
    if (activeScenarioId && scenarios.length > 0) {
      const activeScenario = scenarios.find(s => s.id === activeScenarioId);
      if (activeScenario) {
        loadScenario(activeScenarioId);
      }
    }
  }, [activeScenarioId, isSaving]); // Only reload when active scenario changes, not when scenarios array updates

  // Auto-save functionality
  useEffect(() => {
    if (!autoSaveEnabled || !activeScenarioId) return;

    const interval = setInterval(() => {
      // Skip if already saving
      if (isSaving) return;
      
      // Get the current scenario data using ref to avoid stale closure
      const currentScenario = scenariosRef.current.find(s => s.id === activeScenarioId);
      if (currentScenario) {
        saveCurrentScenario(currentScenario.name, currentScenario.description);
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(interval);
  }, [autoSaveEnabled, activeScenarioId]); // Remove scenarios from dependencies to prevent re-renders

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="text-3xl font-bold text-gray-900 bg-transparent border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none transition-colors"
                />
                {/* v2 Scenario Selector */}
                {scenarios.length > 0 && (
                  <select
                    value={activeScenarioId || ''}
                    onChange={(e) => e.target.value && loadScenario(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Scenario</option>
                    {scenarios.map(scenario => (
                      <option key={scenario.id} value={scenario.id}>
                        {scenario.name} {scenario.id === activeScenarioId && '(Active)'}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <p className="text-gray-600">
                Advanced Real Estate Development Pro Forma
                {activeScenarioId && (
                  <span className="text-sm text-gray-500 ml-4">
                    {isSaving ? (
                      <span className="flex items-center gap-1">
                        <span className="animate-pulse">Saving...</span>
                      </span>
                    ) : lastSaved ? (
                      `Auto-saved ${lastSaved.toLocaleTimeString()}`
                    ) : null}
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              {/* v2 Scenario Management Buttons */}
              <button
                onClick={() => setShowScenarioManager(true)}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center gap-2"
              >
                <Briefcase size={20} />
                Scenarios
              </button>
              <button
                onClick={() => setShowScenarioComparison(true)}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 flex items-center gap-2"
                disabled={scenarios.length < 2}
              >
                <BarChartIcon size={20} />
                Compare
              </button>
              {/* v1 Save Button (kept for compatibility) */}
              <button
                onClick={() => setShowSaveDialog(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                <Save size={20} />
                Save
              </button>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
              >
                <Download size={20} />
                Export CSV
              </button>
              <button
                onClick={exportToPDF}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center gap-2"
              >
                <FileText size={20} />
                Export PDF
              </button>
            </div>
          </div>

          {/* Property Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Property Type
            </label>
            <div className="grid grid-cols-4 gap-4">
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
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <Icon
                      className={`w-8 h-8 mx-auto mb-2 ${
                        propertyType === key ? "text-blue-500" : "text-gray-500"
                      }`}
                    />
                    <p
                      className={`font-medium ${
                        propertyType === key ? "text-blue-900" : "text-gray-700"
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
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Simple
              </button>
              <button
                onClick={() => setMode("detailed")}
                className={`px-4 py-2 rounded-lg ${
                  mode === "detailed"
                    ? "bg-blue-500 text-white"
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
                  <div className="grid grid-cols-2 gap-4">
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Site Area (Acres)
                      </label>
                      <input
                        type="number"
                        value={siteAreaAcres}
                        onChange={(e) =>
                          setSiteAreaAcres(Number(e.target.value))
                        }
                        step="0.1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        <input
                          type="text"
                          value={formatNumber(buildingGFA)}
                          onChange={(e) =>
                            handleFormattedInput(e.target.value, setBuildingGFA)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
                      <div className="grid grid-cols-3 gap-3">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4 pt-2">
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
                      <div className="grid grid-cols-3 gap-4 mb-6">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Total SF
                          </label>
                          <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg">
                            {formatNumber(salesAssumptions.totalUnits * salesAssumptions.avgUnitSize)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="border rounded-lg">
                    <div 
                      className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleDrillDown('hardCosts')}
                    >
                      <div className="flex items-center gap-2">
                        {drillDownState.hardCosts ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <h3 className="font-medium text-gray-900">Hard Costs</h3>
                      </div>
                      <span className="text-sm font-medium text-gray-600">
                        {formatCurrency(calculateTotalCost.hardCostWithContingency)}
                      </span>
                    </div>
                    {drillDownState.hardCosts && (
                    <div className="p-3 border-t">
                    <div className="grid grid-cols-2 gap-4">
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                    ? 'bg-blue-500 text-white'
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
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                }`}
                              >
                                Per Unit
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {hardCosts.siteWorkInputMethod === 'total' || !shouldShowPerUnitOption() ? (
                          <input
                            type="text"
                            value={formatNumber(hardCosts.siteWork)}
                            onChange={(e) => {
                              const parsed = parseFormattedNumber(e.target.value);
                              if (!isNaN(parsed)) {
                                setHardCosts({...hardCosts, siteWork: parsed});
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Total amount"
                          />
                        ) : (
                          <div className="relative">
                            <input
                              type="text"
                              value={formatNumber(hardCosts.siteWorkPerUnit)}
                              onChange={(e) => {
                                const parsed = parseFormattedNumber(e.target.value);
                                if (!isNaN(parsed)) {
                                  setHardCosts({...hardCosts, siteWorkPerUnit: parsed});
                                }
                              }}
                              className="w-full px-3 py-2 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Per unit"
                            />
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                              /unit
                            </span>
                          </div>
                        )}
                        
                        {/* Show calculated total when using per unit */}
                        {shouldShowPerUnitOption() && hardCosts.siteWorkInputMethod === 'perUnit' && (
                          <div className="mt-1 text-xs text-gray-600">
                            Total: {formatCurrency(hardCosts.siteWorkPerUnit * getTotalUnitCount())} 
                            ({formatNumber(getTotalUnitCount())} units × {formatCurrency(hardCosts.siteWorkPerUnit)}/unit)
                          </div>
                        )}
                        
                        {/* Add quick set buttons when in per-unit mode */}
                        {shouldShowPerUnitOption() && hardCosts.siteWorkInputMethod === 'perUnit' && (
                          <div className="mt-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-600">Quick set:</span>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => setHardCosts({...hardCosts, siteWorkPerUnit: 15000})}
                                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                                    hardCosts.siteWorkPerUnit === 15000
                                      ? 'bg-blue-500 text-white border-blue-500'
                                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                                  }`}
                                  title="Typical for attached townhomes"
                                >
                                  $15k
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setHardCosts({...hardCosts, siteWorkPerUnit: 25000})}
                                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                                    hardCosts.siteWorkPerUnit === 25000
                                      ? 'bg-blue-500 text-white border-blue-500'
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
                                      ? 'bg-blue-500 text-white border-blue-500'
                                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                                  }`}
                                  title="Typical for quality single-family"
                                >
                                  $40k
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setHardCosts({...hardCosts, siteWorkPerUnit: 60000})}
                                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                                    hardCosts.siteWorkPerUnit === 60000
                                      ? 'bg-blue-500 text-white border-blue-500'
                                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                                  }`}
                                  title="Typical for custom homes"
                                >
                                  $60k
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    </div>
                    )}
                  </div>

                  {mode === "detailed" && (
                    <div className="border rounded-lg">
                      <div 
                        className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleDrillDown('softCosts')}
                      >
                        <div className="flex items-center gap-2">
                          {drillDownState.softCosts ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <h3 className="font-medium text-gray-900">Soft Costs</h3>
                        </div>
                        <span className="text-sm font-medium text-gray-600">
                          {formatCurrency(calculateTotalCost.softCostTotal)}
                        </span>
                      </div>
                      {drillDownState.softCosts && (
                      <div className="p-3 border-t">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            A&E (% of Hard)
                          </label>
                          <input
                            type="number"
                            value={softCosts.architectureEngineering}
                            onChange={(e) =>
                              setSoftCosts({
                                ...softCosts,
                                architectureEngineering: Number(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Developer Fee (%)
                          </label>
                          <input
                            type="number"
                            value={softCosts.developerFee}
                            onChange={(e) =>
                              setSoftCosts({
                                ...softCosts,
                                developerFee: Number(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Financing Section */}
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
                  <div className="border rounded-lg">
                    <div 
                      className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleDrillDown('financingCosts')}
                    >
                      <div className="flex items-center gap-2">
                        {drillDownState.financingCosts ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <h3 className="font-medium text-gray-900">Construction Loan</h3>
                      </div>
                      <span className="text-sm font-medium text-gray-600">
                        {formatCurrency(calculateFinancing.constructionLoanAmount)}
                      </span>
                    </div>
                    {drillDownState.financingCosts && (
                    <div className="p-3 border-t">
                    <div className="grid grid-cols-2 gap-4">
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    </div>
                    )}
                  </div>

                  {propertyType !== "forSale" && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">
                        Permanent Financing
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4 pt-2">
                    {propertyType === "forSale" ? (
                      <>
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-gray-600">
                            Total Sales Revenue
                          </p>
                          <p className="text-lg font-semibold text-blue-600">
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
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm text-gray-600 flex items-center justify-center">
                            Year 1 DSCR
                            <InfoTooltip content="Debt Service Coverage Ratio: NOI divided by annual debt service. Lenders typically require 1.20x minimum." />
                            <FormulaViewer 
                              formulaKey="dscr" 
                              values={{
                                noi: calculateCashFlows?.year1NOI || 0,
                                loanAmount: calculateCashFlows?.permanentLoanAmount || 0,
                                interestRate: permanentLoan.rate,
                                dscr: calculateCashFlows?.year1NOI && calculateCashFlows?.permanentLoanAmount && permanentLoan.rate > 0
                                  ? calculateCashFlows.year1NOI / ((calculateCashFlows.permanentLoanAmount * permanentLoan.rate) / 100)
                                  : 0
                              }}
                              className="ml-1"
                            />
                          </p>
                          <p className="text-lg font-semibold text-blue-600">
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
                          <p className="text-sm text-gray-600 flex items-center justify-center">
                            Debt Yield
                            <InfoTooltip content="Year 1 NOI divided by loan amount. Lenders typically require 8-10% minimum." />
                          </p>
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

            {/* Equity Structure & Compensation */}
            <div className="bg-white rounded-lg shadow-sm">
              <button
                onClick={() => toggleSection("equity")}
                className="w-full p-4 flex justify-between items-center hover:bg-gray-50"
              >
                <h2 className="text-xl font-semibold">Equity Structure & Compensation</h2>
                {expandedSections.equity ? (
                  <ChevronDown />
                ) : (
                  <ChevronRight />
                )}
              </button>
              {expandedSections.equity && (
                <div className="p-4 border-t space-y-4">
                  {/* Compensation Structure Toggle */}
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GP Compensation Structure
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCompensationType('promote')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                          compensationType === 'promote'
                            ? 'bg-blue-500 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="text-sm">Promote/Waterfall</div>
                        <div className="text-xs opacity-80 mt-1">Performance-based carry</div>
                      </button>
                      <button
                        onClick={() => setCompensationType('sponsorFee')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                          compensationType === 'sponsorFee'
                            ? 'bg-blue-500 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="text-sm">Sponsor Fees</div>
                        <div className="text-xs opacity-80 mt-1">Asset-based fees</div>
                      </button>
                    </div>
                  </div>

                  {/* Show appropriate inputs based on selection */}
                  {compensationType === 'promote' ? (
                    <div className="space-y-4">
                      <h3 className="font-medium text-gray-900">Equity Split & Waterfall</h3>
                      
                      {/* Equity Split */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            LP Equity (%)
                          </label>
                          <input
                            type="number"
                            value={equityStructure.lpEquity}
                            onChange={(e) =>
                              setEquityStructure({
                                ...equityStructure,
                                lpEquity: Number(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            GP Equity (%)
                          </label>
                          <input
                            type="number"
                            value={equityStructure.gpEquity}
                            onChange={(e) =>
                              setEquityStructure({
                                ...equityStructure,
                                gpEquity: Number(e.target.value),
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Preferred Return */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Preferred Return (%)
                        </label>
                        <input
                          type="number"
                          value={equityStructure.preferredReturn}
                          onChange={(e) =>
                            setEquityStructure({
                              ...equityStructure,
                              preferredReturn: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* GP Co-invest */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          GP Co-invest (% of GP share)
                        </label>
                        <input
                          type="number"
                          value={equityStructure.gpCoinvest}
                          onChange={(e) =>
                            setEquityStructure({
                              ...equityStructure,
                              gpCoinvest: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Catch-up */}
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="catchUp"
                          checked={equityStructure.catchUp}
                          onChange={(e) =>
                            setEquityStructure({
                              ...equityStructure,
                              catchUp: e.target.checked,
                            })
                          }
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="catchUp" className="text-sm font-medium text-gray-700">
                          Include GP Catch-up
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h3 className="font-medium text-gray-900">Sponsor Fee Structure</h3>
                      
                      {/* Fee Type Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fee Structure Type</label>
                        <select
                          value={sponsorFees.feeStructureType}
                          onChange={(e) => setSponsorFees({...sponsorFees, feeStructureType: e.target.value as 'standard' | 'performance'})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="standard">Standard Fees</option>
                          <option value="performance">Performance-Linked Fees</option>
                        </select>
                      </div>
                      
                      {/* One-Time Fees */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">One-Time Fees</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Acquisition Fee (% of Total Cost)
                            </label>
                            <input
                              type="number"
                              value={sponsorFees.acquisitionFee}
                              onChange={(e) => setSponsorFees({...sponsorFees, acquisitionFee: Number(e.target.value)})}
                              step="0.25"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Development Fee (% of Total Cost)
                            </label>
                            <input
                              type="number"
                              value={sponsorFees.developmentFee}
                              onChange={(e) => setSponsorFees({...sponsorFees, developmentFee: Number(e.target.value)})}
                              step="0.25"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Construction Mgmt (% of Hard Costs)
                            </label>
                            <input
                              type="number"
                              value={sponsorFees.constructionManagementFee}
                              onChange={(e) => setSponsorFees({...sponsorFees, constructionManagementFee: Number(e.target.value)})}
                              step="0.25"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Disposition Fee (% of Sale Price)
                            </label>
                            <input
                              type="number"
                              value={sponsorFees.dispositionFee}
                              onChange={(e) => setSponsorFees({...sponsorFees, dispositionFee: Number(e.target.value)})}
                              step="0.25"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Ongoing Fees */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Annual Fees</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Asset Management (% of Revenue)
                            </label>
                            <input
                              type="number"
                              value={sponsorFees.assetManagementFee}
                              onChange={(e) => setSponsorFees({...sponsorFees, assetManagementFee: Number(e.target.value)})}
                              step="0.25"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          {propertyType === 'apartment' && (
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Property Management (% of Revenue)
                              </label>
                              <input
                                type="number"
                                value={sponsorFees.propertyManagementFee}
                                onChange={(e) => setSponsorFees({...sponsorFees, propertyManagementFee: Number(e.target.value)})}
                                step="0.25"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Performance Hurdles */}
                      {sponsorFees.feeStructureType === 'performance' && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Performance Parameters</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Hurdle Rate (%)
                              </label>
                              <input
                                type="number"
                                value={sponsorFees.performanceHurdle}
                                onChange={(e) => setSponsorFees({...sponsorFees, performanceHurdle: Number(e.target.value)})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Reduced Fee % (Below Hurdle)
                              </label>
                              <input
                                type="number"
                                value={sponsorFees.reducedFeePercent}
                                onChange={(e) => setSponsorFees({...sponsorFees, reducedFeePercent: Number(e.target.value)})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Fee Summary */}
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Estimated Fee Summary</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Upfront Fees:</span>
                            <span className="font-medium">
                              {formatCurrency(
                                (calculateTotalCost.total * (sponsorFees.acquisitionFee + sponsorFees.developmentFee) / 100) +
                                (calculateTotalCost.hardCost * sponsorFees.constructionManagementFee / 100)
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Annual Asset Mgmt:</span>
                            <span className="font-medium">
                              ~{formatCurrency(
                                calculateCashFlows?.year1NOI ? 
                                calculateCashFlows.year1NOI * (100 / (100 - operatingAssumptions.vacancy)) * sponsorFees.assetManagementFee / 100 
                                : 0
                              )}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total Est. Fees:</span>
                            <span className="font-medium text-blue-600">
                              {calculateReturns?.totalSponsorCompensation ? 
                                formatCurrency(calculateReturns.totalSponsorCompensation) : 
                                'Calculating...'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

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
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
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
                          <div className="grid grid-cols-3 gap-3 text-sm">
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
                  {propertyType !== "forSale" && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">
                        Operating Parameters
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* For-Sale Specific */}
                  {propertyType === "forSale" && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
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
                              <div className="grid grid-cols-3 gap-2">
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
                  className="flex justify-between items-center p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => setShowIRRBreakdown(true)}
                >
                  <span className="text-gray-700 flex items-center">
                    Project IRR
                    <InfoTooltip content="Click to see detailed IRR breakdown by year" />
                    <FormulaViewer 
                      formulaKey="irr" 
                      values={{
                        initialEquity: calculateFinancing.equityRequired,
                        totalDistributions: calculateReturns.totalReturn,
                        irr: parseFloat(combinedReturns.irr)
                      }}
                      className="ml-2"
                    />
                  </span>
                  <span className="text-xl font-bold text-blue-600">
                    {combinedReturns.irr}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-gray-700 flex items-center">
                    Equity Multiple
                    <FormulaViewer 
                      formulaKey="equityMultiple" 
                      values={{
                        totalDistributions: calculateReturns.totalReturn,
                        initialEquity: calculateFinancing.equityRequired,
                        equityMultiple: parseFloat(combinedReturns.equityMultiple)
                      }}
                      className="ml-2"
                    />
                  </span>
                  <span className="text-xl font-bold text-green-600">
                    {combinedReturns.equityMultiple}x
                  </span>
                </div>
                <div className="bg-purple-50 rounded-lg">
                  <div 
                    className="flex justify-between items-center p-3 cursor-pointer hover:bg-purple-100 transition-colors"
                    onClick={() => toggleDrillDown('totalDevelopmentCost')}
                  >
                    <div className="flex items-center gap-2">
                      {drillDownState.totalDevelopmentCost ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <span className="text-gray-700">Total Development Cost</span>
                    </div>
                    <span className="text-lg font-bold text-purple-600">
                      {formatCurrency(calculateTotalCost.total)}
                    </span>
                  </div>
                  {drillDownState.totalDevelopmentCost && (
                    <div className="px-6 pb-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Land Cost</span>
                        <span className="font-medium">{formatCurrency(landCost)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Hard Costs</span>
                        <span className="font-medium">{formatCurrency(calculateTotalCost.hardCostWithContingency)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Soft Costs</span>
                        <span className="font-medium">{formatCurrency(calculateTotalCost.softCostTotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Developer Fee</span>
                        <span className="font-medium">{formatCurrency(calculateTotalCost.developerFee)}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t pt-2">
                        <span className="text-gray-600">Cost per SF</span>
                        <span className="font-medium">{formatCurrency(calculateTotalCost.total / buildingGFA)}/SF</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-orange-50 rounded-lg">
                  <div 
                    className="flex justify-between items-center p-3 cursor-pointer hover:bg-orange-100 transition-colors"
                    onClick={() => toggleDrillDown('equityStructure')}
                  >
                    <div className="flex items-center gap-2">
                      {drillDownState.equityStructure ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <span className="text-gray-700">Equity Required</span>
                    </div>
                    <span className="text-lg font-bold text-orange-600">
                      {formatCurrency(calculateFinancing.equityRequired)}
                    </span>
                  </div>
                  {drillDownState.equityStructure && (
                    <div className="px-6 pb-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Development Cost</span>
                        <span className="font-medium">{formatCurrency(calculateTotalCost.total)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Construction Loan</span>
                        <span className="font-medium">({formatCurrency(calculateFinancing.constructionLoanAmount)})</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Mezzanine Loan</span>
                        <span className="font-medium">({formatCurrency(calculateFinancing.mezzanineLoanAmount)})</span>
                      </div>
                      <div className="flex justify-between text-sm border-t pt-2">
                        <span className="text-gray-600">Total Equity Needed</span>
                        <span className="font-medium">{formatCurrency(calculateFinancing.equityRequired)}</span>
                      </div>
                      <div className="mt-2 pt-2 border-t">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">LP Equity ({equityStructure.lpEquity}%)</span>
                          <span className="font-medium">{formatCurrency(calculateFinancing.lpEquity)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">GP Equity ({equityStructure.gpEquity}%)</span>
                          <span className="font-medium">{formatCurrency(calculateFinancing.gpEquity)}</span>
                        </div>
                      </div>
                    </div>
                  )}
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
                    <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                      <span className="text-gray-700">Avg Cash-on-Cash</span>
                      <span className="text-xl font-bold text-yellow-600">
                        {combinedReturns.avgCashOnCash}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
                      <span className="text-gray-700 flex items-center">
                        Yield on Cost
                        <FormulaViewer 
                          formulaKey="yieldOnCost" 
                          values={{
                            noi: calculateCashFlows?.year1NOI || 0,
                            landCost: landCost,
                            constructionCost: calculateTotalCost.hardCost,
                            softCosts: calculateTotalCost.softCost,
                            constructionInterest: calculateFinancing.constructionInterest,
                            totalCost: calculateTotalCost.total,
                            yieldOnCost: parseFloat(calculateAdditionalMetrics.yieldOnCost)
                          }}
                          className="ml-2"
                        />
                      </span>
                      <span className="text-xl font-bold text-indigo-600">
                        {calculateAdditionalMetrics.yieldOnCost}%
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Sources & Uses */}
            <div className="bg-white rounded-lg shadow-sm">
              <div 
                className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleDrillDown('sourcesUses')}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {drillDownState.sourcesUses ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <h2 className="text-xl font-semibold">Sources & Uses</h2>
                  </div>
                  <span className="text-sm text-gray-600">
                    Total: {formatCurrency(calculateTotalCost.total)}
                  </span>
                </div>
              </div>
              {drillDownState.sourcesUses && (
              <div className="px-6 pb-6">
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
              </div>
              )}
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

            {/* Partnership Returns */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">
                {compensationType === 'promote' ? 'Partnership Returns' : 'Sponsor Fee Analysis'}
              </h2>
              
              {compensationType === 'promote' ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-gray-700">LP Return</span>
                    <div className="text-right">
                      <span className="text-xl font-bold text-blue-600">
                        {combinedReturns.lpIRR}%
                      </span>
                      <div className="text-sm text-gray-600">
                        {formatCurrency(combinedReturns.lpReturn)}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-gray-700">GP Return</span>
                    <div className="text-right">
                      <span className="text-xl font-bold text-green-600">
                        {combinedReturns.gpIRR}%
                      </span>
                      <div className="text-sm text-gray-600">
                        {formatCurrency(combinedReturns.gpReturn)}
                      </div>
                    </div>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Preferred Return</span>
                      <span>{equityStructure.preferredReturn}%</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-gray-600">GP Promote</span>
                      <span>
                        {((combinedReturns.gpReturn / combinedReturns.totalReturn) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Fee Impact Analysis */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3">Fee Impact on Returns</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">LP IRR (after fees)</span>
                        <span className="font-semibold">{combinedReturns.lpIRR}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">IRR without fees</span>
                        <span className="font-semibold">
                          {(parseFloat(combinedReturns.lpIRR) + parseFloat(combinedReturns.feeDragOnReturns || '0')).toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span className="text-sm">Fee Drag</span>
                        <span className="font-semibold">-{combinedReturns.feeDragOnReturns}%</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Sponsor Compensation */}
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-3">Total Sponsor Compensation</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Fees</span>
                        <span className="font-semibold text-blue-600">
                          {formatCurrency(combinedReturns.totalSponsorCompensation || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">As % of Equity</span>
                        <span className="font-semibold">{combinedReturns.feeAsPercentOfEquity}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Annual Equivalent</span>
                        <span className="font-semibold">
                          {formatCurrency(
                            (combinedReturns.totalSponsorCompensation || 0) / operatingAssumptions.holdPeriod
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Comparison Toggle */}
                  <button
                    onClick={() => {
                      calculateComparisonScenarios();
                      setShowFeeComparison(!showFeeComparison);
                    }}
                    className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700"
                  >
                    {showFeeComparison ? 'Hide Comparison' : 'Compare to Promote Structure'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fee Comparison Chart */}
        {showFeeComparison && feeComparisonData && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Compensation Structure Comparison</h2>
            
            {/* Comparison Chart */}
            <div className="mb-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        metric: 'LP IRR',
                        promote: parseFloat(feeComparisonData.promote.lpIRR),
                        sponsorFee: parseFloat(feeComparisonData.sponsorFee.lpIRR),
                      },
                      {
                        metric: 'Equity Multiple',
                        promote: parseFloat(feeComparisonData.promote.equityMultiple),
                        sponsorFee: parseFloat(feeComparisonData.sponsorFee.equityMultiple),
                      },
                    ]}
                    layout="horizontal"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="metric" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => `${value.toFixed(2)}${value < 10 ? 'x' : '%'}`} />
                    <Legend />
                    <Bar dataKey="promote" fill="#3B82F6" name="Promote Structure" />
                    <Bar dataKey="sponsorFee" fill="#10B981" name="Sponsor Fee Structure" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Metric</th>
                    <th className="text-center py-2">Promote Structure</th>
                    <th className="text-center py-2">Sponsor Fee Structure</th>
                    <th className="text-center py-2">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 font-medium">LP IRR</td>
                    <td className="text-center py-2">{feeComparisonData.promote.lpIRR}%</td>
                    <td className="text-center py-2">{feeComparisonData.sponsorFee.lpIRR}%</td>
                    <td className="text-center py-2 font-semibold">
                      <span className={parseFloat(feeComparisonData.promote.lpIRR) > parseFloat(feeComparisonData.sponsorFee.lpIRR) ? 'text-green-600' : 'text-red-600'}>
                        {(parseFloat(feeComparisonData.promote.lpIRR) - parseFloat(feeComparisonData.sponsorFee.lpIRR)).toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 font-medium">LP Equity Multiple</td>
                    <td className="text-center py-2">{feeComparisonData.promote.equityMultiple}x</td>
                    <td className="text-center py-2">{feeComparisonData.sponsorFee.equityMultiple}x</td>
                    <td className="text-center py-2 font-semibold">
                      <span className={parseFloat(feeComparisonData.promote.equityMultiple) > parseFloat(feeComparisonData.sponsorFee.equityMultiple) ? 'text-green-600' : 'text-red-600'}>
                        {(parseFloat(feeComparisonData.promote.equityMultiple) - parseFloat(feeComparisonData.sponsorFee.equityMultiple)).toFixed(2)}x
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 font-medium">Total LP Distributions</td>
                    <td className="text-center py-2">{formatCurrency(feeComparisonData.promote.lpReturn)}</td>
                    <td className="text-center py-2">{formatCurrency(feeComparisonData.sponsorFee.lpReturn)}</td>
                    <td className="text-center py-2 font-semibold">
                      <span className={feeComparisonData.promote.lpReturn > feeComparisonData.sponsorFee.lpReturn ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(feeComparisonData.promote.lpReturn - feeComparisonData.sponsorFee.lpReturn)}
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b bg-gray-50">
                    <td className="py-2 font-medium">GP/Sponsor Compensation</td>
                    <td className="text-center py-2">{formatCurrency(feeComparisonData.promote.totalCompensation)}</td>
                    <td className="text-center py-2">{formatCurrency(feeComparisonData.sponsorFee.totalCompensation)}</td>
                    <td className="text-center py-2 font-semibold">
                      <span className={feeComparisonData.promote.totalCompensation < feeComparisonData.sponsorFee.totalCompensation ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(feeComparisonData.sponsorFee.totalCompensation - feeComparisonData.promote.totalCompensation)}
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 font-medium">GP Compensation as % of Equity</td>
                    <td className="text-center py-2">
                      {((feeComparisonData.promote.totalCompensation / calculateFinancing.equityRequired) * 100).toFixed(1)}%
                    </td>
                    <td className="text-center py-2">
                      {((feeComparisonData.sponsorFee.totalCompensation / calculateFinancing.equityRequired) * 100).toFixed(1)}%
                    </td>
                    <td className="text-center py-2 font-semibold">
                      {(((feeComparisonData.sponsorFee.totalCompensation / calculateFinancing.equityRequired) - 
                        (feeComparisonData.promote.totalCompensation / calculateFinancing.equityRequired)) * 100).toFixed(1)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Key Insights */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Key Insights</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  {parseFloat(feeComparisonData.promote.lpIRR) > parseFloat(feeComparisonData.sponsorFee.lpIRR) ? (
                    <span>The promote structure provides <strong>{(parseFloat(feeComparisonData.promote.lpIRR) - parseFloat(feeComparisonData.sponsorFee.lpIRR)).toFixed(2)}%</strong> higher LP IRR due to performance alignment.</span>
                  ) : (
                    <span>The sponsor fee structure results in <strong>{(parseFloat(feeComparisonData.sponsorFee.lpIRR) - parseFloat(feeComparisonData.promote.lpIRR)).toFixed(2)}%</strong> lower LP IRR due to fee drag.</span>
                  )}
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>
                    Sponsor fees total <strong>{formatCurrency(feeComparisonData.sponsorFee.totalCompensation)}</strong> ({((feeComparisonData.sponsorFee.totalCompensation / calculateFinancing.equityRequired) * 100).toFixed(1)}% of equity), 
                    while promote compensation is estimated at <strong>{formatCurrency(feeComparisonData.promote.totalCompensation)}</strong> ({((feeComparisonData.promote.totalCompensation / calculateFinancing.equityRequired) * 100).toFixed(1)}% of equity).
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>
                    The sponsor fee structure provides <strong>guaranteed compensation</strong> regardless of performance, 
                    while the promote structure aligns GP compensation with LP returns.
                  </span>
                </li>
                {feeComparisonData.sponsorFee.feeDrag && (
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span>
                      Fee drag under the sponsor fee structure is approximately <strong>{feeComparisonData.sponsorFee.feeDrag}%</strong> on returns.
                    </span>
                  </li>
                )}
              </ul>
            </div>

            {/* Visual Compensation Breakdown */}
            <div className="mt-6">
              <h3 className="font-medium text-gray-900 mb-3">Compensation Timing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Promote Structure</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">At Closing:</span>
                      <span>$0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">During Hold:</span>
                      <span>$0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">At Exit:</span>
                      <span className="font-semibold">{formatCurrency(feeComparisonData.promote.totalCompensation)}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Sponsor Fee Structure</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">At Closing:</span>
                      <span>{formatCurrency(calculateFinancing.totalSponsorFees || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">During Hold:</span>
                      <span>{formatCurrency((feeComparisonData.sponsorFee.totalCompensation - (calculateFinancing.totalSponsorFees || 0)) * 0.9)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">At Exit:</span>
                      <span>{formatCurrency((feeComparisonData.sponsorFee.totalCompensation - (calculateFinancing.totalSponsorFees || 0)) * 0.1)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cash Flow Analysis */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Cash Flow Projection</h2>
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

        {/* Sensitivity Analysis */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Sensitivity Analysis</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setSensitivityVariable("rent")}
                className={`px-3 py-1 rounded-lg text-sm ${
                  sensitivityVariable === "rent"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Rent
              </button>
              <button
                onClick={() => setSensitivityVariable("construction")}
                className={`px-3 py-1 rounded-lg text-sm ${
                  sensitivityVariable === "construction"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Construction
              </button>
              <button
                onClick={() => setSensitivityVariable("capRate")}
                className={`px-3 py-1 rounded-lg text-sm ${
                  sensitivityVariable === "capRate"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Cap Rate
              </button>
              <button
                onClick={() => setSensitivityVariable("interestRate")}
                className={`px-3 py-1 rounded-lg text-sm ${
                  sensitivityVariable === "interestRate"
                    ? "bg-blue-500 text-white"
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
                          ? "bg-gray-100 ring-2 ring-blue-500"
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

        {/* Sponsor Fee Schedule */}
        {compensationType === 'sponsorFee' && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Sponsor Fee Schedule</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Year</th>
                    <th className="text-right py-2">Asset Mgmt Fee</th>
                    {propertyType === 'apartment' && <th className="text-right py-2">Property Mgmt</th>}
                    <th className="text-right py-2">Other Fees</th>
                    <th className="text-right py-2">Total Fees</th>
                    <th className="text-right py-2">Cumulative</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let cumulativeFees = 0;
                    const feeSchedule = [];
                    
                    // Year 0 - Upfront fees
                    const upfrontFees = calculateFinancing.totalSponsorFees || 0;
                    cumulativeFees += upfrontFees;
                    feeSchedule.push({
                      year: 0,
                      assetMgmt: 0,
                      propertyMgmt: 0,
                      other: upfrontFees,
                      total: upfrontFees,
                      cumulative: cumulativeFees
                    });
                    
                    // Years 1 through holding period
                    for (let year = 1; year <= operatingAssumptions.holdPeriod; year++) {
                      const cashFlow = calculateCashFlows?.cashFlows?.[year];
                      const assetMgmtFee = cashFlow?.sponsorFees || 0;
                      const isLastYear = year === operatingAssumptions.holdPeriod;
                      const dispositionFee = isLastYear ? (cashFlow?.dispositionFee || 0) : 0;
                      
                      // For simplicity, we'll estimate property management fee separately if needed
                      const totalRevenue = cashFlow?.grossRevenue || 0;
                      const propertyMgmtFee = propertyType === 'apartment' && totalRevenue > 0 ? 
                        totalRevenue * sponsorFees.propertyManagementFee / 100 : 0;
                      
                      // Asset mgmt fee already includes property mgmt in the calculation
                      const netAssetMgmtFee = assetMgmtFee - propertyMgmtFee;
                      
                      const totalYearFees = assetMgmtFee + dispositionFee;
                      cumulativeFees += totalYearFees;
                      
                      feeSchedule.push({
                        year,
                        assetMgmt: netAssetMgmtFee,
                        propertyMgmt: propertyMgmtFee,
                        other: dispositionFee,
                        total: totalYearFees,
                        cumulative: cumulativeFees
                      });
                    }
                    
                    return feeSchedule.map((row, index) => (
                      <tr key={index} className={`border-b ${row.year === 0 ? 'bg-gray-50' : ''}`}>
                        <td className="py-2 font-medium">
                          {row.year === 0 ? 'Closing' : `Year ${row.year}`}
                        </td>
                        <td className="text-right py-2">
                          {row.assetMgmt > 0 ? formatCurrency(row.assetMgmt) : '-'}
                        </td>
                        {propertyType === 'apartment' && (
                          <td className="text-right py-2">
                            {row.propertyMgmt > 0 ? formatCurrency(row.propertyMgmt) : '-'}
                          </td>
                        )}
                        <td className="text-right py-2">
                          {row.other > 0 ? formatCurrency(row.other) : '-'}
                        </td>
                        <td className="text-right py-2 font-semibold">
                          {formatCurrency(row.total)}
                        </td>
                        <td className="text-right py-2 font-semibold text-blue-600">
                          {formatCurrency(row.cumulative)}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
                <tfoot className="border-t-2">
                  <tr>
                    <td colSpan={propertyType === 'apartment' ? 4 : 3} className="py-2 font-semibold">
                      Total Sponsor Compensation
                    </td>
                    <td colSpan={2} className="text-right py-2 font-bold text-blue-600">
                      {formatCurrency(calculateReturns?.totalSponsorCompensation || 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-600">Upfront Fees</p>
                <p className="font-semibold">{formatCurrency(calculateFinancing.totalSponsorFees || 0)}</p>
                <p className="text-xs text-gray-500 mt-1">At closing</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-600">Annual Fees (Avg)</p>
                <p className="font-semibold">
                  {formatCurrency(
                    ((calculateReturns?.totalSponsorCompensation || 0) - (calculateFinancing.totalSponsorFees || 0)) / 
                    operatingAssumptions.holdPeriod
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-1">Per year</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-600">Total as % of NOI</p>
                <p className="font-semibold">
                  {calculateCashFlows?.year1NOI && calculateCashFlows.year1NOI > 0 ? 
                    ((calculateReturns?.totalSponsorCompensation || 0) / 
                    (calculateCashFlows.year1NOI * operatingAssumptions.holdPeriod) * 100).toFixed(1) : '0.0'}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Over hold period</p>
              </div>
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
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      Probability-Weighted IRR:{" "}
                      <span className="font-bold text-blue-600">
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
                  <div className="grid grid-cols-4 gap-4 mb-4">
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

        {/* Saved Scenarios */}
        {savedScenarios.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Saved Scenarios</h2>
            <div className="space-y-3">
              {savedScenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className="flex justify-between items-center p-3 border border-gray-200 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{scenario.name}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(scenario.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => loadScenarioV1(scenario)}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deleteScenarioV1(scenario.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                placeholder="Description (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500"
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
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
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
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <div className="text-lg font-semibold text-blue-900">Project IRR: {combinedReturns.irr}%</div>
                  <div className="text-sm text-blue-700">Equity Multiple: {combinedReturns.equityMultiple}x</div>
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
                          {scenario.name}
                          {scenario.id === activeScenarioId && (
                            <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">Active</span>
                          )}
                        </h4>
                        {scenario.description && (
                          <p className="text-gray-600 mt-1">{scenario.description}</p>
                        )}
                        <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
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
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
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
              
              <div className="mt-6 flex justify-between items-center">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoSaveEnabled}
                    onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Auto-save every 30 seconds</span>
                </label>
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

        {/* Version Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          Real Estate Development Pro Forma v2.0.0 - Enhanced with Scenario Management
        </div>
      </div>
    </div>
  );
}
