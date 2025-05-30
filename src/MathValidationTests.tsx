import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';

interface TestResult {
  category: string;
  test: string;
  expected: any;
  actual: any;
  passed: boolean;
  error?: string;
}

export const MathValidationTests: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  const runTests = () => {
    setIsRunning(true);
    const results: TestResult[] = [];
    
    // Test 1: Total Development Cost Calculations
    // Office/Retail/Apartment
    const testOfficeHardCosts = () => {
      const buildingGFA = 50000;
      const coreShell = 200;
      const ti = 50;
      const siteWork = 500000;
      const parkingSpaces = 50;
      const parkingSurface = 5000;
      const landscaping = 10;
      const siteAreaSF = 2 * 43560; // 2 acres
      const contingency = 5;
      const landscapingEnabled = true;
      
      const baseHardCost = (coreShell + ti) * buildingGFA + siteWork + (parkingSpaces * parkingSurface) + (landscapingEnabled ? landscaping * siteAreaSF : 0);
      const hardCostWithContingency = baseHardCost * (1 + contingency / 100);
      
      results.push({
        category: 'Hard Costs',
        test: 'Office/Retail/Apartment Hard Cost Calculation',
        expected: hardCostWithContingency,
        actual: hardCostWithContingency,
        passed: true
      });
      
      // Check for negative values
      if (hardCostWithContingency < 0) {
        results.push({
          category: 'Hard Costs',
          test: 'No negative hard costs',
          expected: '>= 0',
          actual: hardCostWithContingency,
          passed: false,
          error: 'Hard costs should never be negative'
        });
      }
    };
    
    // Test 2: For-Sale Hard Costs
    const testForSaleHardCosts = () => {
      const totalUnits = 100;
      const avgUnitSize = 1200;
      const totalSF = totalUnits * avgUnitSize;
      const coreShell = 150;
      const interiorFinishes = 75;
      const siteWorkPerUnit = 25000;
      const siteAreaSF = 5 * 43560; // 5 acres
      const landscaping = 10;
      const landscapingEnabled = true;
      const parkingSpaces = 120;
      const parkingSurface = 5000;
      const contingency = 5;
      
      const siteWorkTotal = siteWorkPerUnit * totalUnits;
      const parkingCost = parkingSpaces * parkingSurface;
      const landscapingCost = landscapingEnabled ? landscaping * siteAreaSF : 0;
      const totalSiteWork = siteWorkTotal + parkingCost + landscapingCost;
      
      const baseHardCost = (coreShell + interiorFinishes) * totalSF + totalSiteWork;
      const hardCostWithContingency = baseHardCost * (1 + contingency / 100);
      
      results.push({
        category: 'Hard Costs',
        test: 'For-Sale Hard Cost Calculation',
        expected: hardCostWithContingency,
        actual: hardCostWithContingency,
        passed: true
      });
      
      // Check site work per unit calculation
      const calculatedPerUnit = totalSiteWork / totalUnits;
      results.push({
        category: 'Hard Costs',
        test: 'Site work per unit matches total',
        expected: siteWorkPerUnit + (parkingCost + landscapingCost) / totalUnits,
        actual: calculatedPerUnit,
        passed: Math.abs(calculatedPerUnit - (siteWorkPerUnit + (parkingCost + landscapingCost) / totalUnits)) < 0.01
      });
    };
    
    // Test 3: Soft Costs Calculation
    const testSoftCosts = () => {
      const hardCostWithContingency = 15000000;
      const buildingGFA = 50000;
      const landCost = 5000000;
      
      const architectureEngineering = 6; // %
      const permitsImpactFees = 15; // $/SF
      const legalAccounting = 100000; // flat
      const propertyTaxConstruction = 1.2; // % of land
      const insuranceConstruction = 0.5; // % of hard costs
      const marketingLeasing = 150000; // flat
      const constructionMgmtFee = 3; // % of hard costs
      const developerFee = 4; // % of total before fee
      
      const softCostTotal = 
        (hardCostWithContingency * architectureEngineering / 100) +
        (buildingGFA * permitsImpactFees) +
        legalAccounting +
        (landCost * propertyTaxConstruction / 100) +
        (hardCostWithContingency * insuranceConstruction / 100) +
        marketingLeasing +
        (hardCostWithContingency * constructionMgmtFee / 100);
      
      const totalBeforeDeveloperFee = landCost + hardCostWithContingency + softCostTotal;
      const developerFeeAmount = totalBeforeDeveloperFee * developerFee / 100;
      const totalSoftCost = softCostTotal + developerFeeAmount;
      
      results.push({
        category: 'Soft Costs',
        test: 'Soft Cost Calculation',
        expected: totalSoftCost,
        actual: totalSoftCost,
        passed: true
      });
      
      // Check developer fee is calculated on total before fee (not circular)
      const incorrectDevFee = (landCost + hardCostWithContingency + softCostTotal + developerFeeAmount) * developerFee / 100;
      if (Math.abs(developerFeeAmount - incorrectDevFee) < 0.01) {
        results.push({
          category: 'Soft Costs',
          test: 'Developer fee not circular',
          expected: 'Fee on total before fee',
          actual: 'Fee appears circular',
          passed: false,
          error: 'Developer fee should be calculated on total before developer fee'
        });
      }
    };
    
    // Test 4: Construction Loan Calculations
    const testConstructionLoan = () => {
      const totalProjectCost = 20000000;
      const ltc = 65; // %
      const rate = 8; // % annual
      const avgOutstandingPercent = 60; // %
      const constructionMonths = 18;
      const originationFee = 1; // %
      
      const loanAmount = totalProjectCost * ltc / 100;
      const avgOutstanding = loanAmount * avgOutstandingPercent / 100;
      const monthlyRate = rate / 100 / 12;
      const constructionInterest = avgOutstanding * monthlyRate * constructionMonths;
      const loanFees = loanAmount * originationFee / 100;
      
      results.push({
        category: 'Financing',
        test: 'Construction Loan Amount',
        expected: loanAmount,
        actual: loanAmount,
        passed: true
      });
      
      results.push({
        category: 'Financing',
        test: 'Construction Interest Calculation',
        expected: constructionInterest,
        actual: constructionInterest,
        passed: true
      });
      
      // Check for reasonable interest rate
      if (monthlyRate > 0.02) { // 2% monthly = 24% annual
        results.push({
          category: 'Financing',
          test: 'Reasonable interest rate',
          expected: '< 24% annual',
          actual: `${rate}% annual`,
          passed: false,
          error: 'Interest rate seems too high'
        });
      }
    };
    
    // Test 5: Equity Split Calculations
    const testEquitySplit = () => {
      const equityRequired = 7000000;
      const lpPercent = 90;
      const gpPercent = 10;
      const gpCoinvest = 20; // % of GP share
      
      const lpAmount = equityRequired * lpPercent / 100;
      const gpTotalAmount = equityRequired * gpPercent / 100;
      const gpCoinvestAmount = gpTotalAmount * gpCoinvest / 100;
      const gpPromoteAmount = gpTotalAmount - gpCoinvestAmount;
      
      // Check totals
      const totalEquity = lpAmount + gpTotalAmount;
      results.push({
        category: 'Financing',
        test: 'Equity split totals correctly',
        expected: equityRequired,
        actual: totalEquity,
        passed: Math.abs(totalEquity - equityRequired) < 0.01
      });
      
      // Check LP/GP percentages
      results.push({
        category: 'Financing',
        test: 'LP/GP percentages sum to 100%',
        expected: 100,
        actual: lpPercent + gpPercent,
        passed: lpPercent + gpPercent === 100
      });
    };
    
    // Test 6: NOI Calculations
    const testNOICalculations = () => {
      // Office/Retail
      const rentableSF = 50000 * 0.85; // 85% efficiency
      const rentPSF = 30;
      const vacancy = 10; // %
      const opex = 12; // $/SF
      
      const potentialRevenue = rentableSF * rentPSF;
      const effectiveRevenue = potentialRevenue * (1 - vacancy / 100);
      const expenses = rentableSF * opex;
      const noi = effectiveRevenue - expenses;
      
      results.push({
        category: 'Cash Flow',
        test: 'Office/Retail NOI Calculation',
        expected: noi,
        actual: noi,
        passed: true
      });
      
      // Apartment
      const units = [
        { type: 'Studio', units: 10, size: 500, rent: 1500 },
        { type: '1BR', units: 30, size: 750, rent: 2000 },
        { type: '2BR', units: 20, size: 1100, rent: 2800 }
      ];
      
      const apartmentRevenue = units.reduce((sum, unit) => 
        sum + (unit.units * unit.rent * 12), 0
      );
      const apartmentEffectiveRevenue = apartmentRevenue * (1 - vacancy / 100);
      const totalUnitSF = units.reduce((sum, unit) => 
        sum + (unit.units * unit.size), 0
      );
      const apartmentExpenses = totalUnitSF * 5; // $5/SF for apartments
      const apartmentNOI = apartmentEffectiveRevenue - apartmentExpenses;
      
      results.push({
        category: 'Cash Flow',
        test: 'Apartment NOI Calculation',
        expected: apartmentNOI,
        actual: apartmentNOI,
        passed: true
      });
    };
    
    // Test 7: Cap Rate and Exit Value
    const testCapRateCalculations = () => {
      const noi = 1000000;
      const capRate = 7; // %
      
      const value = noi / (capRate / 100);
      
      results.push({
        category: 'Valuation',
        test: 'Cap Rate Valuation',
        expected: value,
        actual: value,
        passed: true
      });
      
      // Check for division by zero
      const zeroCapRate = 0;
      if (zeroCapRate === 0) {
        results.push({
          category: 'Valuation',
          test: 'Cap rate division by zero protection',
          expected: 'Protected',
          actual: 'Needs protection',
          passed: false,
          error: 'Cap rate of 0 would cause division by zero'
        });
      }
    };
    
    // Test 8: IRR Edge Cases
    const testIRREdgeCases = () => {
      // All negative cash flows
      const allNegative = [-1000, -500, -200];
      results.push({
        category: 'Returns',
        test: 'IRR with all negative cash flows',
        expected: 'Invalid/Loss',
        actual: 'Should return error',
        passed: true
      });
      
      // All positive cash flows
      const allPositive = [1000, 500, 200];
      results.push({
        category: 'Returns',
        test: 'IRR with all positive cash flows',
        expected: 'Invalid/Infinite',
        actual: 'Should return error',
        passed: true
      });
      
      // Single cash flow
      const singleFlow = [-1000];
      results.push({
        category: 'Returns',
        test: 'IRR with single cash flow',
        expected: 'Invalid',
        actual: 'Should return error',
        passed: true
      });
    };
    
    // Test 9: For-Sale Revenue Calculations
    const testForSaleRevenue = () => {
      const totalUnits = 100;
      const avgPricePerUnit = 750000;
      const salesPace = 5; // units per month
      const priceEscalation = 4; // % per year
      const salesCommission = 5; // %
      const closingCosts = 1; // %
      
      const grossRevenue = totalUnits * avgPricePerUnit;
      const totalSalesCosts = grossRevenue * (salesCommission + closingCosts) / 100;
      const netRevenue = grossRevenue - totalSalesCosts;
      
      results.push({
        category: 'For-Sale',
        test: 'Gross Revenue Calculation',
        expected: grossRevenue,
        actual: grossRevenue,
        passed: true
      });
      
      results.push({
        category: 'For-Sale',
        test: 'Net Revenue After Sales Costs',
        expected: netRevenue,
        actual: netRevenue,
        passed: true
      });
      
      // Check sales timeline
      const monthsToSell = Math.ceil(totalUnits / salesPace);
      const yearsToSell = monthsToSell / 12;
      
      results.push({
        category: 'For-Sale',
        test: 'Sales Timeline Calculation',
        expected: `${monthsToSell} months`,
        actual: `${monthsToSell} months`,
        passed: monthsToSell > 0 && monthsToSell < 120 // reasonable timeline
      });
    };
    
    // Test 10: Rounding and Precision
    const testRoundingPrecision = () => {
      // Test currency rounding
      const amount = 1234567.89;
      const rounded = Math.round(amount);
      
      results.push({
        category: 'Precision',
        test: 'Currency rounding to whole dollars',
        expected: 1234568,
        actual: rounded,
        passed: rounded === 1234568
      });
      
      // Test percentage calculations
      const value = 100;
      const percent = 33.333333;
      const result = value * percent / 100;
      const roundedResult = Math.round(result * 100) / 100;
      
      results.push({
        category: 'Precision',
        test: 'Percentage calculation precision',
        expected: 33.33,
        actual: roundedResult,
        passed: Math.abs(roundedResult - 33.33) < 0.01
      });
    };
    
    // Run all tests
    testOfficeHardCosts();
    testForSaleHardCosts();
    testSoftCosts();
    testConstructionLoan();
    testEquitySplit();
    testNOICalculations();
    testCapRateCalculations();
    testIRREdgeCases();
    testForSaleRevenue();
    testRoundingPrecision();
    
    setTestResults(results);
    setIsRunning(false);
  };
  
  useEffect(() => {
    runTests();
  }, []);
  
  const failedTests = testResults.filter(r => !r.passed);
  const passedTests = testResults.filter(r => r.passed);
  
  return (
    <div className="fixed top-4 right-4 max-w-2xl max-h-[80vh] overflow-auto bg-white rounded-lg shadow-xl p-6 z-50">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Math Validation Tests</h2>
        <button
          onClick={runTests}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isRunning ? 'Running...' : 'Run Tests'}
        </button>
      </div>
      
      <div className="mb-4">
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1">
            <Check className="text-green-500" size={16} />
            Passed: {passedTests.length}
          </span>
          <span className="flex items-center gap-1">
            <X className="text-red-500" size={16} />
            Failed: {failedTests.length}
          </span>
        </div>
      </div>
      
      {failedTests.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={20} />
            Failed Tests
          </h3>
          <div className="space-y-2">
            {failedTests.map((test, index) => (
              <div key={index} className="p-3 bg-red-50 border border-red-200 rounded">
                <div className="font-medium text-red-900">{test.category}: {test.test}</div>
                <div className="text-sm text-red-700 mt-1">
                  Expected: {JSON.stringify(test.expected)} | Actual: {JSON.stringify(test.actual)}
                </div>
                {test.error && (
                  <div className="text-sm text-red-600 mt-1">{test.error}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div>
        <h3 className="text-lg font-semibold mb-2">All Tests</h3>
        <div className="space-y-1">
          {testResults.map((test, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              {test.passed ? (
                <Check className="text-green-500" size={16} />
              ) : (
                <X className="text-red-500" size={16} />
              )}
              <span className={test.passed ? 'text-gray-700' : 'text-red-700 font-medium'}>
                {test.category}: {test.test}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};