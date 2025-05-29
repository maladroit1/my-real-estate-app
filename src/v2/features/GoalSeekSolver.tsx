import React, { useState, useCallback, useEffect } from 'react';
import { Target, Settings, Play, AlertCircle, CheckCircle, Loader, X } from 'lucide-react';

// TypeScript Types
export interface GoalSeekConfig {
  targetMetric: 'irr' | 'npv' | 'equityMultiple' | 'yieldOnCost' | 'cashOnCash';
  targetValue: number;
  variableToAdjust: 'rent' | 'costs' | 'leverage' | 'capRate' | 'exitCap';
  constraints: {
    min: number;
    max: number;
    step?: number;
  };
  tolerance: number;
  maxIterations: number;
}

export interface GoalSeekResult {
  success: boolean;
  iterations: number;
  originalValue: number;
  finalValue: number;
  targetAchieved: number;
  message: string;
  convergenceHistory: Array<{
    iteration: number;
    value: number;
    metric: number;
    error: number;
  }>;
}

interface GoalSeekSolverProps {
  // Current values
  currentMetrics: {
    irr: number;
    npv: number;
    equityMultiple: number;
    yieldOnCost: number;
    cashOnCash: number;
  };
  
  // Current inputs
  currentInputs: {
    rent: number;
    costs: number;
    leverage: number;
    capRate: number;
    exitCap: number;
  };
  
  // Callback to recalculate metrics with new inputs
  onRecalculate: (inputs: Partial<{
    rent: number;
    costs: number;
    leverage: number;
    capRate: number;
    exitCap: number;
  }>) => Promise<{
    irr: number;
    npv: number;
    equityMultiple: number;
    yieldOnCost: number;
    cashOnCash: number;
  }>;
  
  // Callback when solution is found
  onSolutionFound: (result: GoalSeekResult, newInputs: Partial<{
    rent: number;
    costs: number;
    leverage: number;
    capRate: number;
    exitCap: number;
  }>) => void;
  
  // Optional styling
  className?: string;
}

