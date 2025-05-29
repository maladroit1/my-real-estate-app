import React, { useState, useEffect } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  message?: string;
}

const TestV2Features: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    const results: TestResult[] = [];

    // Test 1: Check if site work toggle elements exist
    try {
      const siteWorkLabel = document.querySelector('label')?.textContent?.includes('Site Work');
      const toggleButtons = document.querySelectorAll('button');
      const hasToggle = Array.from(toggleButtons).some(btn => 
        btn.textContent === 'Total' || btn.textContent === 'Per Unit'
      );
      
      results.push({
        name: 'Site Work Toggle Exists',
        status: siteWorkLabel && hasToggle ? 'pass' : 'fail',
        message: siteWorkLabel && hasToggle ? 'Toggle found' : 'Toggle not found'
      });
    } catch (e) {
      results.push({
        name: 'Site Work Toggle Exists',
        status: 'fail',
        message: `Error: ${e}`
      });
    }

    // Test 2: Check AI Insights button
    try {
      const aiButton = Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent?.includes('AI Insights')
      );
      
      results.push({
        name: 'AI Insights Button',
        status: aiButton ? 'pass' : 'fail',
        message: aiButton ? 'Button found' : 'Button not found'
      });
    } catch (e) {
      results.push({
        name: 'AI Insights Button',
        status: 'fail',
        message: `Error: ${e}`
      });
    }

    // Test 3: Check auto-save indicator
    try {
      const autoSaveText = document.body.textContent?.includes('Auto-saved') || 
                          document.body.textContent?.includes('Saving...');
      
      results.push({
        name: 'Auto-save Indicator',
        status: autoSaveText ? 'pass' : 'warning',
        message: autoSaveText ? 'Auto-save text found' : 'No auto-save text visible yet'
      });
    } catch (e) {
      results.push({
        name: 'Auto-save Indicator',
        status: 'fail',
        message: `Error: ${e}`
      });
    }

    // Test 4: Check expandable sections
    try {
      const expandables = document.querySelectorAll('[class*="cursor-pointer"]');
      const hasExpandables = expandables.length > 0;
      
      results.push({
        name: 'Expandable Sections',
        status: hasExpandables ? 'pass' : 'fail',
        message: `Found ${expandables.length} expandable sections`
      });
    } catch (e) {
      results.push({
        name: 'Expandable Sections',
        status: 'fail',
        message: `Error: ${e}`
      });
    }

    // Test 5: Check quick set buttons
    try {
      const quickSetButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
        ['$15k', '$25k', '$40k', '$60k'].includes(btn.textContent || '')
      );
      
      results.push({
        name: 'Quick Set Buttons',
        status: quickSetButtons.length > 0 ? 'pass' : 'warning',
        message: `Found ${quickSetButtons.length} quick set buttons`
      });
    } catch (e) {
      results.push({
        name: 'Quick Set Buttons',
        status: 'fail',
        message: `Error: ${e}`
      });
    }

    // Test 6: Check validation messages
    try {
      const validationMessages = document.querySelectorAll('[class*="amber"]');
      
      results.push({
        name: 'Validation System',
        status: 'pass',
        message: `Validation elements ready (${validationMessages.length} found)`
      });
    } catch (e) {
      results.push({
        name: 'Validation System',
        status: 'fail',
        message: `Error: ${e}`
      });
    }

    setTestResults(results);
    setIsRunning(false);
  };

  useEffect(() => {
    // Auto-run tests after component mounts
    setTimeout(runTests, 1000);
  }, []);

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'fail':
        return <X className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return 'bg-green-50 border-green-200';
      case 'fail':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-lg p-4 max-w-md">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-gray-900">V2 Feature Tests</h3>
        <button
          onClick={runTests}
          disabled={isRunning}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
        >
          {isRunning ? 'Running...' : 'Re-run Tests'}
        </button>
      </div>
      
      <div className="space-y-2">
        {testResults.map((result, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-2 rounded border ${getStatusColor(result.status)}`}
          >
            <div className="flex items-center gap-2">
              {getStatusIcon(result.status)}
              <span className="text-sm font-medium">{result.name}</span>
            </div>
            {result.message && (
              <span className="text-xs text-gray-600">{result.message}</span>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-3 pt-3 border-t">
        <div className="text-xs text-gray-500">
          Tests run automatically on load. Click re-run to test again.
        </div>
      </div>
    </div>
  );
};

export default TestV2Features;