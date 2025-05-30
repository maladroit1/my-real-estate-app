import React, { useEffect, useState } from 'react';

export const TestCostBreakdown: React.FC = () => {
  const [testResults, setTestResults] = useState<any[]>([]);

  useEffect(() => {
    const runTests = async () => {
      const results = [];
      
      // Test 1: Check if Total Development Cost metric is clickable
      const devCostMetric = document.querySelector('[data-metric="Total Development Cost"]');
      results.push({
        name: 'Total Development Cost metric exists',
        passed: !!devCostMetric,
        details: devCostMetric ? 'Found clickable metric' : 'Metric not found'
      });

      // Test 2: Click on Total Development Cost to open modal
      if (devCostMetric) {
        (devCostMetric as HTMLElement).click();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const modal = document.querySelector('.metric-breakdown-modal');
        results.push({
          name: 'Modal opens on click',
          passed: !!modal,
          details: modal ? 'Modal opened successfully' : 'Modal did not open'
        });

        // Test 3: Check for Hard Costs and Soft Costs in breakdown
        const hardCostsItem = Array.from(document.querySelectorAll('.font-medium')).find(
          el => el.textContent === 'Hard Costs'
        );
        const softCostsItem = Array.from(document.querySelectorAll('.font-medium')).find(
          el => el.textContent === 'Soft Costs'
        );
        
        results.push({
          name: 'Hard Costs item visible',
          passed: !!hardCostsItem,
          details: hardCostsItem ? 'Hard Costs found in breakdown' : 'Hard Costs not found'
        });
        
        results.push({
          name: 'Soft Costs item visible',
          passed: !!softCostsItem,
          details: softCostsItem ? 'Soft Costs found in breakdown' : 'Soft Costs not found'
        });

        // Test 4: Check if Hard Costs is clickable (has hover effect)
        if (hardCostsItem) {
          const hardCostsContainer = hardCostsItem.closest('.cursor-pointer');
          results.push({
            name: 'Hard Costs is clickable',
            passed: !!hardCostsContainer,
            details: hardCostsContainer ? 'Hard Costs has clickable styling' : 'Hard Costs not clickable'
          });

          // Test 5: Click on Hard Costs to expand
          if (hardCostsContainer) {
            (hardCostsContainer as HTMLElement).click();
            await new Promise(resolve => setTimeout(resolve, 300));
            
            const expandedContent = document.querySelector('.ml-5.mt-2.space-y-1');
            results.push({
              name: 'Hard Costs expands on click',
              passed: !!expandedContent,
              details: expandedContent ? 'Detailed breakdown shown' : 'Breakdown not shown'
            });

            // Test 6: Check for specific hard cost items
            const coreShell = Array.from(document.querySelectorAll('.text-gray-700')).find(
              el => el.textContent === 'Core & Shell'
            );
            const siteWork = Array.from(document.querySelectorAll('.text-gray-700')).find(
              el => el.textContent === 'Site Work'
            );
            
            results.push({
              name: 'Hard cost details visible',
              passed: !!(coreShell || siteWork),
              details: coreShell ? 'Core & Shell found' : siteWork ? 'Site Work found' : 'No details found'
            });
          }
        }

        // Test 7: Check if Soft Costs is clickable
        if (softCostsItem) {
          const softCostsContainer = softCostsItem.closest('.cursor-pointer');
          results.push({
            name: 'Soft Costs is clickable',
            passed: !!softCostsContainer,
            details: softCostsContainer ? 'Soft Costs has clickable styling' : 'Soft Costs not clickable'
          });
        }

        // Close modal
        const closeButton = document.querySelector('[aria-label="Close"]');
        if (closeButton) {
          (closeButton as HTMLElement).click();
        }
      }

      setTestResults(results);
    };

    // Wait for page to load
    setTimeout(runTests, 2000);
  }, []);

  const passedTests = testResults.filter(r => r.passed).length;
  const totalTests = testResults.length;
  const allPassed = passedTests === totalTests;

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg max-w-md z-50">
      <h3 className="font-bold mb-2">Cost Breakdown Test Results</h3>
      <div className={`mb-2 font-semibold ${allPassed ? 'text-green-600' : 'text-red-600'}`}>
        {passedTests}/{totalTests} tests passed
      </div>
      <div className="space-y-1 max-h-60 overflow-y-auto">
        {testResults.map((result, index) => (
          <div key={index} className={`text-sm ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
            {result.passed ? '✓' : '✗'} {result.name}
            {result.details && (
              <div className="text-xs text-gray-600 ml-4">{result.details}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};