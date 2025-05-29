import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Briefcase,
  AlertTriangle,
  Info,
  X,
  BarChart as BarChartIcon,
  Target,
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
    office: { name: "Office", icon: Briefcase, color: "bg-blue-500" },
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
  });

  // Waterfall Tiers
  const [waterfallTiers, setWaterfallTiers] = useState([
    { minIRR: 0, maxIRR: 8, lpShare: 90, gpShare: 10 },
    { minIRR: 8, maxIRR: 12, lpShare: 80, gpShare: 20 },
    { minIRR: 12, maxIRR: 15, lpShare: 70, gpShare: 30 },
    { minIRR: 15, maxIRR: 100, lpShare: 60, gpShare: 40 },
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
    { id: 1, name: "Parcel 1", acres: 10, pricePerAcre: 500000, isDonated: false },
    { id: 2, name: "Parcel 2", acres: 5, pricePerAcre: 0, isDonated: true },
    { id: 3, name: "Parcel 3", acres: 5, pricePerAcre: 0, isDonated: true },
  ]);

  // Cottonwood Heights Mixed-Use Specific
  const [cottonwoodHeights, setCottonwoodHeights] = useState({
    // Commercial Components
    office: {
      enabled: true,
      sf: 50000,
      rentPSF: 35,
      vacancy: 10,
      opex: 8,
      tiPSF: 50,
    },
    retail: {
      enabled: true,
      sf: 30000,
      rentPSF: 30,
      vacancy: 5,
      opex: 7,
      tiPSF: 40,
    },
    grocery: {
      enabled: true,
      sf: 45000,
      rentPSF: 20,
      vacancy: 0,
      opex: 5,
      tiPSF: 100,
    },
    // Residential Components
    townhomes: {
      enabled: true,
      units: 100,
      avgSize: 2000,
      avgPrice: 550000,
      salesPace: 3,
    },
    affordable: {
      enabled: true,
      units: 20,
      avgSize: 900,
      rentPerUnit: 1200,
      vacancy: 5,
      opex: 5000,
    },
    // TIF & Public Financing
    tif: {
      enabled: true,
      captureRate: 75, // % of incremental taxes captured
      term: 20, // years
      baseAssessedValue: 10000000,
      taxRate: 1.2, // %
    },
    publicFinancing: {
      taxExemptBonds: 0,
      taxableBonds: 0,
      grants: 0,
      landContribution: 0,
      infrastructureContribution: 0,
    },
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
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
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

  // Debounced values for expensive calculations
  const debouncedLandCost = useDebounce(landCost, 300);
  const debouncedBuildingGFA = useDebounce(buildingGFA, 300);
  const debouncedHardCosts = useDebounce(hardCosts, 300);
  const debouncedSoftCosts = useDebounce(softCosts, 300);
  const debouncedOperatingAssumptions = useDebounce(operatingAssumptions, 300);

  // Calculate total land cost including parcels
  const calculateLandCost = useMemo(() => {
    if (propertyType === "cottonwoodHeights") {
      return landParcels.reduce((total, parcel) => {
        return total + (parcel.isDonated ? 0 : parcel.acres * parcel.pricePerAcre);
      }, 0);
    }
    return landCost;
  }, [propertyType, landParcels, landCost]);

  // Calculate Total Development Cost
  const calculateTotalCost = useMemo(() => {
    try {
      const siteAreaSF = Math.max(0, siteAreaAcres * 43560);
      const parkingSpaces = includeParking
        ? Math.round((buildingGFA / 1000) * parkingRatio)
        : 0;

      let hardCostTotal;
      if (propertyType === "cottonwoodHeights") {
        // Calculate total SF for all Cottonwood Heights components
        let totalCommercialSF = 0;
        if (cottonwoodHeights.office.enabled) totalCommercialSF += cottonwoodHeights.office.sf;
        if (cottonwoodHeights.retail.enabled) totalCommercialSF += cottonwoodHeights.retail.sf;
        if (cottonwoodHeights.grocery.enabled) totalCommercialSF += cottonwoodHeights.grocery.sf;
        
        let totalResidentialSF = 0;
        if (cottonwoodHeights.townhomes.enabled) {
          totalResidentialSF += cottonwoodHeights.townhomes.units * cottonwoodHeights.townhomes.avgSize;
        }
        if (cottonwoodHeights.affordable.enabled) {
          totalResidentialSF += cottonwoodHeights.affordable.units * cottonwoodHeights.affordable.avgSize;
        }
        
        const totalSF = totalCommercialSF + totalResidentialSF;
        const parkingSpacesNeeded = Math.round((totalSF / 1000) * parkingRatio);
        
        hardCostTotal =
          (hardCosts.coreShell + hardCosts.tenantImprovements) * totalSF +
          hardCosts.siteWork +
          parkingSpacesNeeded * hardCosts.parkingStructured + // Structured parking for mixed-use
          hardCosts.landscaping * siteAreaSF;
          
        // Subtract public financing contributions
        hardCostTotal -= cottonwoodHeights.publicFinancing.landContribution;
        hardCostTotal -= cottonwoodHeights.publicFinancing.infrastructureContribution;
      } else if (propertyType === "forSale") {
        const totalSF =
          salesAssumptions.totalUnits * salesAssumptions.avgUnitSize;
        hardCostTotal =
          (hardCosts.coreShell + hardCosts.tenantImprovements) * totalSF +
          hardCosts.siteWork +
          parkingSpaces * hardCosts.parkingSurface +
          hardCosts.landscaping * siteAreaSF;
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
          ? (landCost * softCosts.propertyTaxConstruction) / 100 
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
  }, [calculateTotalCost, constructionLoan, equityStructure, timeline]);

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

        // Calculate combined commercial NOI
        let commercialNOI = 0;
        if (cottonwoodHeights.office.enabled) {
          const officeRevenue = cottonwoodHeights.office.sf * cottonwoodHeights.office.rentPSF * (1 - cottonwoodHeights.office.vacancy / 100);
          const officeExpenses = cottonwoodHeights.office.sf * cottonwoodHeights.office.opex;
          commercialNOI += officeRevenue - officeExpenses;
        }
        if (cottonwoodHeights.retail.enabled) {
          const retailRevenue = cottonwoodHeights.retail.sf * cottonwoodHeights.retail.rentPSF * (1 - cottonwoodHeights.retail.vacancy / 100);
          const retailExpenses = cottonwoodHeights.retail.sf * cottonwoodHeights.retail.opex;
          commercialNOI += retailRevenue - retailExpenses;
        }
        if (cottonwoodHeights.grocery.enabled) {
          const groceryRevenue = cottonwoodHeights.grocery.sf * cottonwoodHeights.grocery.rentPSF * (1 - cottonwoodHeights.grocery.vacancy / 100);
          const groceryExpenses = cottonwoodHeights.grocery.sf * cottonwoodHeights.grocery.opex;
          commercialNOI += groceryRevenue - groceryExpenses;
        }

        // Calculate affordable housing NOI
        let affordableNOI = 0;
        if (cottonwoodHeights.affordable.enabled) {
          const affordableRevenue = cottonwoodHeights.affordable.units * cottonwoodHeights.affordable.rentPerUnit * 12 * (1 - cottonwoodHeights.affordable.vacancy / 100);
          const affordableExpenses = cottonwoodHeights.affordable.units * cottonwoodHeights.affordable.opex;
          affordableNOI = affordableRevenue - affordableExpenses;
        }

        // Calculate townhome sales revenue over time
        const townhomeRevenue = cottonwoodHeights.townhomes.enabled ? 
          cottonwoodHeights.townhomes.units * cottonwoodHeights.townhomes.avgPrice : 0;

        // Calculate TIF revenue
        const estimatedValue = commercialNOI > 0 ? commercialNOI / (operatingAssumptions.capRate / 100) : 0;
        const incrementalValue = Math.max(0, estimatedValue - cottonwoodHeights.tif.baseAssessedValue);
        const annualTIF = cottonwoodHeights.tif.enabled ? 
          (incrementalValue * cottonwoodHeights.tif.taxRate / 100 * cottonwoodHeights.tif.captureRate / 100) : 0;

        // Calculate permanent loan amount based on stabilized NOI
        const stabilizedNOI = commercialNOI + affordableNOI;
        const permanentLoanAmount = permanentLoan.enabled && stabilizedNOI > 0 && operatingAssumptions.capRate > 0 ?
          (stabilizedNOI / (operatingAssumptions.capRate / 100)) * (permanentLoan.ltv / 100) : 0;

        // Generate cash flows for hold period
        for (let year = 1; year <= operatingAssumptions.holdPeriod; year++) {
          const yearNOI = commercialNOI + affordableNOI;
          const yearTIF = year <= cottonwoodHeights.tif.term ? annualTIF : 0;
          
          // Assume townhomes sell over first 3 years
          const townhomeSales = year <= 3 && cottonwoodHeights.townhomes.enabled ? 
            (townhomeRevenue / 3) : 0;

          const totalCashFlow = yearNOI + yearTIF + townhomeSales;
          
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
            grossRevenue: totalCashFlow,
            operatingExpenses: 0,
          });
        }

        // Calculate exit value for Cottonwood Heights
        const exitNOI = commercialNOI + affordableNOI;
        const salePrice = operatingAssumptions.capRate > 0 ? 
          exitNOI / (operatingAssumptions.capRate / 100) : 0;
        const exitCosts = salePrice * (operatingAssumptions.exitCosts / 100);
        const exitProceeds = salePrice - exitCosts - permanentLoanAmount;

        if (cashFlows[operatingAssumptions.holdPeriod]) {
          cashFlows[operatingAssumptions.holdPeriod].cashFlow += exitProceeds;
          cashFlows[operatingAssumptions.holdPeriod].salePrice = salePrice;
          cashFlows[operatingAssumptions.holdPeriod].exitProceeds = exitProceeds;
        }

        return { cashFlows, permanentLoanAmount, year1NOI: commercialNOI + affordableNOI };
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
        debouncedOperatingAssumptions.capRate > 0
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
      };
    }
  }, [
    calculateCashFlows,
    waterfallTiers,
    equityStructure,
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
        yearByYear: []
      };
    }

    const baseValue = cottonwoodHeights.tif.baseAssessedValue;
    const projectedValue = baseValue * 7.5; // Default to 7.5x for $75M from $10M base
    const incrementalValue = Math.max(0, projectedValue - baseValue);
    const taxRate = cottonwoodHeights.tif.taxRate / 100;
    const captureRate = cottonwoodHeights.tif.captureRate / 100;
    const annualTIF = incrementalValue * taxRate * captureRate;
    
    let totalRevenue = 0;
    let npv = 0;
    const discountRate = 0.05; // 5% discount rate
    const yearByYear = [];

    for (let year = 1; year <= cottonwoodHeights.tif.term; year++) {
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
      annualRevenue: annualTIF,
      totalRevenue,
      npv,
      incrementalValue,
      projectedValue,
      yearByYear
    };
  }, [propertyType, cottonwoodHeights.tif]);

  // Cross-Subsidization Analysis
  const calculateCrossSubsidy = useMemo(() => {
    if (propertyType !== "cottonwoodHeights") {
      return {
        commercialNOI: 0,
        affordableNOI: 0,
        netSubsidy: 0,
        subsidyPerUnit: 0
      };
    }

    let commercialNOI = 0;
    if (cottonwoodHeights.office.enabled) {
      const officeRevenue = cottonwoodHeights.office.sf * cottonwoodHeights.office.rentPSF * (1 - cottonwoodHeights.office.vacancy / 100);
      const officeExpenses = cottonwoodHeights.office.sf * cottonwoodHeights.office.opex;
      commercialNOI += officeRevenue - officeExpenses;
    }
    if (cottonwoodHeights.retail.enabled) {
      const retailRevenue = cottonwoodHeights.retail.sf * cottonwoodHeights.retail.rentPSF * (1 - cottonwoodHeights.retail.vacancy / 100);
      const retailExpenses = cottonwoodHeights.retail.sf * cottonwoodHeights.retail.opex;
      commercialNOI += retailRevenue - retailExpenses;
    }
    if (cottonwoodHeights.grocery.enabled) {
      const groceryRevenue = cottonwoodHeights.grocery.sf * cottonwoodHeights.grocery.rentPSF * (1 - cottonwoodHeights.grocery.vacancy / 100);
      const groceryExpenses = cottonwoodHeights.grocery.sf * cottonwoodHeights.grocery.opex;
      commercialNOI += groceryRevenue - groceryExpenses;
    }

    let affordableNOI = 0;
    if (cottonwoodHeights.affordable.enabled) {
      const affordableRevenue = cottonwoodHeights.affordable.units * cottonwoodHeights.affordable.rentPerUnit * 12 * (1 - cottonwoodHeights.affordable.vacancy / 100);
      const affordableExpenses = cottonwoodHeights.affordable.units * cottonwoodHeights.affordable.opex;
      affordableNOI = affordableRevenue - affordableExpenses;
    }

    const netSubsidy = commercialNOI + affordableNOI;
    const subsidyPerUnit = cottonwoodHeights.affordable.units > 0 ? 
      (commercialNOI > 0 ? commercialNOI / cottonwoodHeights.affordable.units : 0) : 0;

    return {
      commercialNOI,
      affordableNOI,
      netSubsidy,
      subsidyPerUnit
    };
  }, [propertyType, cottonwoodHeights]);


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
        affordableNOI: calculateCrossSubsidy.affordableNOI,
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

  // Load active scenario after component mounts
  useEffect(() => {
    if (activeScenarioId && scenarios.length > 0) {
      const activeScenario = scenarios.find(s => s.id === activeScenarioId);
      if (activeScenario) {
        loadScenario(activeScenarioId);
      }
    }
  }, [activeScenarioId, scenarios.length]);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSaveEnabled || !activeScenarioId) return;

    const interval = setInterval(() => {
      const activeScenario = scenarios.find(s => s.id === activeScenarioId);
      if (activeScenario) {
        saveCurrentScenario(activeScenario.name, activeScenario.description);
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(interval);
  }, [autoSaveEnabled, activeScenarioId, scenarios]);

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
                {activeScenarioId && lastSaved && (
                  <span className="text-sm text-gray-500 ml-4">
                    Auto-saved {lastSaved.toLocaleTimeString()}
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
              <button
                onClick={() => setShowGoalSeek(true)}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
              >
                <Target size={20} />
                Goal Seek
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    ) : (
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Land Parcels - Total Cost: {formatCurrency(calculateLandCost)}
                        </label>
                        <div className="space-y-2">
                          {landParcels.map((parcel, index) => (
                            <div key={parcel.id} className="grid grid-cols-5 gap-2 items-center p-2 bg-gray-50 rounded">
                              <input
                                type="text"
                                value={parcel.name}
                                onChange={(e) => {
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
                                  const updated = [...landParcels];
                                  updated[index].pricePerAcre = Number(e.target.value);
                                  setLandParcels(updated);
                                }}
                                disabled={parcel.isDonated}
                                className={`px-2 py-1 border border-gray-300 rounded ${parcel.isDonated ? 'bg-gray-100' : ''}`}
                                placeholder="$/acre"
                              />
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={parcel.isDonated}
                                  onChange={(e) => {
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
                              setLandParcels([...landParcels, {
                                id: Date.now(),
                                name: `Parcel ${landParcels.length + 1}`,
                                acres: 0,
                                pricePerAcre: 0,
                                isDonated: false
                              }]);
                            }}
                            className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                          >
                            + Add Parcel
                          </button>
                        </div>
                      </div>
                    )}
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

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">
                      Hard Costs
                    </h3>
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Site Work
                        </label>
                        <input
                          type="text"
                          value={formatNumber(hardCosts.siteWork)}
                          onChange={(e) => {
                            const parsed = parseFormattedNumber(e.target.value);
                            setHardCosts({ ...hardCosts, siteWork: parsed });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
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
                    {mode === "detailed" && (
                      <>
                        <div className="grid grid-cols-2 gap-4 mt-4">
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
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Note: Parking and landscaping costs are included in Site Work total
                        </p>
                      </>
                    )}
                  </div>

                  {mode === "detailed" && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-3">
                        Soft Costs
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      <div className="grid grid-cols-2 gap-4 mt-4">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
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
                    <div className={`grid grid-cols-2 gap-4 ${!constructionLoan.enabled ? 'opacity-50' : ''}`}>
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
                          disabled={!constructionLoan.enabled}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      <div className={`grid grid-cols-2 gap-4 ${!permanentLoan.enabled ? 'opacity-50' : ''}`}>
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
                            disabled={!permanentLoan.enabled}
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
                          <div className="text-sm text-gray-600 flex items-center justify-center">
                            Year 1 DSCR
                            <InfoTooltip content="Debt Service Coverage Ratio: NOI divided by annual debt service. Lenders typically require 1.20x minimum." />
                          </div>
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

                  {/* Cottonwood Heights Mixed-Use */}
                  {propertyType === "cottonwoodHeights" && (
                    <div className="space-y-6">
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h3 className="font-semibold text-yellow-900 mb-2">Cottonwood Heights Mixed-Use Development</h3>
                        <p className="text-sm text-yellow-800">
                          This property type models a mixed-use development with commercial (office, retail, grocery), 
                          residential (townhomes, affordable housing), and public financing components.
                        </p>
                      </div>

                      {/* Commercial Components */}
                      <div>
                        <h3 className="font-medium text-gray-900 mb-3">Commercial Components</h3>
                        
                        {/* Office */}
                        <div className="mb-4 p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">Office Space</h4>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={cottonwoodHeights.office.enabled}
                                onChange={(e) => setCottonwoodHeights({
                                  ...cottonwoodHeights,
                                  office: { ...cottonwoodHeights.office, enabled: e.target.checked }
                                })}
                                className="mr-2"
                              />
                              <span className="text-sm">Enabled</span>
                            </label>
                          </div>
                          {cottonwoodHeights.office.enabled && (
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Square Feet</label>
                                <input
                                  type="number"
                                  value={cottonwoodHeights.office.sf}
                                  onChange={(e) => setCottonwoodHeights({
                                    ...cottonwoodHeights,
                                    office: { ...cottonwoodHeights.office, sf: Number(e.target.value) }
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rent/SF</label>
                                <input
                                  type="number"
                                  value={cottonwoodHeights.office.rentPSF}
                                  onChange={(e) => setCottonwoodHeights({
                                    ...cottonwoodHeights,
                                    office: { ...cottonwoodHeights.office, rentPSF: Number(e.target.value) }
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vacancy %</label>
                                <input
                                  type="number"
                                  value={cottonwoodHeights.office.vacancy}
                                  onChange={(e) => setCottonwoodHeights({
                                    ...cottonwoodHeights,
                                    office: { ...cottonwoodHeights.office, vacancy: Number(e.target.value) }
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                            </div>
                          )}
                        </div>

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
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Square Feet</label>
                                <input
                                  type="number"
                                  value={cottonwoodHeights.retail.sf}
                                  onChange={(e) => setCottonwoodHeights({
                                    ...cottonwoodHeights,
                                    retail: { ...cottonwoodHeights.retail, sf: Number(e.target.value) }
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rent/SF</label>
                                <input
                                  type="number"
                                  value={cottonwoodHeights.retail.rentPSF}
                                  onChange={(e) => setCottonwoodHeights({
                                    ...cottonwoodHeights,
                                    retail: { ...cottonwoodHeights.retail, rentPSF: Number(e.target.value) }
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vacancy %</label>
                                <input
                                  type="number"
                                  value={cottonwoodHeights.retail.vacancy}
                                  onChange={(e) => setCottonwoodHeights({
                                    ...cottonwoodHeights,
                                    retail: { ...cottonwoodHeights.retail, vacancy: Number(e.target.value) }
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
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
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Square Feet</label>
                                <input
                                  type="number"
                                  value={cottonwoodHeights.grocery.sf}
                                  onChange={(e) => setCottonwoodHeights({
                                    ...cottonwoodHeights,
                                    grocery: { ...cottonwoodHeights.grocery, sf: Number(e.target.value) }
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rent/SF</label>
                                <input
                                  type="number"
                                  value={cottonwoodHeights.grocery.rentPSF}
                                  onChange={(e) => setCottonwoodHeights({
                                    ...cottonwoodHeights,
                                    grocery: { ...cottonwoodHeights.grocery, rentPSF: Number(e.target.value) }
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vacancy %</label>
                                <input
                                  type="number"
                                  value={cottonwoodHeights.grocery.vacancy}
                                  onChange={(e) => setCottonwoodHeights({
                                    ...cottonwoodHeights,
                                    grocery: { ...cottonwoodHeights.grocery, vacancy: Number(e.target.value) }
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Residential Components */}
                      <div>
                        <h3 className="font-medium text-gray-900 mb-3">Residential Components</h3>
                        
                        {/* Townhomes */}
                        <div className="mb-4 p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">For-Sale Townhomes</h4>
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
                            <div className="grid grid-cols-3 gap-4">
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Avg Price</label>
                                <input
                                  type="number"
                                  value={cottonwoodHeights.townhomes.avgPrice}
                                  onChange={(e) => setCottonwoodHeights({
                                    ...cottonwoodHeights,
                                    townhomes: { ...cottonwoodHeights.townhomes, avgPrice: Number(e.target.value) }
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Affordable Housing */}
                        <div className="mb-4 p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">Affordable Housing</h4>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={cottonwoodHeights.affordable.enabled}
                                onChange={(e) => setCottonwoodHeights({
                                  ...cottonwoodHeights,
                                  affordable: { ...cottonwoodHeights.affordable, enabled: e.target.checked }
                                })}
                                className="mr-2"
                              />
                              <span className="text-sm">Enabled</span>
                            </label>
                          </div>
                          {cottonwoodHeights.affordable.enabled && (
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Units</label>
                                <input
                                  type="number"
                                  value={cottonwoodHeights.affordable.units}
                                  onChange={(e) => setCottonwoodHeights({
                                    ...cottonwoodHeights,
                                    affordable: { ...cottonwoodHeights.affordable, units: Number(e.target.value) }
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Avg Size (SF)</label>
                                <input
                                  type="number"
                                  value={cottonwoodHeights.affordable.avgSize}
                                  onChange={(e) => setCottonwoodHeights({
                                    ...cottonwoodHeights,
                                    affordable: { ...cottonwoodHeights.affordable, avgSize: Number(e.target.value) }
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rent/Unit</label>
                                <input
                                  type="number"
                                  value={cottonwoodHeights.affordable.rentPerUnit}
                                  onChange={(e) => setCottonwoodHeights({
                                    ...cottonwoodHeights,
                                    affordable: { ...cottonwoodHeights.affordable, rentPerUnit: Number(e.target.value) }
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                            </div>
                          )}
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
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Capture Rate (%)
                                  <InfoTooltip content="Percentage of incremental property taxes captured by TIF" />
                                </label>
                                <input
                                  type="number"
                                  value={cottonwoodHeights.tif.captureRate}
                                  onChange={(e) => setCottonwoodHeights({
                                    ...cottonwoodHeights,
                                    tif: { ...cottonwoodHeights.tif, captureRate: Number(e.target.value) }
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Term (Years)</label>
                                <input
                                  type="number"
                                  value={cottonwoodHeights.tif.term}
                                  onChange={(e) => setCottonwoodHeights({
                                    ...cottonwoodHeights,
                                    tif: { ...cottonwoodHeights.tif, term: Number(e.target.value) }
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Public Financing */}
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium mb-3">Public Financing Sources</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Tax-Exempt Bonds</label>
                              <input
                                type="number"
                                value={cottonwoodHeights.publicFinancing.taxExemptBonds}
                                onChange={(e) => setCottonwoodHeights({
                                  ...cottonwoodHeights,
                                  publicFinancing: { 
                                    ...cottonwoodHeights.publicFinancing, 
                                    taxExemptBonds: Number(e.target.value) 
                                  }
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Grants</label>
                              <input
                                type="number"
                                value={cottonwoodHeights.publicFinancing.grants}
                                onChange={(e) => setCottonwoodHeights({
                                  ...cottonwoodHeights,
                                  publicFinancing: { 
                                    ...cottonwoodHeights.publicFinancing, 
                                    grants: Number(e.target.value) 
                                  }
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Land Contribution</label>
                              <input
                                type="number"
                                value={cottonwoodHeights.publicFinancing.landContribution}
                                onChange={(e) => setCottonwoodHeights({
                                  ...cottonwoodHeights,
                                  publicFinancing: { 
                                    ...cottonwoodHeights.publicFinancing, 
                                    landContribution: Number(e.target.value) 
                                  }
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Infrastructure Contribution</label>
                              <input
                                type="number"
                                value={cottonwoodHeights.publicFinancing.infrastructureContribution}
                                onChange={(e) => setCottonwoodHeights({
                                  ...cottonwoodHeights,
                                  publicFinancing: { 
                                    ...cottonwoodHeights.publicFinancing, 
                                    infrastructureContribution: Number(e.target.value) 
                                  }
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Cross-Subsidization Summary */}
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-2">Cross-Subsidization Analysis</h4>
                          <div className="text-sm text-blue-800 space-y-1">
                            <p>• Commercial components subsidize affordable housing through higher returns</p>
                            <p>• TIF revenues support public infrastructure and affordable housing</p>
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
                  className="flex justify-between items-center p-3 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => setShowIRRBreakdown(true)}
                >
                  <span className="text-gray-700 flex items-center">
                    Project IRR
                    <InfoTooltip content="Click to see detailed IRR breakdown by year" />
                  </span>
                  <span className="text-xl font-bold text-blue-600">
                    {combinedReturns.irr}%
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-gray-700">Equity Multiple</span>
                  <span className="text-xl font-bold text-green-600">
                    {combinedReturns.equityMultiple}x
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="text-gray-700">Total Development Cost</span>
                  <span className="text-lg font-bold text-purple-600">
                    {formatCurrency(calculateTotalCost.total)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
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
                    <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                      <span className="text-gray-700">Avg Cash-on-Cash</span>
                      <span className="text-xl font-bold text-yellow-600">
                        {combinedReturns.avgCashOnCash}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
                      <span className="text-gray-700">Yield on Cost</span>
                      <span className="text-xl font-bold text-indigo-600">
                        {calculateAdditionalMetrics.yieldOnCost}%
                      </span>
                    </div>
                  </>
                )}
              </div>
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
                      {formatCurrency(cottonwoodHeights.tif.baseAssessedValue)}
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
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-gray-700 font-medium">Annual TIF Revenue</span>
                    <span className="text-xl font-bold text-blue-600">
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
                    <span className="text-sm text-gray-600">Affordable Housing NOI</span>
                    <span className="text-lg font-semibold text-red-600">
                      {formatCurrency(calculateCrossSubsidy.affordableNOI)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-gray-700 font-medium">Net Project NOI</span>
                    <span className="text-xl font-bold text-blue-600">
                      {formatCurrency(calculateCrossSubsidy.netSubsidy)}
                    </span>
                  </div>
                  {cottonwoodHeights.affordable.units > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Subsidy per Affordable Unit</span>
                      <span className="text-lg font-semibold">
                        {formatCurrency(calculateCrossSubsidy.subsidyPerUnit)}/year
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

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
              <p>This chart shows TIF revenue projections over the {cottonwoodHeights.tif.term}-year term.</p>
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
                  
                  {/* Monte Carlo Settings */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-3">Simulation Parameters</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Rent uses normal distribution, construction costs use uniform distribution
                    </p>
                    <div className="grid grid-cols-4 gap-4">
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
                  
                  {/* Additional Monte Carlo Metrics */}
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-700">Probability of IRR &gt; 15%</p>
                        <p className="text-lg font-bold text-blue-600">
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
    </div>
  );
}
