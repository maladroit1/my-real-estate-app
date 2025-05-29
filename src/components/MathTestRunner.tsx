import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, Play, FileText } from 'lucide-react';
import { runAllTests } from '../mathTests';

interface TestResult {
  function: string;
  test: string;
  input: any;
  expected: any;
  actual: any;
  passed: boolean;
  error?: string;
}

const MathTestRunner: React.FC = () => {
  const [testResults, setTestResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedFunctions, setExpandedFunctions] = useState<Set<string>>(new Set());

  const runTests = async () => {
    setIsRunning(true);
    try {
      // Run tests with a small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 100));
      const results = runAllTests();
      setTestResults(results);
    } catch (error) {
      console.error('Error running tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const toggleFunction = (funcName: string) => {
    const newExpanded = new Set(expandedFunctions);
    if (newExpanded.has(funcName)) {
      newExpanded.delete(funcName);
    } else {
      newExpanded.add(funcName);
    }
    setExpandedFunctions(newExpanded);
  };

  const exportReport = () => {
    if (!testResults) return;

    const report = `REAL ESTATE PRO FORMA - MATH FUNCTION TEST REPORT
Generated: ${new Date().toLocaleString()}

=== SUMMARY ===
Total Tests: ${testResults.summary.total}
Passed: ${testResults.summary.passed}
Failed: ${testResults.summary.failed}
Success Rate: ${testResults.summary.successRate}

=== DETAILED RESULTS ===
${Object.entries(testResults.byFunction).map(([func, data]: [string, any]) => `
${func}:
  Passed: ${data.passed}
  Failed: ${data.failed}
  
${data.tests.map((test: TestResult) => `  ${test.passed ? '✓' : '✗'} ${test.test}
    Input: ${JSON.stringify(test.input)}
    Expected: ${JSON.stringify(test.expected)}
    Actual: ${JSON.stringify(test.actual)}${test.error ? `
    Error: ${test.error}` : ''}`).join('\n\n')}
`).join('\n')}`;

    // Create and download file
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `math-test-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Math Function Test Suite</h1>
          <div className="flex gap-3">
            <button
              onClick={runTests}
              disabled={isRunning}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isRunning
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Play size={16} />
              {isRunning ? 'Running Tests...' : 'Run Tests'}
            </button>
            {testResults && (
              <button
                onClick={exportReport}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                <FileText size={16} />
                Export Report
              </button>
            )}
          </div>
        </div>

        {testResults && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Total Tests</p>
                <p className="text-2xl font-bold text-gray-900">{testResults.summary.total}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-600 mb-1">Passed</p>
                <p className="text-2xl font-bold text-green-700">{testResults.summary.passed}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-sm text-red-600 mb-1">Failed</p>
                <p className="text-2xl font-bold text-red-700">{testResults.summary.failed}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-600 mb-1">Success Rate</p>
                <p className="text-2xl font-bold text-blue-700">{testResults.summary.successRate}</p>
              </div>
            </div>

            {/* Function Results */}
            <div className="space-y-4">
              {Object.entries(testResults.byFunction).map(([func, data]: [string, any]) => (
                <div key={func} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleFunction(func)}
                    className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{func}</h3>
                      <span className="text-sm text-gray-600">
                        {data.passed} passed, {data.failed} failed
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {data.failed === 0 ? (
                        <CheckCircle className="text-green-600" size={20} />
                      ) : (
                        <XCircle className="text-red-600" size={20} />
                      )}
                    </div>
                  </button>

                  {expandedFunctions.has(func) && (
                    <div className="px-4 py-3 space-y-2">
                      {data.tests.map((test: TestResult, idx: number) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg ${
                            test.passed ? 'bg-green-50' : 'bg-red-50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {test.passed ? (
                              <CheckCircle className="text-green-600 mt-0.5" size={16} />
                            ) : (
                              <XCircle className="text-red-600 mt-0.5" size={16} />
                            )}
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{test.test}</p>
                              <div className="mt-2 text-sm space-y-1">
                                <p className="text-gray-600">
                                  <span className="font-medium">Input:</span>{' '}
                                  <code className="bg-gray-100 px-1 py-0.5 rounded">
                                    {JSON.stringify(test.input)}
                                  </code>
                                </p>
                                <p className="text-gray-600">
                                  <span className="font-medium">Expected:</span>{' '}
                                  <code className="bg-gray-100 px-1 py-0.5 rounded">
                                    {JSON.stringify(test.expected)}
                                  </code>
                                </p>
                                <p className="text-gray-600">
                                  <span className="font-medium">Actual:</span>{' '}
                                  <code className="bg-gray-100 px-1 py-0.5 rounded">
                                    {JSON.stringify(test.actual)}
                                  </code>
                                </p>
                                {test.error && (
                                  <p className="text-orange-600 flex items-start gap-1">
                                    <AlertCircle size={14} className="mt-0.5" />
                                    <span>{test.error}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {!testResults && !isRunning && (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-2">Click "Run Tests" to execute the math function test suite</p>
            <p className="text-sm">This will test all core calculations for accuracy and edge cases</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MathTestRunner;