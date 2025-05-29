import React from 'react';
import { calculateIRR, formatIRR } from '../utils/irrCalculator';

const IRRTestCases: React.FC = () => {
  const testCases = [
    {
      name: "Basic positive cash flows",
      cashFlows: [-1000000, 100000, 200000, 300000, 400000, 500000],
      expected: "15-20%"
    },
    {
      name: "Negative interim cash flows",
      cashFlows: [-1000000, -50000, -50000, -50000, 2000000],
      expected: "10-15%"
    },
    {
      name: "All negative cash flows",
      cashFlows: [-1000000, -100000, -100000, -100000],
      expected: "-100% (total loss)"
    },
    {
      name: "Zero initial investment",
      cashFlows: [0, 100000, 100000, 100000],
      expected: "Infinite return"
    },
    {
      name: "Very small cash flows",
      cashFlows: [-0.01, 0.001, 0.001, 0.001, 0.02],
      expected: "Positive IRR"
    },
    {
      name: "Real estate example",
      cashFlows: [-5000000, 200000, 220000, 242000, 266200, 8000000],
      expected: "~20-25%"
    }
  ];

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">IRR Calculation Test Cases</h3>
      <div className="space-y-3">
        {testCases.map((testCase, index) => {
          const result = calculateIRR(testCase.cashFlows);
          const formattedIRR = formatIRR(result);
          
          return (
            <div key={index} className="border rounded p-3">
              <h4 className="font-medium">{testCase.name}</h4>
              <p className="text-sm text-gray-600">
                Cash flows: [{testCase.cashFlows.join(', ')}]
              </p>
              <p className="text-sm text-gray-600">
                Expected: {testCase.expected}
              </p>
              <p className="text-sm font-medium">
                Actual: {formattedIRR}%
                {result.message && (
                  <span className="text-gray-500 ml-2">({result.message})</span>
                )}
              </p>
              <p className={`text-sm ${result.isValid ? 'text-green-600' : 'text-red-600'}`}>
                Status: {result.isValid ? 'Valid' : 'Invalid'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IRRTestCases;