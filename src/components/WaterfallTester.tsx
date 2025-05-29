import React, { useState } from 'react';
import { calculateWaterfallDistribution, validateWaterfallDistribution } from '../utils/waterfallValidator';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

const WaterfallTester: React.FC = () => {
  const [testCase, setTestCase] = useState({
    totalDistributions: 2000000,
    initialEquity: 1000000,
    holdPeriod: 5,
    projectIRR: 15,
  });

  const equityStructure = {
    lpEquity: 90,
    gpEquity: 10,
    preferredReturn: 8,
    gpCoinvest: 10,
    catchUp: true,
    catchUpPercentage: 50,
    clawback: true,
  };

  const waterfallTiers = [
    { minIRR: 0, maxIRR: 8, lpShare: 90, gpShare: 10 },
    { minIRR: 8, maxIRR: 12, lpShare: 80, gpShare: 20 },
    { minIRR: 12, maxIRR: 15, lpShare: 70, gpShare: 30 },
    { minIRR: 15, maxIRR: 100, lpShare: 60, gpShare: 40 },
  ];

  const result = calculateWaterfallDistribution(
    testCase.totalDistributions,
    testCase.initialEquity,
    equityStructure,
    waterfallTiers,
    testCase.holdPeriod,
    testCase.projectIRR
  );

  const validation = validateWaterfallDistribution(
    testCase.totalDistributions,
    testCase.initialEquity,
    equityStructure,
    waterfallTiers,
    testCase.holdPeriod,
    testCase.projectIRR
  );

  const testScenarios = [
    {
      name: "Below Preferred (6% IRR)",
      totalDist: 300000,
      equity: 1000000,
      period: 5,
      irr: 6,
      description: "All distributions go to preferred return pro-rata"
    },
    {
      name: "At Preferred (8% IRR)",
      totalDist: 400000,
      equity: 1000000,
      period: 5,
      irr: 8,
      description: "Exactly meets preferred return"
    },
    {
      name: "With Catch-up (10% IRR)",
      totalDist: 600000,
      equity: 1000000,
      period: 5,
      irr: 10,
      description: "GP gets catch-up after preferred"
    },
    {
      name: "High Return (20% IRR)",
      totalDist: 2500000,
      equity: 1000000,
      period: 5,
      irr: 20,
      description: "Highest waterfall tier applies"
    },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6">Waterfall Distribution Tester</h2>
        
        {/* Current Test Case */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-4">Test Parameters</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Distributions
              </label>
              <input
                type="number"
                value={testCase.totalDistributions}
                onChange={(e) => setTestCase({...testCase, totalDistributions: Number(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Initial Equity
              </label>
              <input
                type="number"
                value={testCase.initialEquity}
                onChange={(e) => setTestCase({...testCase, initialEquity: Number(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hold Period (years)
              </label>
              <input
                type="number"
                value={testCase.holdPeriod}
                onChange={(e) => setTestCase({...testCase, holdPeriod: Number(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project IRR (%)
              </label>
              <input
                type="number"
                value={testCase.projectIRR}
                onChange={(e) => setTestCase({...testCase, projectIRR: Number(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Validation Results */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            Validation Results
            {validation.isValid ? (
              <CheckCircle className="text-green-600" size={20} />
            ) : (
              <AlertTriangle className="text-red-600" size={20} />
            )}
          </h3>
          
          {validation.errors.length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-medium text-red-600 mb-1">Errors:</p>
              <ul className="list-disc list-inside text-sm text-red-600">
                {validation.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {validation.warnings.length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-medium text-orange-600 mb-1">Warnings:</p>
              <ul className="list-disc list-inside text-sm text-orange-600">
                {validation.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Distribution Steps */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Distribution Waterfall Steps</h3>
          <div className="space-y-2">
            {result.steps.map((step, i) => (
              <div key={i} className="p-3 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{step.step}</p>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${step.amount.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">
                      Remaining: ${step.remaining.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Final Distribution */}
        <div className="mb-6 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold mb-3">Final Distribution</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">LP Distribution</p>
              <p className="text-2xl font-bold">${result.distributions.lp.toLocaleString()}</p>
              <p className="text-sm text-gray-600">{result.lpPercentage.toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">GP Distribution</p>
              <p className="text-2xl font-bold">${result.distributions.gp.toLocaleString()}</p>
              <p className="text-sm text-gray-600">{result.gpPercentage.toFixed(2)}%</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t">
            <p className="text-sm text-gray-600">Total Distributed</p>
            <p className="text-xl font-bold">${result.totalDistributed.toLocaleString()}</p>
          </div>
        </div>

        {/* Test Scenarios */}
        <div>
          <h3 className="font-semibold mb-3">Quick Test Scenarios</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {testScenarios.map((scenario, i) => (
              <button
                key={i}
                onClick={() => setTestCase({
                  totalDistributions: scenario.totalDist,
                  initialEquity: scenario.equity,
                  holdPeriod: scenario.period,
                  projectIRR: scenario.irr,
                })}
                className="p-3 border rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <p className="font-medium">{scenario.name}</p>
                <p className="text-sm text-gray-600">{scenario.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Waterfall Structure */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Info size={20} />
            Current Waterfall Structure
          </h3>
          <div className="space-y-2">
            <p className="text-sm"><strong>Preferred Return:</strong> {equityStructure.preferredReturn}%</p>
            <p className="text-sm"><strong>LP/GP Split:</strong> {equityStructure.lpEquity}% / {equityStructure.gpEquity}%</p>
            <p className="text-sm"><strong>GP Co-invest:</strong> {equityStructure.gpCoinvest}%</p>
            <p className="text-sm"><strong>Catch-up:</strong> {equityStructure.catchUp ? `Yes (${equityStructure.catchUpPercentage}%)` : 'No'}</p>
            <div className="mt-2">
              <p className="text-sm font-medium mb-1">Waterfall Tiers:</p>
              <div className="text-sm space-y-1">
                {waterfallTiers.map((tier, i) => (
                  <p key={i}>
                    {tier.minIRR}-{tier.maxIRR}% IRR: {tier.lpShare}% LP / {tier.gpShare}% GP
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaterfallTester;