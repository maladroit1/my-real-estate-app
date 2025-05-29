import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Menu, X, ChevronLeft, ChevronRight, Save, Calculator,
  FileText, TrendingUp, Building2, DollarSign, Settings
} from 'lucide-react';
import { ScenarioManager, Project, Scenario, ScenarioData } from './features/ScenarioManager';
import { PDFExportSystem } from './features/PDFExportSystem';
import { AIInsightsIntegration } from '../components/AIInsightsIntegration';
import { ErrorOverview } from '../components/ErrorOverview';

// Import form components from v1 (we'll adapt these)
interface PropertyData {
  address: string;
  purchasePrice: number;
  closingCosts: number;
  renovationCosts: number;
  monthlyRent: number;
  otherIncome: number;
  vacancyRate: number;
  propertyTax: number;
  insurance: number;
  utilities: number;
  maintenance: number;
  management: number;
  hoa: number;
  other: number;
  downPaymentPercent: number;
  interestRate: number;
  loanTermYears: number;
}

// Form Component
const PropertyForm: React.FC<{
  data: PropertyData;
  onChange: (data: PropertyData) => void;
  locked: boolean;
}> = ({ data, onChange, locked }) => {
  const handleChange = (field: keyof PropertyData, value: string) => {
    onChange({
      ...data,
      [field]: field === 'address' ? value : parseFloat(value) || 0
    });
  };

  return (
    <div className="space-y-6">
      {/* Property Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 size={20} />
          Property Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Property Address</label>
            <input
              type="text"
              value={data.address}
              onChange={(e) => handleChange('address', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price</label>
            <input
              type="number"
              value={data.purchasePrice}
              onChange={(e) => handleChange('purchasePrice', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Closing Costs</label>
            <input
              type="number"
              value={data.closingCosts}
              onChange={(e) => handleChange('closingCosts', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Renovation Costs</label>
            <input
              type="number"
              value={data.renovationCosts}
              onChange={(e) => handleChange('renovationCosts', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Income */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <DollarSign size={20} />
          Income
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent</label>
            <input
              type="number"
              value={data.monthlyRent}
              onChange={(e) => handleChange('monthlyRent', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Other Income</label>
            <input
              type="number"
              value={data.otherIncome}
              onChange={(e) => handleChange('otherIncome', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vacancy Rate (%)</label>
            <input
              type="number"
              value={data.vacancyRate}
              onChange={(e) => handleChange('vacancyRate', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Expenses */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Operating Expenses</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Property Tax (Annual)</label>
            <input
              type="number"
              value={data.propertyTax}
              onChange={(e) => handleChange('propertyTax', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Insurance (Annual)</label>
            <input
              type="number"
              value={data.insurance}
              onChange={(e) => handleChange('insurance', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Utilities (Monthly)</label>
            <input
              type="number"
              value={data.utilities}
              onChange={(e) => handleChange('utilities', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance (Monthly)</label>
            <input
              type="number"
              value={data.maintenance}
              onChange={(e) => handleChange('maintenance', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Management (Monthly)</label>
            <input
              type="number"
              value={data.management}
              onChange={(e) => handleChange('management', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">HOA (Monthly)</label>
            <input
              type="number"
              value={data.hoa}
              onChange={(e) => handleChange('hoa', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Financing */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Financing</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Down Payment (%)</label>
            <input
              type="number"
              value={data.downPaymentPercent}
              onChange={(e) => handleChange('downPaymentPercent', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
            <input
              type="number"
              step="0.1"
              value={data.interestRate}
              onChange={(e) => handleChange('interestRate', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loan Term (Years)</label>
            <input
              type="number"
              value={data.loanTermYears}
              onChange={(e) => handleChange('loanTermYears', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Results Component
const ResultsPanel: React.FC<{ data: PropertyData }> = ({ data }) => {
  // Calculate metrics
  const totalInvestment = data.purchasePrice + data.closingCosts + data.renovationCosts;
  const downPayment = data.purchasePrice * (data.downPaymentPercent / 100);
  const loanAmount = data.purchasePrice - downPayment;
  
  const monthlyInterestRate = data.interestRate / 100 / 12;
  const numberOfPayments = data.loanTermYears * 12;
  
  const monthlyPayment = loanAmount * 
    (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
    (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);

  const effectiveRent = data.monthlyRent * (1 - data.vacancyRate / 100);
  const monthlyIncome = effectiveRent + data.otherIncome;

  const monthlyExpenses = 
    data.propertyTax / 12 +
    data.insurance / 12 +
    data.utilities +
    data.maintenance +
    data.management +
    data.hoa +
    data.other;

  const noi = (monthlyIncome - monthlyExpenses) * 12;
  const cashFlow = monthlyIncome - monthlyExpenses - monthlyPayment;
  const annualCashFlow = cashFlow * 12;
  
  const capRate = data.purchasePrice > 0 ? (noi / data.purchasePrice) * 100 : 0;
  const cashOnCashReturn = (downPayment + data.closingCosts + data.renovationCosts) > 0 
    ? (annualCashFlow / (downPayment + data.closingCosts + data.renovationCosts)) * 100 
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <TrendingUp size={20} />
        Key Metrics
      </h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Monthly Cash Flow</p>
            <p className={`text-xl font-bold ${cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(cashFlow)}
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">Cap Rate</p>
            <p className="text-xl font-bold text-green-600">{capRate.toFixed(2)}%</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600">Cash-on-Cash Return</p>
            <p className="text-xl font-bold text-purple-600">{cashOnCashReturn.toFixed(2)}%</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-gray-600">Annual NOI</p>
            <p className="text-xl font-bold text-yellow-600">{formatCurrency(noi)}</p>
          </div>
        </div>
        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">Investment Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Investment:</span>
              <span className="font-medium">{formatCurrency(totalInvestment)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Down Payment:</span>
              <span className="font-medium">{formatCurrency(downPayment)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Loan Amount:</span>
              <span className="font-medium">{formatCurrency(loanAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Monthly Payment:</span>
              <span className="font-medium">{formatCurrency(monthlyPayment)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App Component
const RealEstateProFormaV2: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [project, setProject] = useState<Project | null>(null);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [showPDFExport, setShowPDFExport] = useState(false);
  const [apiKey, setApiKey] = useState<string | undefined>(undefined);
  const [formData, setFormData] = useState<PropertyData>({
    address: '123 Main Street, Los Angeles, CA 90001',
    purchasePrice: 5000000,
    closingCosts: 100000,
    renovationCosts: 500000,
    monthlyRent: 75000,
    otherIncome: 5000,
    vacancyRate: 5,
    propertyTax: 50000,
    insurance: 25000,
    utilities: 2000,
    maintenance: 3000,
    management: 4000,
    hoa: 500,
    other: 0,
    downPaymentPercent: 25,
    interestRate: 6.5,
    loanTermYears: 30
  });

  // Load API key from localStorage
  useEffect(() => {
    const savedApiKey = localStorage.getItem('claude_api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  // Initialize project
  useEffect(() => {
    const defaultProject: Project = {
      id: 'default-project',
      name: 'Sunset Gardens Apartments',
      description: 'Professional real estate investment analysis',
      propertyType: 'multifamily',
      address: '123 Main Street, Los Angeles, CA 90001',
      createdAt: new Date(),
      modifiedAt: new Date(),
      createdBy: 'User',
      tags: [],
      scenarios: [],
      settings: {
        currency: 'USD',
        units: 'imperial',
        fiscalYearStart: 1,
        defaultAssumptions: {
          inflationRate: 3.0,
          discountRate: 8.0,
          taxRate: 25.0
        }
      }
    };
    setProject(defaultProject);
    
    // Create initial scenario
    const initialScenario: Scenario = {
      id: 'initial-scenario',
      projectId: defaultProject.id,
      name: 'Base Case Analysis',
      description: 'Conservative underwriting with market assumptions',
      version: 1,
      createdAt: new Date(),
      modifiedAt: new Date(),
      createdBy: 'User',
      locked: false,
      archived: false,
      tags: ['base-case', 'conservative'],
      data: formDataToScenarioData(formData),
      results: {
        irr: 18.5,
        leveragedIRR: 22.3,
        npv: 2500000,
        cashOnCash: 9.2,
        equityMultiple: 2.35,
        capRate: 7.5,
        yieldOnCost: 8.2,
        dscr: [1.35, 1.38, 1.42, 1.45, 1.48],
        cashFlows: []
      },
      metadata: {
        assumptions: 'Based on current market conditions and conservative rent growth',
        notes: 'Strong location with stable tenant base'
      }
    };
    setCurrentScenario(initialScenario);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Convert form data to scenario data
  const formDataToScenarioData = (data: PropertyData): ScenarioData => {
    return {
      propertyInfo: {
        name: 'Property',
        address: data.address,
        propertyType: 'multifamily',
        grossArea: 0,
        netRentableArea: 0,
        units: 1
      },
      acquisition: {
        purchasePrice: data.purchasePrice,
        closingCosts: data.closingCosts,
        dueDiligence: 0,
        brokerFees: 0,
        renovationCosts: data.renovationCosts,
        acquisitionDate: new Date()
      },
      financing: {
        loans: [{
          id: 'loan-1',
          name: 'Primary Mortgage',
          amount: data.purchasePrice * (1 - data.downPaymentPercent / 100),
          interestRate: data.interestRate,
          term: data.loanTermYears,
          amortization: data.loanTermYears,
          type: 'fixed',
          startDate: new Date()
        }],
        equityRequirement: data.purchasePrice * (data.downPaymentPercent / 100),
        preferredReturn: 8
      },
      revenue: {
        rental: [{
          id: 'rental-1',
          unit: 'Unit 1',
          area: 0,
          monthlyRent: data.monthlyRent,
          escalation: 3,
          leaseStart: new Date(),
          leaseEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          vacancyRate: data.vacancyRate
        }],
        other: data.otherIncome > 0 ? [{
          id: 'other-1',
          name: 'Other Income',
          type: 'other',
          amount: data.otherIncome,
          frequency: 'monthly' as const,
          escalation: 3
        }] : [],
        escalations: []
      },
      expenses: {
        operating: [
          {
            id: 'tax',
            category: 'Taxes',
            description: 'Property Tax',
            amount: data.propertyTax,
            frequency: 'annual' as const,
            escalation: 3,
            recoverable: false
          },
          {
            id: 'insurance',
            category: 'Insurance',
            description: 'Property Insurance',
            amount: data.insurance,
            frequency: 'annual' as const,
            escalation: 3,
            recoverable: false
          },
          {
            id: 'utilities',
            category: 'Utilities',
            description: 'Utilities',
            amount: data.utilities,
            frequency: 'monthly' as const,
            escalation: 3,
            recoverable: false
          },
          {
            id: 'maintenance',
            category: 'Maintenance',
            description: 'Repairs & Maintenance',
            amount: data.maintenance,
            frequency: 'monthly' as const,
            escalation: 3,
            recoverable: false
          },
          {
            id: 'management',
            category: 'Management',
            description: 'Property Management',
            amount: data.management,
            frequency: 'monthly' as const,
            escalation: 3,
            recoverable: false
          },
          {
            id: 'hoa',
            category: 'HOA',
            description: 'HOA Fees',
            amount: data.hoa,
            frequency: 'monthly' as const,
            escalation: 3,
            recoverable: false
          }
        ].filter(exp => exp.amount > 0),
        capital: []
      },
      exit: {
        holdPeriod: 5,
        exitCapRate: 6.0,
        sellingCosts: 2,
        terminal: {
          method: 'capRate',
          value: 6.0
        }
      }
    };
  };

  // Convert scenario data back to form data
  const scenarioDataToFormData = (scenarioData: ScenarioData): PropertyData => {
    const loan = scenarioData.financing.loans[0];
    const rental = scenarioData.revenue.rental[0];
    const otherIncome = scenarioData.revenue.other[0];
    
    const expenses = scenarioData.expenses.operating.reduce((acc, exp) => {
      const monthlyAmount = exp.frequency === 'annual' ? exp.amount / 12 : exp.amount;
      switch (exp.id) {
        case 'tax': return { ...acc, propertyTax: exp.amount };
        case 'insurance': return { ...acc, insurance: exp.amount };
        case 'utilities': return { ...acc, utilities: monthlyAmount };
        case 'maintenance': return { ...acc, maintenance: monthlyAmount };
        case 'management': return { ...acc, management: monthlyAmount };
        case 'hoa': return { ...acc, hoa: monthlyAmount };
        default: return acc;
      }
    }, {} as Partial<PropertyData>);

    return {
      address: scenarioData.propertyInfo.address,
      purchasePrice: scenarioData.acquisition.purchasePrice,
      closingCosts: scenarioData.acquisition.closingCosts,
      renovationCosts: scenarioData.acquisition.renovationCosts,
      monthlyRent: rental?.monthlyRent || 0,
      otherIncome: otherIncome?.amount || 0,
      vacancyRate: rental?.vacancyRate || 5,
      propertyTax: expenses.propertyTax || 0,
      insurance: expenses.insurance || 0,
      utilities: expenses.utilities || 0,
      maintenance: expenses.maintenance || 0,
      management: expenses.management || 0,
      hoa: expenses.hoa || 0,
      other: 0,
      downPaymentPercent: loan ? (1 - loan.amount / scenarioData.acquisition.purchasePrice) * 100 : 20,
      interestRate: loan?.interestRate || 7.0,
      loanTermYears: loan?.term || 30
    };
  };

  // Handle scenario change
  const handleScenarioChange = (scenario: Scenario) => {
    setCurrentScenario(scenario);
    setFormData(scenarioDataToFormData(scenario.data));
  };

  // Handle scenario update
  const handleScenarioUpdate = (scenario: Scenario) => {
    if (scenario.id === currentScenario?.id) {
      setCurrentScenario(scenario);
    }
  };

  // Handle form data change
  const handleFormDataChange = useCallback((newData: PropertyData) => {
    setFormData(newData);
    
    // Update scenario with new data
    if (currentScenario && !currentScenario.locked) {
      const updatedScenario: Scenario = {
        ...currentScenario,
        data: formDataToScenarioData(newData),
        modifiedAt: new Date()
      };
      
      // Calculate simple results
      const totalInvestment = newData.purchasePrice + newData.closingCosts + newData.renovationCosts;
      const downPayment = newData.purchasePrice * (newData.downPaymentPercent / 100);
      const monthlyIncome = newData.monthlyRent * (1 - newData.vacancyRate / 100) + newData.otherIncome;
      const monthlyExpenses = newData.propertyTax / 12 + newData.insurance / 12 + 
        newData.utilities + newData.maintenance + newData.management + newData.hoa;
      const noi = (monthlyIncome - monthlyExpenses) * 12;
      
      updatedScenario.results = {
        irr: 15.5, // Simplified calculation
        leveragedIRR: 18.5,
        npv: noi * 10 - totalInvestment, // Simplified
        cashOnCash: ((noi / (downPayment + newData.closingCosts + newData.renovationCosts)) * 100) || 0,
        equityMultiple: 2.1,
        capRate: newData.purchasePrice > 0 ? (noi / newData.purchasePrice) * 100 : 0,
        yieldOnCost: totalInvestment > 0 ? (noi / totalInvestment) * 100 : 0,
        dscr: [1.25],
        cashFlows: []
      };
      
      handleScenarioUpdate(updatedScenario);
    }
  }, [currentScenario]);

  // Memoized callbacks for ErrorOverview
  const handleFieldFocus = useCallback((field: string) => {
    const element = document.querySelector(`[name="${field}"]`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handleSuggestionApply = useCallback((field: string, value: any) => {
    handleFormDataChange({
      ...formData,
      [field]: value
    });
  }, [formData, handleFormDataChange]);

  if (!project) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div 
        className={`bg-white border-r transition-all duration-300 flex flex-col ${
          sidebarOpen ? '' : 'w-0 overflow-hidden'
        }`}
        style={{ width: sidebarOpen ? `${sidebarWidth}px` : 0 }}
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold">Scenarios</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ScenarioManager
            project={project}
            currentScenario={currentScenario || undefined}
            onScenarioChange={handleScenarioChange}
            onScenarioUpdate={handleScenarioUpdate}
            className="border-0 shadow-none"
          />
        </div>
      </div>

      {/* Resize Handle */}
      {sidebarOpen && (
        <div
          className="w-1 bg-gray-200 hover:bg-blue-500 cursor-col-resize transition-colors"
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startWidth = sidebarWidth;
            
            const handleMouseMove = (e: MouseEvent) => {
              const newWidth = startWidth + e.clientX - startX;
              setSidebarWidth(Math.max(300, Math.min(600, newWidth)));
            };
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <Menu size={20} />
                </button>
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">Real Estate Pro Forma v2</h1>
                {currentScenario && (
                  <p className="text-sm text-gray-600">
                    {currentScenario.name} {currentScenario.locked && '(Locked)'}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-2">
                <Calculator size={20} />
                Calculate
              </button>
              <button 
                onClick={() => setShowPDFExport(true)}
                disabled={!currentScenario}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <FileText size={20} />
                Generate Report
              </button>
              <AIInsightsIntegration 
                scenario={currentScenario}
                className=""
              />
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentScenario ? (
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <PropertyForm 
                  data={formData} 
                  onChange={handleFormDataChange}
                  locked={currentScenario.locked}
                />
              </div>
              <div className="space-y-4">
                <ErrorOverview 
                  scenario={currentScenario}
                  apiKey={apiKey}
                  onFieldFocus={handleFieldFocus}
                  onSuggestionApply={handleSuggestionApply}
                />
                <ResultsPanel data={formData} />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Building2 size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">No Scenario Selected</h3>
                <div className="text-gray-600 mt-2">Create or select a scenario to begin</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PDF Export Modal */}
      {project && currentScenario && showPDFExport && (
        <PDFExportSystem
          project={project}
          scenario={currentScenario}
          onClose={() => setShowPDFExport(false)}
        />
      )}
    </div>
  );
};

export default RealEstateProFormaV2;