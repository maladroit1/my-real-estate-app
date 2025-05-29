import React, { useState } from 'react';
import { Info, X, Calculator } from 'lucide-react';

interface FormulaViewerProps {
  formulaKey: string;
  values: { [key: string]: number };
  className?: string;
}

const FormulaViewerSimple: React.FC<FormulaViewerProps> = ({ formulaKey, values, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);

  const formatValue = (value: number): string => {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatPercent = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  const renderFormula = () => {
    switch (formulaKey) {
      case 'irr':
        return (
          <div className="space-y-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-lg font-mono">Σ CF<sub>t</sub> / (1 + IRR)<sup>t</sup> = 0</p>
              <p className="text-sm text-gray-600 mt-2">Find the rate where NPV equals zero</p>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded">
                <p className="font-medium">Initial Investment</p>
                <p className="text-red-600">{formatValue(-(values.initialEquity || 0))}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p className="font-medium">Total Distributions</p>
                <p className="text-green-600">{formatValue(values.totalDistributions || 0)}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded">
                <p className="font-medium">Internal Rate of Return</p>
                <p className="text-2xl font-bold text-blue-600">{formatPercent(values.irr || 0)}</p>
              </div>
            </div>
          </div>
        );

      case 'equityMultiple':
        const multiple = values.initialEquity > 0 
          ? values.totalDistributions / values.initialEquity 
          : 0;
        return (
          <div className="space-y-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-lg font-mono">Equity Multiple = Total Distributions / Initial Equity</p>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-gray-50 rounded">
                <span>Total Distributions:</span>
                <span className="font-medium">{formatValue(values.totalDistributions || 0)}</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded">
                <span>Initial Equity:</span>
                <span className="font-medium">{formatValue(values.initialEquity || 0)}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Equity Multiple:</span>
                  <span className="text-2xl font-bold text-green-600">{multiple.toFixed(2)}x</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'yieldOnCost':
        const yoc = values.totalCost > 0 
          ? (values.noi / values.totalCost) * 100 
          : 0;
        return (
          <div className="space-y-4">
            <div className="text-center p-4 bg-indigo-50 rounded-lg">
              <p className="text-lg font-mono">Yield on Cost = NOI / Total Development Cost × 100%</p>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">Stabilized NOI</p>
                <p className="font-medium">{formatValue(values.noi || 0)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">Total Development Cost</p>
                <div className="space-y-1 mt-2 text-sm">
                  <div className="flex justify-between">
                    <span>Land:</span>
                    <span>{formatValue(values.landCost || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Construction:</span>
                    <span>{formatValue(values.constructionCost || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Soft Costs:</span>
                    <span>{formatValue(values.softCosts || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Interest:</span>
                    <span>{formatValue(values.constructionInterest || 0)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>Total:</span>
                    <span>{formatValue(values.totalCost || 0)}</span>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-indigo-50 rounded">
                <p className="font-medium">Yield on Cost</p>
                <p className="text-2xl font-bold text-indigo-600">{formatPercent(yoc)}</p>
              </div>
            </div>
          </div>
        );

      case 'dscr':
        const annualDebtService = (values.loanAmount || 0) * (values.interestRate || 0) / 100;
        const dscr = annualDebtService > 0 ? (values.noi || 0) / annualDebtService : 0;
        return (
          <div className="space-y-4">
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-lg font-mono">DSCR = NOI / Annual Debt Service</p>
              <p className="text-sm text-gray-600 mt-2">Measures ability to cover debt payments</p>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-gray-50 rounded">
                <span>Net Operating Income:</span>
                <span className="font-medium">{formatValue(values.noi || 0)}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">Annual Debt Service</p>
                <div className="space-y-1 mt-2 text-sm">
                  <div className="flex justify-between">
                    <span>Loan Amount:</span>
                    <span>{formatValue(values.loanAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Interest Rate:</span>
                    <span>{formatPercent(values.interestRate || 0)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>Annual Payment:</span>
                    <span>{formatValue(annualDebtService)}</span>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-purple-50 rounded">
                <p className="font-medium">Debt Service Coverage Ratio</p>
                <p className="text-2xl font-bold text-purple-600">{dscr.toFixed(2)}x</p>
                <p className="text-sm text-gray-600 mt-1">
                  {dscr >= 1.25 ? '✓ Meets typical lender requirements' : '⚠️ Below typical 1.25x requirement'}
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return <p>Formula not available</p>;
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`p-1 text-gray-400 hover:text-gray-600 transition-colors ${className}`}
        title="View formula"
      >
        <Info size={14} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calculator className="text-blue-600" size={24} />
                <h2 className="text-xl font-bold text-gray-900">Formula Breakdown</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {renderFormula()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FormulaViewerSimple;