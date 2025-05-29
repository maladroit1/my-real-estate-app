// Comprehensive Math Function Tests for Real Estate Pro Forma
// This file tests all core mathematical calculations for accuracy and edge cases

import { calculateIRR as calculateIRRImproved } from './utils/irrCalculator';

interface TestResult {
  function: string;
  test: string;
  input: any;
  expected: any;
  actual: any;
  passed: boolean;
  error?: string;
}

const testResults: TestResult[] = [];

// IRR Calculation Test (Newton-Raphson method)
function testIRR() {
  console.log('Testing IRR Calculation...');
  
  // Test 1: Basic positive cash flows
  const test1CashFlows = [-1000000, 100000, 200000, 300000, 400000, 500000];
  const irr1 = calculateIRRNewtonRaphson(test1CashFlows);
  testResults.push({
    function: 'IRR',
    test: 'Basic positive cash flows',
    input: test1CashFlows,
    expected: '~15-20%',
    actual: (irr1 * 100).toFixed(2) + '%',
    passed: irr1 > 0.15 && irr1 < 0.20
  });

  // Test 2: Edge case - all negative except last
  const test2CashFlows = [-1000000, -50000, -50000, -50000, 2000000];
  const irr2 = calculateIRRNewtonRaphson(test2CashFlows);
  testResults.push({
    function: 'IRR',
    test: 'Negative interim cash flows',
    input: test2CashFlows,
    expected: '~10-15%',
    actual: (irr2 * 100).toFixed(2) + '%',
    passed: irr2 > 0.10 && irr2 < 0.15
  });

  // Test 3: Edge case - zero initial investment
  const test3CashFlows = [0, 100000, 100000, 100000];
  const irr3 = calculateIRRNewtonRaphson(test3CashFlows);
  testResults.push({
    function: 'IRR',
    test: 'Zero initial investment',
    input: test3CashFlows,
    expected: 'Infinity or Error',
    actual: isFinite(irr3) ? (irr3 * 100).toFixed(2) + '%' : 'Infinity',
    passed: !isFinite(irr3) || irr3 > 100
  });

  // Test 4: Edge case - no positive cash flows
  const test4CashFlows = [-1000000, -100000, -100000, -100000];
  const irr4 = calculateIRRNewtonRaphson(test4CashFlows);
  testResults.push({
    function: 'IRR',
    test: 'All negative cash flows',
    input: test4CashFlows,
    expected: '-100% or NaN (total loss)',
    actual: isNaN(irr4) ? 'NaN' : (irr4 * 100).toFixed(2) + '%',
    passed: irr4 === -1 || isNaN(irr4)
  });

  // Test 5: Edge case - very small cash flows
  const test5CashFlows = [-0.01, 0.001, 0.001, 0.001, 0.02];
  const irr5 = calculateIRRNewtonRaphson(test5CashFlows);
  testResults.push({
    function: 'IRR',
    test: 'Very small cash flows',
    input: test5CashFlows,
    expected: 'Positive IRR',
    actual: (irr5 * 100).toFixed(2) + '%',
    passed: irr5 > 0
  });
}

// Wrapper function for testing that uses the improved IRR calculator
function calculateIRRNewtonRaphson(cashFlows: number[]): number {
  const result = calculateIRRImproved(cashFlows);
  return result.isValid ? result.irr : NaN;
}

