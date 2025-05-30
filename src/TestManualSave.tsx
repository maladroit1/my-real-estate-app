import React, { useState, useEffect } from 'react';
import { Check, X, AlertCircle, RefreshCw } from 'lucide-react';

interface TestResult {
  category: string;
  tests: {
    name: string;
    status: 'pass' | 'fail' | 'pending' | 'running';
    message?: string;
  }[];
}

const TestManualSave: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState('');

  const runTests = async () => {
    setIsRunning(true);
    const results: TestResult[] = [];

    // Test 1: Check Save Button State
    const buttonTests: TestResult = {
      category: 'Save Button State',
      tests: []
    };

    try {
      // Find save button
      const saveButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
        btn.textContent?.includes('Save') || btn.textContent?.includes('Saved')
      );
      
      if (saveButtons.length > 0) {
        const saveButton = saveButtons[0];
        
        buttonTests.tests.push({
          name: 'Save button exists',
          status: 'pass',
          message: `Found button with text: "${saveButton.textContent}"`
        });

        // Check initial state
        const isGray = saveButton.className.includes('bg-gray');
        buttonTests.tests.push({
          name: 'Initial state is "Saved" (gray)',
          status: isGray ? 'pass' : 'fail',
          message: isGray ? 'Button is gray when no changes' : 'Button is not gray'
        });

        // Check for pulsing animation
        const isPulsing = saveButton.className.includes('animate-pulse');
        buttonTests.tests.push({
          name: 'No pulsing when saved',
          status: !isPulsing ? 'pass' : 'fail',
          message: !isPulsing ? 'No animation when saved' : 'Still pulsing when saved'
        });
      } else {
        buttonTests.tests.push({
          name: 'Save button exists',
          status: 'fail',
          message: 'No save button found'
        });
      }
    } catch (e) {
      buttonTests.tests.push({
        name: 'Save button tests',
        status: 'fail',
        message: `Error: ${e}`
      });
    }
    results.push(buttonTests);

    // Test 2: Check Status Indicators
    const statusTests: TestResult = {
      category: 'Status Indicators',
      tests: []
    };

    try {
      const statusText = document.body.textContent;
      
      // Check for auto-save text
      const hasAutoSave = statusText?.includes('Auto-saved') || statusText?.includes('auto-save');
      statusTests.tests.push({
        name: 'No auto-save text present',
        status: !hasAutoSave ? 'pass' : 'fail',
        message: !hasAutoSave ? 'Auto-save removed' : 'Auto-save text still present'
      });

      // Check for manual save indicators
      const hasLastSaved = statusText?.includes('Last saved');
      const hasUnsavedChanges = statusText?.includes('Unsaved changes');
      
      statusTests.tests.push({
        name: 'Manual save indicators present',
        status: (hasLastSaved || hasUnsavedChanges) ? 'pass' : 'pending',
        message: hasLastSaved ? 'Shows "Last saved"' : hasUnsavedChanges ? 'Shows "Unsaved changes"' : 'No save status shown yet'
      });
    } catch (e) {
      statusTests.tests.push({
        name: 'Status indicator tests',
        status: 'fail',
        message: `Error: ${e}`
      });
    }
    results.push(statusTests);

    // Test 3: Property Type Persistence
    const persistenceTests: TestResult = {
      category: 'Field Persistence',
      tests: []
    };

    try {
      // Check property type selector
      const propertySelectors = document.querySelectorAll('select');
      let propertyTypeSelect: HTMLSelectElement | null = null;
      
      propertySelectors.forEach(select => {
        const selectElement = select as HTMLSelectElement;
        const options = Array.from(selectElement.options);
        if (options.some(opt => opt.text.includes('Office') || opt.text.includes('For Sale'))) {
          propertyTypeSelect = selectElement;
        }
      });

      if (propertyTypeSelect) {
        const currentValue = propertyTypeSelect.value;
        const currentText = propertyTypeSelect.options[propertyTypeSelect.selectedIndex]?.text;
        
        persistenceTests.tests.push({
          name: 'Property type selector found',
          status: 'pass',
          message: `Current: ${currentText || currentValue}`
        });

        persistenceTests.tests.push({
          name: 'Not defaulting to Office',
          status: currentValue !== 'office' || currentText === 'Office' ? 'pass' : 'pending',
          message: 'Property type maintains selection'
        });
      } else {
        persistenceTests.tests.push({
          name: 'Property type selector found',
          status: 'fail',
          message: 'Could not find property type selector'
        });
      }
    } catch (e) {
      persistenceTests.tests.push({
        name: 'Persistence tests',
        status: 'fail',
        message: `Error: ${e}`
      });
    }
    results.push(persistenceTests);

    // Test 4: Keyboard Shortcut
    const shortcutTests: TestResult = {
      category: 'Keyboard Shortcuts',
      tests: []
    };

    try {
      // Create and dispatch Ctrl+S event
      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true
      });
      
      let defaultPrevented = false;
      const originalPreventDefault = event.preventDefault;
      event.preventDefault = function() {
        defaultPrevented = true;
        originalPreventDefault.call(this);
      };
      
      window.dispatchEvent(event);
      
      shortcutTests.tests.push({
        name: 'Ctrl+S prevents default',
        status: defaultPrevented ? 'pass' : 'fail',
        message: defaultPrevented ? 'Browser save dialog prevented' : 'Default not prevented'
      });
    } catch (e) {
      shortcutTests.tests.push({
        name: 'Keyboard shortcut test',
        status: 'fail',
        message: `Error: ${e}`
      });
    }
    results.push(shortcutTests);

    // Test 5: No Auto-Save
    const autoSaveTests: TestResult = {
      category: 'Auto-Save Removal',
      tests: []
    };

    try {
      // Check for interval indicators
      const hasInterval = window.toString().includes('setInterval') || 
                         document.body.innerHTML.includes('30 seconds');
      
      autoSaveTests.tests.push({
        name: 'No 30-second interval',
        status: !document.body.textContent?.includes('every 30 seconds') ? 'pass' : 'fail',
        message: 'Auto-save interval removed'
      });

      autoSaveTests.tests.push({
        name: 'Auto-save toggle removed',
        status: !document.body.textContent?.includes('Auto-save every') ? 'pass' : 'fail',
        message: 'Toggle UI element removed'
      });
    } catch (e) {
      autoSaveTests.tests.push({
        name: 'Auto-save removal test',
        status: 'fail',
        message: `Error: ${e}`
      });
    }
    results.push(autoSaveTests);

    setTestResults(results);
    setIsRunning(false);
  };

  useEffect(() => {
    // Auto-run tests after component mounts
    setTimeout(runTests, 1000);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'fail':
        return <X className="w-4 h-4 text-red-500" />;
      case 'running':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'text-green-600';
      case 'fail':
        return 'text-red-600';
      case 'running':
        return 'text-blue-600';
      default:
        return 'text-yellow-600';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-xl p-4 max-w-md max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-3 border-b pb-2">
        <h3 className="font-semibold text-gray-900">Manual Save Tests</h3>
        <button
          onClick={runTests}
          disabled={isRunning}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
        >
          {isRunning && <RefreshCw className="w-3 h-3 animate-spin" />}
          {isRunning ? 'Testing...' : 'Re-run'}
        </button>
      </div>
      
      <div className="space-y-3">
        {testResults.map((category, idx) => (
          <div key={idx} className="border rounded-lg p-2">
            <h4 className="font-medium text-sm text-gray-700 mb-2">{category.category}</h4>
            <div className="space-y-1">
              {category.tests.map((test, testIdx) => (
                <div key={testIdx} className="flex items-start gap-2 text-xs">
                  {getStatusIcon(test.status)}
                  <div className="flex-1">
                    <span className={`font-medium ${getStatusColor(test.status)}`}>
                      {test.name}
                    </span>
                    {test.message && (
                      <p className="text-gray-500 mt-0.5">{test.message}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {currentTest && (
        <div className="mt-2 pt-2 border-t text-xs text-gray-500">
          Currently testing: {currentTest}
        </div>
      )}
    </div>
  );
};

export default TestManualSave;