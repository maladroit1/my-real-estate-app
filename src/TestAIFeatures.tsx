import React from 'react';
import { Brain, AlertTriangle } from 'lucide-react';

const TestAIFeatures: React.FC = () => {
  const testScenario = {
    propertyInfo: {
      name: 'Test Property',
      address: '123 Test St, Los Angeles, CA',
      propertyType: 'multifamily',
      grossArea: 50000,
      netRentableArea: 60000, // Error: exceeds gross area
      units: 50
    },
    acquisition: {
      purchasePrice: 10000000,
      closingCosts: 200000,
      renovationCosts: 1000000,
      acquisitionDate: new Date()
    },
    financing: {
      loanAmount: 9500000, // Warning: 95% LTV is too high
      interestRate: 7.5,
      term: 30
    },
    income: {
      baseRent: 1200000,
      vacancy: 35 // Warning: High vacancy rate
    },
    assumptions: {
      rentGrowth: 15, // Warning: Aggressive rent growth
      exitCapRate: 2 // Error: Unrealistic cap rate
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">AI Features Test Dashboard</h1>
      
      <div className="grid gap-6">
        {/* Test Scenario Summary */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Test Scenario</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Property:</strong> {testScenario.propertyInfo.propertyType}
            </div>
            <div>
              <strong>Purchase Price:</strong> ${testScenario.acquisition.purchasePrice.toLocaleString()}
            </div>
            <div>
              <strong>LTV:</strong> {((testScenario.financing.loanAmount / testScenario.acquisition.purchasePrice) * 100).toFixed(1)}%
            </div>
            <div>
              <strong>Vacancy:</strong> {testScenario.income.vacancy}%
            </div>
          </div>
        </div>

        {/* Expected Validation Results */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="text-yellow-600" />
            Expected Validation Results
          </h2>
          <div className="space-y-3">
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <strong className="text-red-700">Critical Error:</strong>
              <p className="text-sm">Net rentable area (60,000 SF) exceeds gross area (50,000 SF)</p>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <strong className="text-red-700">High Error:</strong>
              <p className="text-sm">Exit cap rate of 2% is unrealistic (typical range: 4-10%)</p>
            </div>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
              <strong className="text-yellow-700">High Warning:</strong>
              <p className="text-sm">LTV of 95% exceeds typical lending limits (max 75-80%)</p>
            </div>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
              <strong className="text-yellow-700">Medium Warning:</strong>
              <p className="text-sm">Vacancy rate of 35% is high for multifamily (typical: 5-10%)</p>
            </div>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
              <strong className="text-yellow-700">Medium Warning:</strong>
              <p className="text-sm">Rent growth of 15% is aggressive (market average: 2-4%)</p>
            </div>
          </div>
        </div>

        {/* AI Features Status */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Brain className="text-purple-600" />
            AI Features Status
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span>Error Detection Service</span>
              <span className="text-green-600 font-medium">✓ Integrated</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span>AI Insights</span>
              <span className="text-green-600 font-medium">✓ Integrated</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span>Real-time Validation</span>
              <span className="text-green-600 font-medium">✓ Active</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span>Claude API Integration</span>
              <span className="text-yellow-600 font-medium">⚠ Requires API Key</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">Testing Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700">
            <li>Navigate to the main app (V2 Pro Forma)</li>
            <li>The Error Overview panel should appear in the results section</li>
            <li>Enter the test values above to trigger validation errors</li>
            <li>Click the "AI Insights" button to test Claude integration</li>
            <li>If prompted, enter your Claude API key</li>
            <li>Verify that errors, warnings, and suggestions appear correctly</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default TestAIFeatures;