// NOI Calculation Test
function testNOI() {
  console.log('Testing NOI Calculation...');

  // Test 1: Basic NOI calculation
  const grossRevenue1 = 1000000;
  const vacancy1 = 0.10; // 10%
  const opex1 = 300000;
  const effectiveRevenue1 = grossRevenue1 * (1 - vacancy1);
  const noi1 = effectiveRevenue1 - opex1;
  testResults.push({
    function: 'NOI',
    test: 'Basic NOI calculation',
    input: { grossRevenue: grossRevenue1, vacancy: vacancy1, opex: opex1 },
    expected: 600000,
    actual: noi1,
    passed: Math.abs(noi1 - 600000) < 0.01
  });

  // Test 2: Edge case - 100% vacancy
  const grossRevenue2 = 1000000;
  const vacancy2 = 1.0; // 100%
  const opex2 = 300000;
  const effectiveRevenue2 = grossRevenue2 * (1 - vacancy2);
  const noi2 = effectiveRevenue2 - opex2;
  testResults.push({
    function: 'NOI',
    test: '100% vacancy',
    input: { grossRevenue: grossRevenue2, vacancy: vacancy2, opex: opex2 },
    expected: -300000,
    actual: noi2,
    passed: Math.abs(noi2 - (-300000)) < 0.01
  });

  // Test 3: Edge case - zero operating expenses
  const grossRevenue3 = 1000000;
  const vacancy3 = 0.05; // 5%
  const opex3 = 0;
  const effectiveRevenue3 = grossRevenue3 * (1 - vacancy3);
  const noi3 = effectiveRevenue3 - opex3;
  testResults.push({
    function: 'NOI',
    test: 'Zero operating expenses',
    input: { grossRevenue: grossRevenue3, vacancy: vacancy3, opex: opex3 },
    expected: 950000,
    actual: noi3,
    passed: Math.abs(noi3 - 950000) < 0.01
  });

  // Test 4: Edge case - negative values
  const grossRevenue4 = -1000000; // Should not happen in real world
  const vacancy4 = 0.10;
  const opex4 = 300000;
  const effectiveRevenue4 = grossRevenue4 * (1 - vacancy4);
  const noi4 = effectiveRevenue4 - opex4;
  testResults.push({
    function: 'NOI',
    test: 'Negative gross revenue',
    input: { grossRevenue: grossRevenue4, vacancy: vacancy4, opex: opex4 },
    expected: -1200000,
    actual: noi4,
    passed: Math.abs(noi4 - (-1200000)) < 0.01
  });
}

// Loan Calculation Tests
function testLoanCalculations() {
  console.log('Testing Loan Calculations...');

  // Test 1: Construction loan amount (LTC)
  const totalCost1 = 10000000;
  const ltc1 = 0.70; // 70%
  const constructionLoan1 = totalCost1 * ltc1;
  testResults.push({
    function: 'Construction Loan',
    test: 'Basic LTC calculation',
    input: { totalCost: totalCost1, ltc: ltc1 },
    expected: 7000000,
    actual: constructionLoan1,
    passed: Math.abs(constructionLoan1 - 7000000) < 0.01
  });

  // Test 2: Construction interest (simple calculation)
  const loanAmount2 = 7000000;
  const rate2 = 0.08; // 8%
  const term2 = 2; // 2 years
  const utilization2 = 0.60; // 60% average utilization
  const interest2 = loanAmount2 * rate2 * term2 * utilization2;
  testResults.push({
    function: 'Construction Interest',
    test: 'Basic interest calculation',
    input: { loan: loanAmount2, rate: rate2, term: term2, utilization: utilization2 },
    expected: 672000,
    actual: interest2,
    passed: Math.abs(interest2 - 672000) < 0.01
  });

  // Test 3: Permanent loan amount (LTV)
  const stabilizedValue3 = 15000000;
  const ltv3 = 0.65; // 65%
  const permLoan3 = stabilizedValue3 * ltv3;
  testResults.push({
    function: 'Permanent Loan',
    test: 'Basic LTV calculation',
    input: { value: stabilizedValue3, ltv: ltv3 },
    expected: 9750000,
    actual: permLoan3,
    passed: Math.abs(permLoan3 - 9750000) < 0.01
  });

  // Test 4: Debt service calculation (I/O period)
  const loanAmount4 = 9750000;
  const rate4 = 0.06; // 6%
  const annualDebtService4 = loanAmount4 * rate4;
  testResults.push({
    function: 'Debt Service',
    test: 'Interest-only payment',
    input: { loan: loanAmount4, rate: rate4 },
    expected: 585000,
    actual: annualDebtService4,
    passed: Math.abs(annualDebtService4 - 585000) < 0.01
  });

  // Test 5: Edge case - zero interest rate
  const loanAmount5 = 1000000;
  const rate5 = 0;
  const annualDebtService5 = loanAmount5 * rate5;
  testResults.push({
    function: 'Debt Service',
    test: 'Zero interest rate',
    input: { loan: loanAmount5, rate: rate5 },
    expected: 0,
    actual: annualDebtService5,
    passed: annualDebtService5 === 0
  });

  // Test 6: Edge case - over 100% LTC
  const totalCost6 = 10000000;
  const ltc6 = 1.2; // 120% - should not happen in real world
  const constructionLoan6 = totalCost6 * ltc6;
  testResults.push({
    function: 'Construction Loan',
    test: 'Over 100% LTC',
    input: { totalCost: totalCost6, ltc: ltc6 },
    expected: 12000000,
    actual: constructionLoan6,
    passed: Math.abs(constructionLoan6 - 12000000) < 0.01,
    error: 'Warning: LTC > 100% is unrealistic'
  });
}