export const GoalSeekSolver: React.FC<GoalSeekSolverProps> = ({
  currentMetrics,
  currentInputs,
  onRecalculate,
  onSolutionFound,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<GoalSeekResult | null>(null);
  
  const [config, setConfig] = useState<GoalSeekConfig>({
    targetMetric: 'irr',
    targetValue: 15,
    variableToAdjust: 'rent',
    constraints: {
      min: currentInputs.rent * 0.8,
      max: currentInputs.rent * 1.2,
      step: 0.25
    },
    tolerance: 0.1,
    maxIterations: 100
  });

  // Update constraints when variable changes
  useEffect(() => {
    const variable = config.variableToAdjust;
    const currentValue = currentInputs[variable];
    
    let min, max, step;
    switch (variable) {
      case 'rent':
        min = currentValue * 0.8;
        max = currentValue * 1.2;
        step = 0.25;
        break;
      case 'costs':
        min = currentValue * 0.9;
        max = currentValue * 1.1;
        step = 10000;
        break;
      case 'leverage':
        min = 50;
        max = 85;
        step = 1;
        break;
      case 'capRate':
      case 'exitCap':
        min = 3;
        max = 10;
        step = 0.25;
        break;
      default:
        min = currentValue * 0.8;
        max = currentValue * 1.2;
        step = 1;
    }
    
    setConfig(prev => ({
      ...prev,
      constraints: { min, max, step }
    }));
  }, [config.variableToAdjust, currentInputs]);

  // Golden Section Search algorithm for optimization
  const goldenSectionSearch = async (
    func: (value: number) => Promise<number>,
    min: number,
    max: number,
    tolerance: number,
    maxIterations: number
  ): Promise<{ value: number; metric: number; history: GoalSeekResult['convergenceHistory'] }> => {
    const phi = (1 + Math.sqrt(5)) / 2;
    const resphi = 2 - phi;
    
    let a = min;
    let b = max;
    let tol = tolerance;
    let iter = 0;
    const history: GoalSeekResult['convergenceHistory'] = [];
    
    // Initial points
    let x1 = a + resphi * (b - a);
    let x2 = b - resphi * (b - a);
    let f1 = await func(x1);
    let f2 = await func(x2);
    
    history.push({ iteration: iter++, value: x1, metric: f1, error: Math.abs(f1) });
    history.push({ iteration: iter++, value: x2, metric: f2, error: Math.abs(f2) });
    
    while (Math.abs(b - a) > tol && iter < maxIterations) {
      setProgress((iter / maxIterations) * 100);
      
      if (Math.abs(f1) < Math.abs(f2)) {
        b = x2;
        x2 = x1;
        f2 = f1;
        x1 = a + resphi * (b - a);
        f1 = await func(x1);
        history.push({ iteration: iter, value: x1, metric: f1, error: Math.abs(f1) });
      } else {
        a = x1;
        x1 = x2;
        f1 = f2;
        x2 = b - resphi * (b - a);
        f2 = await func(x2);
        history.push({ iteration: iter, value: x2, metric: f2, error: Math.abs(f2) });
      }
      
      iter++;
    }
    
    const finalValue = Math.abs(f1) < Math.abs(f2) ? x1 : x2;
    const finalMetric = Math.abs(f1) < Math.abs(f2) ? f1 : f2;
    
    return { value: finalValue, metric: finalMetric, history };
  };

  // Binary search for discrete steps
  const binarySearch = async (
    func: (value: number) => Promise<number>,
    min: number,
    max: number,
    step: number,
    tolerance: number,
    maxIterations: number
  ): Promise<{ value: number; metric: number; history: GoalSeekResult['convergenceHistory'] }> => {
    let low = Math.floor(min / step) * step;
    let high = Math.ceil(max / step) * step;
    let iter = 0;
    const history: GoalSeekResult['convergenceHistory'] = [];
    
    while (low <= high && iter < maxIterations) {
      const mid = Math.floor((low + high) / 2 / step) * step;
      const error = await func(mid);
      
      history.push({ iteration: iter, value: mid, metric: error + config.targetValue, error: Math.abs(error) });
      setProgress((iter / maxIterations) * 100);
      
      if (Math.abs(error) < tolerance) {
        return { value: mid, metric: error, history };
      }
      
      // Check direction
      const lowError = await func(low);
      const highError = await func(high);
      
      if (Math.sign(lowError) !== Math.sign(error)) {
        high = mid;
      } else {
        low = mid + step;
      }
      
      iter++;
    }
    
    // Return best found
    const bestIndex = history.reduce((best, curr, idx) => 
      curr.error < history[best].error ? idx : best, 0);
    const best = history[bestIndex];
    
    return { value: best.value, metric: best.metric, history };
  };

  const solve = useCallback(async () => {
    setIsSolving(true);
    setProgress(0);
    setResult(null);
    
    try {
      // Define objective function (returns error from target)
      const objectiveFunction = async (value: number): Promise<number> => {
        const newInputs = { ...currentInputs };
        newInputs[config.variableToAdjust] = value;
        
        const newMetrics = await onRecalculate(newInputs);
        const actualValue = newMetrics[config.targetMetric];
        
        // Return error (difference from target)
        return actualValue - config.targetValue;
      };
      
      // Choose algorithm based on whether we have discrete steps
      const useDiscrete = config.constraints.step && config.constraints.step > 0;
      
      const solution = useDiscrete
        ? await binarySearch(
            objectiveFunction,
            config.constraints.min,
            config.constraints.max,
            config.constraints.step!,
            config.tolerance,
            config.maxIterations
          )
        : await goldenSectionSearch(
            objectiveFunction,
            config.constraints.min,
            config.constraints.max,
            config.tolerance,
            config.maxIterations
          );
      
      // Check if solution meets tolerance
      const success = Math.abs(solution.metric) <= config.tolerance;
      
      const result: GoalSeekResult = {
        success,
        iterations: solution.history.length,
        originalValue: currentInputs[config.variableToAdjust],
        finalValue: solution.value,
        targetAchieved: solution.metric + config.targetValue,
        message: success
          ? `Successfully found solution: ${getVariableLabel(config.variableToAdjust)} = ${formatValue(solution.value, config.variableToAdjust)}`
          : `Reached iteration limit. Best solution: ${getVariableLabel(config.variableToAdjust)} = ${formatValue(solution.value, config.variableToAdjust)}`,
        convergenceHistory: solution.history
      };
      
      setResult(result);
      
      if (success) {
        const newInputs = { ...currentInputs };
        newInputs[config.variableToAdjust] = solution.value;
        onSolutionFound(result, newInputs);
      }
      
    } catch (error) {
      console.error('Goal seek error:', error);
      setResult({
        success: false,
        iterations: 0,
        originalValue: currentInputs[config.variableToAdjust],
        finalValue: currentInputs[config.variableToAdjust],
        targetAchieved: currentMetrics[config.targetMetric],
        message: 'Error during optimization: ' + (error as Error).message,
        convergenceHistory: []
      });
    } finally {
      setIsSolving(false);
      setProgress(100);
    }
  }, [config, currentInputs, currentMetrics, onRecalculate, onSolutionFound]);

  // Helper functions
  const getMetricLabel = (metric: GoalSeekConfig['targetMetric']) => {
    const labels = {
      irr: 'IRR',
      npv: 'NPV',
      equityMultiple: 'Equity Multiple',
      yieldOnCost: 'Yield on Cost',
      cashOnCash: 'Cash-on-Cash Return'
    };
    return labels[metric];
  };

  const getVariableLabel = (variable: GoalSeekConfig['variableToAdjust']) => {
    const labels = {
      rent: 'Rent',
      costs: 'Total Costs',
      leverage: 'Leverage (LTV)',
      capRate: 'Cap Rate',
      exitCap: 'Exit Cap Rate'
    };
    return labels[variable];
  };

  const formatValue = (value: number, variable: GoalSeekConfig['variableToAdjust']) => {
    switch (variable) {
      case 'rent':
        return `$${value.toFixed(2)}/SF`;
      case 'costs':
        return `$${(value / 1000000).toFixed(2)}M`;
      case 'leverage':
        return `${value.toFixed(1)}%`;
      case 'capRate':
      case 'exitCap':
        return `${value.toFixed(2)}%`;
      default:
        return value.toFixed(2);
    }
  };

  const getMetricFormat = (metric: GoalSeekConfig['targetMetric']) => {
    switch (metric) {
      case 'irr':
      case 'yieldOnCost':
      case 'cashOnCash':
        return (v: number) => `${v.toFixed(2)}%`;
      case 'npv':
        return (v: number) => `$${(v / 1000000).toFixed(2)}M`;
      case 'equityMultiple':
        return (v: number) => `${v.toFixed(2)}x`;
      default:
        return (v: number) => v.toFixed(2);
    }
  };

  return (
    <>
      {/* Goal Seek Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors ${className}`}
      >
        <Target className="w-5 h-5" />
        Goal Seek
      </button>

      {/* Goal Seek Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Goal Seek Solver</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Optimize inputs to achieve target investment metrics
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-6">
                {/* Left Column - Configuration */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Configuration
                    </h3>
                    
                    {/* Target Metric */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Target Metric
                      </label>
                      <select
                        value={config.targetMetric}
                        onChange={(e) => setConfig({ ...config, targetMetric: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        disabled={isSolving}
                      >
                        <option value="irr">IRR (%)</option>
                        <option value="npv">NPV ($)</option>
                        <option value="equityMultiple">Equity Multiple (x)</option>
                        <option value="yieldOnCost">Yield on Cost (%)</option>
                        <option value="cashOnCash">Cash-on-Cash Return (%)</option>
                      </select>
                    </div>

                    {/* Target Value */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Target Value
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={config.targetValue}
                          onChange={(e) => setConfig({ ...config, targetValue: Number(e.target.value) })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          disabled={isSolving}
                          step={config.targetMetric === 'npv' ? 100000 : 0.1}
                        />
                        <span className="text-sm text-gray-600">
                          {config.targetMetric === 'irr' || config.targetMetric === 'yieldOnCost' || config.targetMetric === 'cashOnCash' ? '%' : 
                           config.targetMetric === 'equityMultiple' ? 'x' : 
                           config.targetMetric === 'npv' ? 'M' : ''}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Current: {getMetricFormat(config.targetMetric)(currentMetrics[config.targetMetric])}
                      </p>
                    </div>

                    {/* Variable to Adjust */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Variable to Adjust
                      </label>
                      <select
                        value={config.variableToAdjust}
                        onChange={(e) => setConfig({ ...config, variableToAdjust: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        disabled={isSolving}
                      >
                        <option value="rent">Rent ($/SF)</option>
                        <option value="costs">Total Development Costs</option>
                        <option value="leverage">Leverage (LTV %)</option>
                        <option value="capRate">Cap Rate (%)</option>
                        <option value="exitCap">Exit Cap Rate (%)</option>
                      </select>
                    </div>

                    {/* Constraints */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Constraints
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-600">Min</label>
                          <input
                            type="number"
                            value={config.constraints.min}
                            onChange={(e) => setConfig({ 
                              ...config, 
                              constraints: { ...config.constraints, min: Number(e.target.value) }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            disabled={isSolving}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Max</label>
                          <input
                            type="number"
                            value={config.constraints.max}
                            onChange={(e) => setConfig({ 
                              ...config, 
                              constraints: { ...config.constraints, max: Number(e.target.value) }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            disabled={isSolving}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Advanced Settings */}
                    <details className="mb-4">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                        Advanced Settings
                      </summary>
                      <div className="mt-3 space-y-3">
                        <div>
                          <label className="text-xs text-gray-600">Tolerance</label>
                          <input
                            type="number"
                            value={config.tolerance}
                            onChange={(e) => setConfig({ ...config, tolerance: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            disabled={isSolving}
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Max Iterations</label>
                          <input
                            type="number"
                            value={config.maxIterations}
                            onChange={(e) => setConfig({ ...config, maxIterations: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            disabled={isSolving}
                            min="10"
                            max="1000"
                          />
                        </div>
                      </div>
                    </details>

                    {/* Solve Button */}
                    <button
                      onClick={solve}
                      disabled={isSolving}
                      className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSolving ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          Solving... {progress.toFixed(0)}%
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5" />
                          Solve
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Right Column - Results */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Results</h3>
                    
                    {result ? (
                      <div className="space-y-4">
                        {/* Status */}
                        <div className={`p-4 rounded-lg flex items-start gap-3 ${
                          result.success ? 'bg-green-50' : 'bg-yellow-50'
                        }`}>
                          {result.success ? (
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className={`font-medium ${
                              result.success ? 'text-green-900' : 'text-yellow-900'
                            }`}>
                              {result.message}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              Completed in {result.iterations} iterations
                            </p>
                          </div>
                        </div>

                        {/* Results Summary */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">Original Value</p>
                            <p className="text-lg font-semibold">
                              {formatValue(result.originalValue, config.variableToAdjust)}
                            </p>
                          </div>
                          <div className="p-4 bg-purple-50 rounded-lg">
                            <p className="text-sm text-gray-600">Optimized Value</p>
                            <p className="text-lg font-semibold text-purple-600">
                              {formatValue(result.finalValue, config.variableToAdjust)}
                            </p>
                          </div>
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600">Target {getMetricLabel(config.targetMetric)}</p>
                            <p className="text-lg font-semibold">
                              {getMetricFormat(config.targetMetric)(config.targetValue)}
                            </p>
                          </div>
                          <div className="p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm text-gray-600">Achieved {getMetricLabel(config.targetMetric)}</p>
                            <p className="text-lg font-semibold text-blue-600">
                              {getMetricFormat(config.targetMetric)(result.targetAchieved)}
                            </p>
                          </div>
                        </div>

                        {/* Convergence Chart */}
                        {result.convergenceHistory.length > 0 && (
                          <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm font-medium text-gray-700 mb-3">Convergence History</p>
                            <div className="h-48 relative">
                              <svg className="w-full h-full">
                                {/* Chart background */}
                                <rect width="100%" height="100%" fill="white" rx="4" />
                                
                                {/* Grid lines */}
                                {[0, 25, 50, 75, 100].map(pct => (
                                  <line
                                    key={pct}
                                    x1="10%"
                                    x2="90%"
                                    y1={`${100 - pct}%`}
                                    y2={`${100 - pct}%`}
                                    stroke="#e5e7eb"
                                    strokeWidth="1"
                                  />
                                ))}
                                
                                {/* Data line */}
                                <polyline
                                  fill="none"
                                  stroke="#8b5cf6"
                                  strokeWidth="2"
                                  points={result.convergenceHistory
                                    .map((point, idx) => {
                                      const x = 10 + (idx / (result.convergenceHistory.length - 1)) * 80;
                                      const maxError = Math.max(...result.convergenceHistory.map(p => p.error));
                                      const y = 90 - (point.error / maxError) * 80;
                                      return `${x}%,${y}%`;
                                    })
                                    .join(' ')}
                                />
                                
                                {/* Data points */}
                                {result.convergenceHistory.map((point, idx) => {
                                  const x = 10 + (idx / (result.convergenceHistory.length - 1)) * 80;
                                  const maxError = Math.max(...result.convergenceHistory.map(p => p.error));
                                  const y = 90 - (point.error / maxError) * 80;
                                  return (
                                    <circle
                                      key={idx}
                                      cx={`${x}%`}
                                      cy={`${y}%`}
                                      r="3"
                                      fill="#8b5cf6"
                                    />
                                  );
                                })}
                              </svg>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              Error convergence over {result.iterations} iterations
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <Target className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p>Configure parameters and click Solve to find optimal values</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Goal Seek uses optimization algorithms to find input values that achieve your target metrics
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                  >
                    Close
                  </button>
                  {result?.success && (
                    <button
                      onClick={() => {
                        const newInputs = { ...currentInputs };
                        newInputs[config.variableToAdjust] = result.finalValue;
                        onSolutionFound(result, newInputs);
                        setIsOpen(false);
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      Apply Solution
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GoalSeekSolver;