import React, { useState, useEffect } from 'react';
import { Building2, ToggleLeft, ToggleRight, Info, TestTube, Brain } from 'lucide-react';

// Import v1 and v2 components
import RealEstateProFormaV1 from './RealEstateProFormaV1';
import RealEstateProFormaV2 from './RealEstateProFormaV2';
import MathTestRunner from './components/MathTestRunner';
import TestAIFeatures from './TestAIFeatures';
import DebugAIButton from './DebugAIButton';

const App: React.FC = () => {
  const [version, setVersion] = useState<'v1' | 'v2' | 'ai-test'>('v2');
  const [showInfo, setShowInfo] = useState(false);
  const [showTests, setShowTests] = useState(false);

  // Load saved version preference from localStorage
  useEffect(() => {
    const savedVersion = localStorage.getItem('proFormaVersion') as 'v1' | 'v2' | null;
    if (savedVersion) {
      setVersion(savedVersion);
    }
  }, []);

  // Save version preference
  const toggleVersion = () => {
    const newVersion = version === 'v1' ? 'v2' : 'v1';
    setVersion(newVersion);
    localStorage.setItem('proFormaVersion', newVersion);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Version Toggle */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Real Estate Pro Forma Calculator
                </h1>
                <div className="text-xs text-gray-500">
                  Professional Investment Analysis Tool
                </div>
              </div>
            </div>

            {/* Version Toggle and Info */}
            <div className="flex items-center space-x-4">
              {/* AI Test Button */}
              <button
                onClick={() => setVersion(version === 'ai-test' ? 'v2' : 'ai-test')}
                className={`p-2 rounded-lg transition-colors ${
                  version === 'ai-test' 
                    ? 'text-purple-600 bg-purple-100' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title="Test AI Features"
              >
                <Brain size={20} />
              </button>
              
              {/* Test Runner Button */}
              <button
                onClick={() => setShowTests(!showTests)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Run Math Tests"
              >
                <TestTube size={20} />
              </button>

              {/* Info Button */}
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Version Information"
              >
                <Info size={20} />
              </button>

              {/* Version Toggle */}
              <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                <span className={`px-3 py-1 text-sm font-medium transition-colors ${
                  version === 'v1' 
                    ? 'text-blue-600 bg-white rounded-md shadow-sm' 
                    : 'text-gray-500'
                }`}>
                  v1.0
                </span>
                <button
                  onClick={toggleVersion}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Toggle between versions"
                >
                  {version === 'v1' ? (
                    <ToggleLeft className="h-6 w-6 text-gray-600" />
                  ) : (
                    <ToggleRight className="h-6 w-6 text-blue-600" />
                  )}
                </button>
                <span className={`px-3 py-1 text-sm font-medium transition-colors ${
                  version === 'v2' 
                    ? 'text-blue-600 bg-white rounded-md shadow-sm' 
                    : 'text-gray-500'
                }`}>
                  v2.0
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Version Info Dropdown */}
        {showInfo && (
          <div className="absolute right-4 top-16 mt-2 w-96 bg-white rounded-lg shadow-lg border p-4 z-50">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Version 1.0 - Classic</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Multiple property types (Office, Retail, Apartment, For-Sale)</li>
                  <li>• Comprehensive cash flow analysis</li>
                  <li>• Advanced charts and visualizations</li>
                  <li>• Detailed financial metrics</li>
                  <li>• Property comparison tools</li>
                </ul>
              </div>
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-2">Version 2.0 - Professional</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• ALL v1 functionality included</li>
                  <li>• Advanced scenario management with IndexedDB</li>
                  <li>• Auto-save every 30 seconds</li>
                  <li>• Side-by-side scenario comparison (up to 4)</li>
                  <li>• Scenario history tracking & duplication</li>
                  <li>• Coming soon: Cottonwood Heights mixed-use</li>
                  <li>• Coming soon: Enhanced analytics & Goal Seek</li>
                </ul>
              </div>
              <div className="border-t pt-4">
                <div className="text-xs text-gray-500">
                  Your version preference is saved automatically
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="relative">
        {/* Version Indicator Badge */}
        <div className="absolute top-4 right-4 z-10">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            version === 'v1' 
              ? 'bg-gray-100 text-gray-700' 
              : 'bg-blue-100 text-blue-700'
          }`}>
            {version === 'v1' ? 'Classic Version' : 'Professional Version'}
          </span>
        </div>

        {/* Version-specific Component or Test Runner */}
        <div className="transition-all duration-300">
          {showTests ? (
            <div className="animate-fadeIn">
              <MathTestRunner />
            </div>
          ) : version === 'ai-test' ? (
            <div className="animate-fadeIn">
              <TestAIFeatures />
            </div>
          ) : version === 'v1' ? (
            <div className="animate-fadeIn">
              <RealEstateProFormaV1 />
            </div>
          ) : (
            <div className="animate-fadeIn">
              <RealEstateProFormaV2 />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div>© 2024 Real Estate Pro Forma Calculator</div>
            <div>Currently using {version === 'v1' ? 'Classic' : 'Professional'} version</div>
          </div>
        </div>
      </footer>

      {/* Debug Component */}
      {version === 'v2' && <DebugAIButton />}

      {/* Add fade animation styles */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default App;