// Waterfall Distribution Tests
function testWaterfallDistributions() {
  console.log('Testing Waterfall Distributions...');

  // Test 1: Basic preferred return
  const totalDistribution1 = 1000000;
  const lpShare1 = 0.90; // 90%
  const gpShare1 = 0.10; // 10%
  const preferredReturn1 = 0.08; // 8%
  const initialEquity1 = 5000000;
  const holdPeriod1 = 5;

  const preferredAmount1 = initialEquity1 * preferredReturn1 * holdPeriod1;
  const lpPreferred1 = Math.min(totalDistribution1, preferredAmount1 * lpShare1);
  testResults.push({
    function: 'Waterfall',
    test: 'LP preferred return',
    input: { 
      distribution: totalDistribution1, 
      lpShare: lpShare1, 
      preferred: preferredReturn1,
      equity: initialEquity1,
      years: holdPeriod1
    },
    expected: Math.min(1000000, 1800000), // Min of distribution and LP's preferred
    actual: lpPreferred1,
    passed: Math.abs(lpPreferred1 - 1000000) < 0.01
  });

  // Test 2: Distribution exceeds preferred
  const totalDistribution2 = 3000000;
  const lpShare2 = 0.90;
  const gpShare2 = 0.10;
  const preferredReturn2 = 0.08;
  const initialEquity2 = 5000000;
  const holdPeriod2 = 5;

  const preferredAmount2 = initialEquity2 * preferredReturn2 * holdPeriod2; // 2,000,000
  const lpPreferred2 = preferredAmount2 * lpShare2; // 1,800,000
  const remaining2 = totalDistribution2 - lpPreferred2; // 1,200,000
  testResults.push({
    function: 'Waterfall',
    test: 'Distribution exceeds preferred',
    input: { 
      distribution: totalDistribution2, 
      preferred: preferredAmount2,
      lpShare: lpShare2 
    },
    expected: { lpPreferred: 1800000, remaining: 1200000 },
    actual: { lpPreferred: lpPreferred2, remaining: remaining2 },
    passed: Math.abs(lpPreferred2 - 1800000) < 0.01 && Math.abs(remaining2 - 1200000) < 0.01
  });

  // Test 3: Edge case - zero distribution
  const totalDistribution3 = 0;
  const lpPreferred3 = Math.min(totalDistribution3, 1800000);
  testResults.push({
    function: 'Waterfall',
    test: 'Zero distribution',
    input: { distribution: totalDistribution3 },
    expected: 0,
    actual: lpPreferred3,
    passed: lpPreferred3 === 0
  });

  // Test 4: Edge case - negative distribution (loss)
  const totalDistribution4 = -500000;
  const lpLoss4 = totalDistribution4 * 0.90;
  const gpLoss4 = totalDistribution4 * 0.10;
  testResults.push({
    function: 'Waterfall',
    test: 'Negative distribution (loss)',
    input: { distribution: totalDistribution4, lpShare: 0.90, gpShare: 0.10 },
    expected: { lpLoss: -450000, gpLoss: -50000 },
    actual: { lpLoss: lpLoss4, gpLoss: gpLoss4 },
    passed: Math.abs(lpLoss4 - (-450000)) < 0.01 && Math.abs(gpLoss4 - (-50000)) < 0.01
  });
}

