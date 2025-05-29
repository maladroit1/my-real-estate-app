import React, { useState } from 'react';

interface ProFormaData {
  propertyInfo: {
    address: string;
    purchasePrice: number;
    closingCosts: number;
    renovationCosts: number;
  };
  financing: {
    downPaymentPercent: number;
    loanAmount: number;
    interestRate: number;
    loanTermYears: number;
  };
  income: {
    monthlyRent: number;
    otherIncome: number;
    vacancyRate: number;
  };
  expenses: {
    propertyTax: number;
    insurance: number;
    hoa: number;
    maintenance: number;
    propertyManagement: number;
    utilities: number;
    other: number;
  };
}

const RealEstateProFormaV2: React.FC = () => {
  const [proFormaData, setProFormaData] = useState<ProFormaData>({
    propertyInfo: {
      address: '',
      purchasePrice: 0,
      closingCosts: 0,
      renovationCosts: 0,
    },
    financing: {
      downPaymentPercent: 20,
      loanAmount: 0,
      interestRate: 7.0,
      loanTermYears: 30,
    },
    income: {
      monthlyRent: 0,
      otherIncome: 0,
      vacancyRate: 5,
    },
    expenses: {
      propertyTax: 0,
      insurance: 0,
      hoa: 0,
      maintenance: 0,
      propertyManagement: 0,
      utilities: 0,
      other: 0,
    },
  });

  const calculateMetrics = () => {
    const totalInvestment = 
      proFormaData.propertyInfo.purchasePrice + 
      proFormaData.propertyInfo.closingCosts + 
      proFormaData.propertyInfo.renovationCosts;

    const downPayment = proFormaData.propertyInfo.purchasePrice * (proFormaData.financing.downPaymentPercent / 100);
    const loanAmount = proFormaData.propertyInfo.purchasePrice - downPayment;
    
    const monthlyInterestRate = proFormaData.financing.interestRate / 100 / 12;
    const numberOfPayments = proFormaData.financing.loanTermYears * 12;
    
    const monthlyPayment = loanAmount * 
      (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
      (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);

    const effectiveRent = proFormaData.income.monthlyRent * (1 - proFormaData.income.vacancyRate / 100);
    const monthlyIncome = effectiveRent + proFormaData.income.otherIncome;

    const monthlyExpenses = 
      proFormaData.expenses.propertyTax / 12 +
      proFormaData.expenses.insurance / 12 +
      proFormaData.expenses.hoa +
      proFormaData.expenses.maintenance +
      proFormaData.expenses.propertyManagement +
      proFormaData.expenses.utilities +
      proFormaData.expenses.other;

    const noi = (monthlyIncome - monthlyExpenses) * 12;
    const cashFlow = monthlyIncome - monthlyExpenses - monthlyPayment;
    const annualCashFlow = cashFlow * 12;
    
    const capRate = (noi / proFormaData.propertyInfo.purchasePrice) * 100;
    const cashOnCashReturn = (annualCashFlow / (downPayment + proFormaData.propertyInfo.closingCosts + proFormaData.propertyInfo.renovationCosts)) * 100;

    return {
      totalInvestment,
      downPayment,
      loanAmount,
      monthlyPayment,
      monthlyIncome,
      monthlyExpenses,
      noi,
      cashFlow,
      annualCashFlow,
      capRate,
      cashOnCashReturn,
    };
  };

  const metrics = calculateMetrics();

  const handleInputChange = (section: keyof ProFormaData, field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setProFormaData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: numValue,
      },
    }));
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Real Estate Pro Forma Calculator V2</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h2>Property Information</h2>
          <div style={{ marginBottom: '10px' }}>
            <label>Property Address:</label>
            <input
              type="text"
              value={proFormaData.propertyInfo.address}
              onChange={(e) => setProFormaData(prev => ({
                ...prev,
                propertyInfo: { ...prev.propertyInfo, address: e.target.value }
              }))}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Purchase Price:</label>
            <input
              type="number"
              value={proFormaData.propertyInfo.purchasePrice}
              onChange={(e) => handleInputChange('propertyInfo', 'purchasePrice', e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Closing Costs:</label>
            <input
              type="number"
              value={proFormaData.propertyInfo.closingCosts}
              onChange={(e) => handleInputChange('propertyInfo', 'closingCosts', e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Renovation Costs:</label>
            <input
              type="number"
              value={proFormaData.propertyInfo.renovationCosts}
              onChange={(e) => handleInputChange('propertyInfo', 'renovationCosts', e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>

          <h2>Financing</h2>
          <div style={{ marginBottom: '10px' }}>
            <label>Down Payment (%):</label>
            <input
              type="number"
              value={proFormaData.financing.downPaymentPercent}
              onChange={(e) => handleInputChange('financing', 'downPaymentPercent', e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Interest Rate (%):</label>
            <input
              type="number"
              step="0.1"
              value={proFormaData.financing.interestRate}
              onChange={(e) => handleInputChange('financing', 'interestRate', e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Loan Term (Years):</label>
            <input
              type="number"
              value={proFormaData.financing.loanTermYears}
              onChange={(e) => handleInputChange('financing', 'loanTermYears', e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>

          <h2>Income</h2>
          <div style={{ marginBottom: '10px' }}>
            <label>Monthly Rent:</label>
            <input
              type="number"
              value={proFormaData.income.monthlyRent}
              onChange={(e) => handleInputChange('income', 'monthlyRent', e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Other Income:</label>
            <input
              type="number"
              value={proFormaData.income.otherIncome}
              onChange={(e) => handleInputChange('income', 'otherIncome', e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Vacancy Rate (%):</label>
            <input
              type="number"
              value={proFormaData.income.vacancyRate}
              onChange={(e) => handleInputChange('income', 'vacancyRate', e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
        </div>

        <div>
          <h2>Expenses</h2>
          <div style={{ marginBottom: '10px' }}>
            <label>Property Tax (Annual):</label>
            <input
              type="number"
              value={proFormaData.expenses.propertyTax}
              onChange={(e) => handleInputChange('expenses', 'propertyTax', e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Insurance (Annual):</label>
            <input
              type="number"
              value={proFormaData.expenses.insurance}
              onChange={(e) => handleInputChange('expenses', 'insurance', e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>HOA (Monthly):</label>
            <input
              type="number"
              value={proFormaData.expenses.hoa}
              onChange={(e) => handleInputChange('expenses', 'hoa', e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Maintenance (Monthly):</label>
            <input
              type="number"
              value={proFormaData.expenses.maintenance}
              onChange={(e) => handleInputChange('expenses', 'maintenance', e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Property Management (Monthly):</label>
            <input
              type="number"
              value={proFormaData.expenses.propertyManagement}
              onChange={(e) => handleInputChange('expenses', 'propertyManagement', e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Utilities (Monthly):</label>
            <input
              type="number"
              value={proFormaData.expenses.utilities}
              onChange={(e) => handleInputChange('expenses', 'utilities', e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Other (Monthly):</label>
            <input
              type="number"
              value={proFormaData.expenses.other}
              onChange={(e) => handleInputChange('expenses', 'other', e.target.value)}
              style={{ width: '100%', padding: '5px' }}
            />
          </div>

          <h2>Key Metrics</h2>
          <div style={{ backgroundColor: '#f0f0f0', padding: '15px', borderRadius: '5px' }}>
            <p><strong>Total Investment:</strong> ${metrics.totalInvestment.toFixed(2)}</p>
            <p><strong>Down Payment:</strong> ${metrics.downPayment.toFixed(2)}</p>
            <p><strong>Loan Amount:</strong> ${metrics.loanAmount.toFixed(2)}</p>
            <p><strong>Monthly Payment (P&I):</strong> ${metrics.monthlyPayment.toFixed(2)}</p>
            <p><strong>Monthly Income:</strong> ${metrics.monthlyIncome.toFixed(2)}</p>
            <p><strong>Monthly Expenses:</strong> ${metrics.monthlyExpenses.toFixed(2)}</p>
            <p><strong>Net Operating Income (NOI):</strong> ${metrics.noi.toFixed(2)}</p>
            <p><strong>Monthly Cash Flow:</strong> ${metrics.cashFlow.toFixed(2)}</p>
            <p><strong>Annual Cash Flow:</strong> ${metrics.annualCashFlow.toFixed(2)}</p>
            <p><strong>Cap Rate:</strong> {metrics.capRate.toFixed(2)}%</p>
            <p><strong>Cash-on-Cash Return:</strong> {metrics.cashOnCashReturn.toFixed(2)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealEstateProFormaV2;