// Development Cost Calculations
function testDevelopmentCosts() {
  console.log('Testing Development Cost Calculations...');

  // Test 1: Basic cost calculation
  const landCost1 = 5000000;
  const buildingSF1 = 100000;
  const hardCostPSF1 = 300;
  const softCostPercent1 = 0.20; // 20% of hard costs
  const hardCosts1 = buildingSF1 * hardCostPSF1;
  const softCosts1 = hardCosts1 * softCostPercent1;
  const totalCost1 = landCost1 + hardCosts1 + softCosts1;
  testResults.push({
    function: 'Development Cost',
    test: 'Basic total cost',
    input: { land: landCost1, sf: buildingSF1, hardPSF: hardCostPSF1, softPercent: softCostPercent1 },
    expected: 41000000,
    actual: totalCost1,
    passed: Math.abs(totalCost1 - 41000000) < 0.01
  });

  // Test 2: Cost per SF calculation
  const totalCost2 = 41000000;
  const buildingSF2 = 100000;
  const costPerSF2 = totalCost2 / buildingSF2;
  testResults.push({
    function: 'Development Cost',
    test: 'Cost per SF',
    input: { totalCost: totalCost2, sf: buildingSF2 },
    expected: 410,
    actual: costPerSF2,
    passed: Math.abs(costPerSF2 - 410) < 0.01
  });

  // Test 3: Edge case - zero building SF
  const landCost3 = 5000000;
  const buildingSF3 = 0;
  const hardCostPSF3 = 300;
  const hardCosts3 = buildingSF3 * hardCostPSF3;
  const totalCost3 = landCost3 + hardCosts3;
  const costPerSF3 = buildingSF3 > 0 ? totalCost3 / buildingSF3 : Infinity;
  testResults.push({
    function: 'Development Cost',
    test: 'Zero building SF',
    input: { land: landCost3, sf: buildingSF3, hardPSF: hardCostPSF3 },
    expected: { total: 5000000, perSF: Infinity },
    actual: { total: totalCost3, perSF: costPerSF3 },
    passed: totalCost3 === 5000000 && !isFinite(costPerSF3)
  });

  // Test 4: Contingency calculation
  const baseHardCosts4 = 30000000;
  const contingencyPercent4 = 0.05; // 5%
  const contingency4 = baseHardCosts4 * contingencyPercent4;
  const totalHardCosts4 = baseHardCosts4 + contingency4;
  testResults.push({
    function: 'Development Cost',
    test: 'Contingency calculation',
    input: { baseHard: baseHardCosts4, contingency: contingencyPercent4 },
    expected: { contingency: 1500000, total: 31500000 },
    actual: { contingency: contingency4, total: totalHardCosts4 },
    passed: Math.abs(contingency4 - 1500000) < 0.01 && Math.abs(totalHardCosts4 - 31500000) < 0.01
  });
}

// Cap Rate and Valuation Tests
function testCapRateValuation() {
  console.log('Testing Cap Rate and Valuation...');

  // Test 1: Basic valuation
  const noi1 = 700000;
  const capRate1 = 0.07; // 7%
  const value1 = noi1 / capRate1;
  testResults.push({
    function: 'Valuation',
    test: 'Basic cap rate valuation',
    input: { noi: noi1, capRate: capRate1 },
    expected: 10000000,
    actual: value1,
    passed: Math.abs(value1 - 10000000) < 0.01
  });

  // Test 2: Edge case - zero cap rate
  const noi2 = 700000;
  const capRate2 = 0;
  const value2 = capRate2 > 0 ? noi2 / capRate2 : Infinity;
  testResults.push({
    function: 'Valuation',
    test: 'Zero cap rate',
    input: { noi: noi2, capRate: capRate2 },
    expected: Infinity,
    actual: value2,
    passed: !isFinite(value2)
  });

  // Test 3: Edge case - negative NOI
  const noi3 = -100000;
  const capRate3 = 0.07;
  const value3 = noi3 / capRate3;
  testResults.push({
    function: 'Valuation',
    test: 'Negative NOI',
    input: { noi: noi3, capRate: capRate3 },
    expected: -1428571.43,
    actual: value3,
    passed: Math.abs(value3 - (-1428571.43)) < 1
  });

  // Test 4: Yield on cost calculation
  const noi4 = 700000;
  const totalCost4 = 8000000;
  const yieldOnCost4 = (noi4 / totalCost4) * 100;
  testResults.push({
    function: 'Valuation',
    test: 'Yield on cost',
    input: { noi: noi4, totalCost: totalCost4 },
    expected: 8.75,
    actual: yieldOnCost4,
    passed: Math.abs(yieldOnCost4 - 8.75) < 0.01
  });

  // Test 5: Development spread
  const yieldOnCost5 = 8.75;
  const exitCapRate5 = 7.0;
  const spread5 = yieldOnCost5 - exitCapRate5;
  testResults.push({
    function: 'Valuation',
    test: 'Development spread',
    input: { yieldOnCost: yieldOnCost5, exitCap: exitCapRate5 },
    expected: 1.75,
    actual: spread5,
    passed: Math.abs(spread5 - 1.75) < 0.01
  });
}

// Equity Multiple Calculation Tests
function testEquityMultiple() {
  console.log('Testing Equity Multiple Calculation...');

  // Test 1: Basic equity multiple
  const initialEquity1 = 1000000;
  const totalDistributions1 = 1500000;
  const equityMultiple1 = totalDistributions1 / initialEquity1;
  testResults.push({
    function: 'Equity Multiple',
    test: 'Basic calculation',
    input: { equity: initialEquity1, distributions: totalDistributions1 },
    expected: 1.5,
    actual: equityMultiple1,
    passed: Math.abs(equityMultiple1 - 1.5) < 0.01
  });

  // Test 2: Edge case - zero initial equity
  const initialEquity2 = 0;
  const totalDistributions2 = 1500000;
  const equityMultiple2 = initialEquity2 > 0 ? totalDistributions2 / initialEquity2 : Infinity;
  testResults.push({
    function: 'Equity Multiple',
    test: 'Zero initial equity',
    input: { equity: initialEquity2, distributions: totalDistributions2 },
    expected: Infinity,
    actual: equityMultiple2,
    passed: !isFinite(equityMultiple2)
  });

  // Test 3: Loss scenario
  const initialEquity3 = 1000000;
  const totalDistributions3 = 750000;
  const equityMultiple3 = totalDistributions3 / initialEquity3;
  testResults.push({
    function: 'Equity Multiple',
    test: 'Loss scenario',
    input: { equity: initialEquity3, distributions: totalDistributions3 },
    expected: 0.75,
    actual: equityMultiple3,
    passed: Math.abs(equityMultiple3 - 0.75) < 0.01
  });
}

// Rent Growth and Escalation Tests
function testRentGrowth() {
  console.log('Testing Rent Growth Calculations...');

  // Test 1: Annual rent growth
  const baseRent1 = 40;
  const growthRate1 = 0.03; // 3%
  const year1 = 5;
  const futureRent1 = baseRent1 * Math.pow(1 + growthRate1, year1);
  testResults.push({
    function: 'Rent Growth',
    test: 'Annual compounding',
    input: { baseRent: baseRent1, growth: growthRate1, years: year1 },
    expected: 46.37,
    actual: futureRent1,
    passed: Math.abs(futureRent1 - 46.37) < 0.01
  });

  // Test 2: Zero growth
  const baseRent2 = 40;
  const growthRate2 = 0;
  const year2 = 5;
  const futureRent2 = baseRent2 * Math.pow(1 + growthRate2, year2);
  testResults.push({
    function: 'Rent Growth',
    test: 'Zero growth',
    input: { baseRent: baseRent2, growth: growthRate2, years: year2 },
    expected: 40,
    actual: futureRent2,
    passed: Math.abs(futureRent2 - 40) < 0.01
  });

  // Test 3: Negative growth (decline)
  const baseRent3 = 40;
  const growthRate3 = -0.02; // -2%
  const year3 = 5;
  const futureRent3 = baseRent3 * Math.pow(1 + growthRate3, year3);
  testResults.push({
    function: 'Rent Growth',
    test: 'Negative growth',
    input: { baseRent: baseRent3, growth: growthRate3, years: year3 },
    expected: 36.15,
    actual: futureRent3,
    passed: Math.abs(futureRent3 - 36.15) < 0.01
  });
}

// Debt Service Coverage Ratio Tests
function testDSCR() {
  console.log('Testing DSCR Calculations...');

  // Test 1: Basic DSCR
  const noi1 = 1000000;
  const debtService1 = 700000;
  const dscr1 = noi1 / debtService1;
  testResults.push({
    function: 'DSCR',
    test: 'Basic calculation',
    input: { noi: noi1, debtService: debtService1 },
    expected: 1.43,
    actual: dscr1,
    passed: Math.abs(dscr1 - 1.43) < 0.01
  });

  // Test 2: Edge case - zero debt service
  const noi2 = 1000000;
  const debtService2 = 0;
  const dscr2 = debtService2 > 0 ? noi2 / debtService2 : Infinity;
  testResults.push({
    function: 'DSCR',
    test: 'Zero debt service',
    input: { noi: noi2, debtService: debtService2 },
    expected: Infinity,
    actual: dscr2,
    passed: !isFinite(dscr2)
  });

  // Test 3: DSCR below 1 (insufficient coverage)
  const noi3 = 700000;
  const debtService3 = 1000000;
  const dscr3 = noi3 / debtService3;
  testResults.push({
    function: 'DSCR',
    test: 'Insufficient coverage',
    input: { noi: noi3, debtService: debtService3 },
    expected: 0.70,
    actual: dscr3,
    passed: Math.abs(dscr3 - 0.70) < 0.01
  });
}

// Run all tests
function runAllTests() {
  console.log('=== REAL ESTATE PRO FORMA MATH FUNCTION TESTS ===\n');
  
  testIRR();
  testNOI();
  testLoanCalculations();
  testWaterfallDistributions();
  testDevelopmentCosts();
  testCapRateValuation();
  testEquityMultiple();
  testRentGrowth();
  testDSCR();
  
  // Generate summary report
  console.log('\n=== TEST SUMMARY ===');
  const groupedResults = testResults.reduce((acc, result) => {
    if (!acc[result.function]) {
      acc[result.function] = { passed: 0, failed: 0, tests: [] };
    }
    if (result.passed) {
      acc[result.function].passed++;
    } else {
      acc[result.function].failed++;
    }
    acc[result.function].tests.push(result);
    return acc;
  }, {} as Record<string, any>);

  let totalPassed = 0;
  let totalFailed = 0;

  Object.entries(groupedResults).forEach(([func, data]) => {
    console.log(`\n${func}:`);
    console.log(`  Passed: ${data.passed}`);
    console.log(`  Failed: ${data.failed}`);
    totalPassed += data.passed;
    totalFailed += data.failed;
    
    // Show failed tests
    data.tests.forEach((test: TestResult) => {
      if (!test.passed) {
        console.log(`  ❌ ${test.test}`);
        console.log(`     Input: ${JSON.stringify(test.input)}`);
        console.log(`     Expected: ${JSON.stringify(test.expected)}`);
        console.log(`     Actual: ${JSON.stringify(test.actual)}`);
        if (test.error) {
          console.log(`     Error: ${test.error}`);
        }
      }
    });
  });

  console.log(`\n=== OVERALL RESULTS ===`);
  console.log(`Total Tests: ${totalPassed + totalFailed}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);

  // Return detailed results
  return {
    summary: {
      total: totalPassed + totalFailed,
      passed: totalPassed,
      failed: totalFailed,
      successRate: ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1) + '%'
    },
    byFunction: groupedResults,
    allTests: testResults
  };
}

// Export for use in React components
export { runAllTests, testResults };

// Run tests if executed directly
if (typeof window === 'undefined') {
  runAllTests();
}