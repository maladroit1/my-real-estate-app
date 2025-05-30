import React, { useState } from 'react';
import {
  X,
  Copy,
  TrendingUp,
  Calculator,
  DollarSign,
  BarChart3,
  PieChart,
  ChevronRight,
  ChevronDown,
  Check
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

interface MetricBreakdownProps {
  metric: string;
  value: string | number;
  data: any;
  onClose: () => void;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export const MetricBreakdown: React.FC<MetricBreakdownProps> = React.memo(({
  metric,
  value,
  data,
  onClose
}) => {
  const [copied, setCopied] = useState(false);
  const [expandedCost, setExpandedCost] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const copyCalculation = () => {
    const breakdownText = generateBreakdownText();
    navigator.clipboard.writeText(breakdownText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateBreakdownText = () => {
    let text = `${metric} Calculation Breakdown\n`;
    text += `=${'='.repeat(50)}\n\n`;
    text += `Result: ${value}\n\n`;
    
    switch (metric) {
      case 'Project IRR':
        text += generateIRRText();
        break;
      case 'Equity Multiple':
        text += generateEquityMultipleText();
        break;
      case 'Total Development Cost':
        text += generateTotalCostText();
        break;
      case 'Equity Required':
        text += generateEquityRequiredText();
        break;
      case 'Avg Cash-on-Cash':
        text += generateCashOnCashText();
        break;
      case 'Yield on Cost':
        text += generateYieldOnCostText();
        break;
    }
    
    return text;
  };

  const generateIRRText = () => {
    let text = 'Internal Rate of Return (IRR) Calculation:\n\n';
    text += 'Formula: NPV = Σ[CFt / (1 + IRR)^t] = 0\n\n';
    text += 'Cash Flows:\n';
    data.cashFlows?.forEach((cf: any, i: number) => {
      text += `Year ${i}: ${formatCurrency(cf.cashFlow || 0)}\n`;
    });
    return text;
  };

  const generateEquityMultipleText = () => {
    let text = 'Equity Multiple Calculation:\n\n';
    text += 'Formula: Total Distributions / Initial Equity\n\n';
    text += `Initial Equity: ${formatCurrency(data.initialEquity || 0)}\n`;
    text += `Total Distributions: ${formatCurrency(data.totalDistributions || 0)}\n`;
    text += `Equity Multiple: ${data.equityMultiple || 0}x\n`;
    return text;
  };

  const generateTotalCostText = () => {
    let text = 'Total Development Cost Breakdown:\n\n';
    Object.entries(data.costBreakdown || {}).forEach(([key, value]: [string, any]) => {
      text += `${key}: ${formatCurrency(value)}\n`;
    });
    return text;
  };

  const generateEquityRequiredText = () => {
    let text = 'Equity Required Calculation:\n\n';
    text += `Total Project Cost: ${formatCurrency(data.totalProjectCost || 0)}\n`;
    text += `- Debt Financing: ${formatCurrency(data.debtAmount || 0)}\n`;
    text += `= Equity Required: ${formatCurrency(data.equityRequired || 0)}\n`;
    return text;
  };

  const generateCashOnCashText = () => {
    let text = 'Average Cash-on-Cash Return:\n\n';
    text += 'Annual Returns:\n';
    data.annualReturns?.forEach((ret: any) => {
      text += `Year ${ret.year}: ${formatPercent(ret.cashOnCash)}\n`;
    });
    text += `\nAverage: ${value}\n`;
    return text;
  };

  const generateYieldOnCostText = () => {
    let text = 'Yield on Cost Calculation:\n\n';
    text += 'Formula: Stabilized NOI / Total Development Cost\n\n';
    text += `Stabilized NOI: ${formatCurrency(data.stabilizedNOI || 0)}\n`;
    text += `Total Development Cost: ${formatCurrency(data.totalCost || 0)}\n`;
    text += `Yield on Cost: ${value}\n`;
    return text;
  };

  const renderContent = () => {
    switch (metric) {
      case 'Project IRR':
        return renderIRRBreakdown();
      case 'Equity Multiple':
        return renderEquityMultipleBreakdown();
      case 'Total Development Cost':
        return renderTotalCostBreakdown();
      case 'Equity Required':
        return renderEquityRequiredBreakdown();
      case 'Avg Cash-on-Cash':
        return renderCashOnCashBreakdown();
      case 'Yield on Cost':
        return renderYieldOnCostBreakdown();
      default:
        return null;
    }
  };

  const renderIRRBreakdown = () => {
    const cashFlowData = data.cashFlows?.map((cf: any, index: number) => ({
      year: `Year ${index}`,
      cashFlow: cf.cashFlow || 0,
      npv: cf.npv || 0
    })) || [];

    return (
      <div className="space-y-6">
        {/* Formula */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">Formula</h4>
          <code className="text-sm bg-white px-2 py-1 rounded">
            NPV = Σ[CFt / (1 + IRR)^t] = 0
          </code>
          <p className="text-sm text-blue-800 mt-2">
            IRR is the discount rate that makes NPV equal to zero
          </p>
        </div>

        {/* Cash Flow Timeline */}
        <div>
          <h4 className="font-semibold mb-3">Cash Flow Timeline</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Area type="monotone" dataKey="cashFlow" stroke="#3B82F6" fill="#93C5FD" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Calculation Steps */}
        <div>
          <h4 className="font-semibold mb-3">Calculation Steps</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Initial Investment:</span>
              <span className="font-medium text-red-600">
                {formatCurrency(Math.abs(data.cashFlows?.[0]?.cashFlow || 0))}
              </span>
            </div>
            {data.cashFlows?.slice(1).map((cf: any, index: number) => (
              <div key={index} className="flex justify-between text-sm">
                <span>Year {index + 1} Cash Flow:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(cf.cashFlow || 0)}
                </span>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>IRR:</span>
              <span className="text-blue-600">{value}</span>
            </div>
          </div>
        </div>

        {/* NPV Sensitivity */}
        {data.npvSensitivity && (
          <div>
            <h4 className="font-semibold mb-3">NPV at Different Discount Rates</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.npvSensitivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="rate" tickFormatter={(value) => `${value}%`} />
                  <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Line type="monotone" dataKey="npv" stroke="#3B82F6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderEquityMultipleBreakdown = () => {
    const distributionData = [
      { name: 'Initial Equity', value: Math.abs(data.initialEquity || 0), color: '#EF4444' },
      { name: 'Cash Distributions', value: data.cashDistributions || 0, color: '#10B981' },
      { name: 'Exit Proceeds', value: data.exitProceeds || 0, color: '#3B82F6' }
    ].filter(item => item.value > 0);

    return (
      <div className="space-y-6">
        {/* Formula */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-semibold text-green-900 mb-2">Formula</h4>
          <code className="text-sm bg-white px-2 py-1 rounded">
            Equity Multiple = Total Distributions / Initial Equity
          </code>
        </div>

        {/* Visual Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-3">Distribution Breakdown</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Calculation</h4>
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Initial Equity:</span>
                  <span className="font-medium">{formatCurrency(Math.abs(data.initialEquity || 0))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Operating Cash Flows:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(data.cashDistributions || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Exit Proceeds:</span>
                  <span className="font-medium text-blue-600">
                    {formatCurrency(data.exitProceeds || 0)}
                  </span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Total Distributions:</span>
                    <span>{formatCurrency(data.totalDistributions || 0)}</span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-100 p-3 rounded">
                <div className="flex justify-between font-semibold">
                  <span>Equity Multiple:</span>
                  <span className="text-lg text-green-600">{value}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Waterfall Breakdown */}
        {data.waterfallTiers && (
          <div>
            <h4 className="font-semibold mb-3">Partnership Waterfall Split</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm p-3 bg-blue-50 rounded">
                <span>LP Distributions:</span>
                <span className="font-medium text-blue-600">{formatCurrency(data.lpDistributions || 0)}</span>
              </div>
              <div className="flex justify-between text-sm p-3 bg-green-50 rounded">
                <span>GP Distributions (before promote):</span>
                <span className="font-medium text-green-600">
                  {formatCurrency((data.gpDistributions || 0) - (data.sponsorPromote || 0))}
                </span>
              </div>
              {data.sponsorPromote > 0 && (
                <div className="flex justify-between text-sm p-3 bg-purple-50 rounded">
                  <span>Sponsor Promote:</span>
                  <span className="font-medium text-purple-600">{formatCurrency(data.sponsorPromote)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm p-3 bg-gray-100 rounded font-semibold">
                <span>GP Total (with promote):</span>
                <span className="text-green-600">{formatCurrency(data.gpDistributions || 0)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div>
          <h4 className="font-semibold mb-3">Distribution Timeline</h4>
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300"></div>
            {data.distributions?.map((dist: any, index: number) => (
              <div key={index} className="relative flex items-center mb-4">
                <div className="absolute left-8 w-3 h-3 bg-blue-600 rounded-full -translate-x-1/2"></div>
                <div className="ml-16 flex justify-between items-center w-full">
                  <span className="text-sm">{dist.label}</span>
                  <span className="font-medium text-green-600">{formatCurrency(dist.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderTotalCostBreakdown = () => {
    const costData = Object.entries(data.costBreakdown || {}).map(([key, value]: [string, any]) => ({
      name: key,
      value: value,
      percentage: ((value / data.total) * 100).toFixed(1)
    }));

    return (
      <div className="space-y-6">
        {/* Cost Categories */}
        <div>
          <h4 className="font-semibold mb-3">Cost Categories</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div>
          <h4 className="font-semibold mb-3">Detailed Breakdown</h4>
          <div className="space-y-2">
            {costData.map((item, index) => {
              const isExpandable = (item.name === 'Hard Costs' && data.hardCostBreakdown) || 
                                 (item.name === 'Soft Costs' && data.softCostBreakdown);
              const isExpanded = expandedCost === item.name;
              
              return (
                <div key={index}>
                  <div 
                    className={`flex justify-between items-center p-3 bg-gray-50 rounded ${isExpandable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                    onClick={() => isExpandable && setExpandedCost(isExpanded ? null : item.name)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-8 bg-blue-600 rounded"></div>
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-600">{item.percentage}% of total</p>
                        </div>
                        {isExpandable && (
                          isExpanded ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronRight size={16} className="text-gray-500" />
                        )}
                      </div>
                    </div>
                    <span className="font-semibold">{formatCurrency(item.value)}</span>
                  </div>
                  
                  {/* Expanded breakdown */}
                  {isExpanded && (
                    <div className="ml-5 mt-2 space-y-1">
                      {Object.entries(
                        item.name === 'Hard Costs' ? data.hardCostBreakdown : data.softCostBreakdown
                      ).filter(([_, value]) => (value as number) > 0).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex justify-between items-center p-2 bg-gray-100 rounded text-sm">
                          <span className="text-gray-700">{key}</span>
                          <span className="font-medium">{formatCurrency(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total Development Cost</span>
                <span className="text-xl font-bold text-blue-600">{formatCurrency(data.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cost per Unit/SF */}
        {data.metrics && (
          <div className="grid grid-cols-2 gap-4">
            {data.metrics.costPerSF && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Cost per SF</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(data.metrics.costPerSF)}/SF
                </p>
              </div>
            )}
            {data.metrics.costPerUnit && (
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Cost per Unit</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(data.metrics.costPerUnit)}/unit
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderEquityRequiredBreakdown = () => {
    const sourcesData = [
      { name: 'Senior Debt', value: data.debtAmount || 0, color: '#3B82F6' },
      { name: 'LP Equity', value: data.lpEquity || 0, color: '#10B981' },
      { name: 'GP Equity', value: data.gpEquity || 0, color: '#F59E0B' }
    ].filter(item => item.value > 0);

    return (
      <div className="space-y-6">
        {/* Formula */}
        <div className="bg-purple-50 p-4 rounded-lg">
          <h4 className="font-semibold text-purple-900 mb-2">Formula</h4>
          <code className="text-sm bg-white px-2 py-1 rounded">
            Equity Required = Total Project Cost - Debt Financing
          </code>
        </div>

        {/* Sources of Funds */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-3">Sources of Funds</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={sourcesData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sourcesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Calculation</h4>
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Project Cost:</span>
                  <span className="font-medium">{formatCurrency(data.totalProjectCost || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Construction Interest:</span>
                  <span className="font-medium">{formatCurrency(data.constructionInterest || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Loan Fees:</span>
                  <span className="font-medium">{formatCurrency(data.loanFees || 0)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between text-sm">
                    <span>Debt Financing ({data.ltc}% LTC):</span>
                    <span className="font-medium text-blue-600">
                      -{formatCurrency(data.debtAmount || 0)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-100 p-3 rounded">
                <div className="flex justify-between font-semibold">
                  <span>Equity Required:</span>
                  <span className="text-lg text-purple-600">{formatCurrency(data.equityRequired || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Equity Split */}
        <div>
          <h4 className="font-semibold mb-3">Equity Structure</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded">
              <div>
                <p className="font-medium">LP Equity</p>
                <p className="text-sm text-gray-600">{data.lpPercent}% of equity</p>
              </div>
              <span className="font-semibold text-green-600">{formatCurrency(data.lpEquity || 0)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
              <div>
                <p className="font-medium">GP Equity</p>
                <p className="text-sm text-gray-600">{data.gpPercent}% of equity</p>
              </div>
              <span className="font-semibold text-yellow-600">{formatCurrency(data.gpEquity || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCashOnCashBreakdown = () => {
    const annualData = data.annualReturns || [];

    return (
      <div className="space-y-6">
        {/* Formula */}
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h4 className="font-semibold text-yellow-900 mb-2">Formula</h4>
          <code className="text-sm bg-white px-2 py-1 rounded">
            Cash-on-Cash = Annual Cash Flow / Initial Equity Investment
          </code>
        </div>

        {/* Annual Returns Chart */}
        <div>
          <h4 className="font-semibold mb-3">Annual Cash-on-Cash Returns</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={annualData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(value) => `${value}%`} />
                <Tooltip formatter={(value: any) => `${value}%`} />
                <Bar dataKey="cashOnCash" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div>
          <h4 className="font-semibold mb-3">Year-by-Year Analysis</h4>
          <div className="space-y-2">
            {annualData.map((item: any, index: number) => (
              <div key={index} className="p-3 bg-gray-50 rounded">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium">Year {item.year}</span>
                  <span className="font-semibold text-yellow-600">{formatPercent(item.cashOnCash)}</span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Cash Flow:</span>
                    <span>{formatCurrency(item.cashFlow)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Initial Equity:</span>
                    <span>{formatCurrency(item.initialEquity)}</span>
                  </div>
                </div>
              </div>
            ))}
            <div className="border-t pt-3">
              <div className="flex justify-between items-center bg-yellow-100 p-3 rounded">
                <span className="font-semibold">Average Cash-on-Cash</span>
                <span className="text-xl font-bold text-yellow-600">{value}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cumulative Returns */}
        {data.cumulativeReturns && (
          <div>
            <h4 className="font-semibold mb-3">Cumulative Cash-on-Cash</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.cumulativeReturns}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <Tooltip formatter={(value: any) => `${value}%`} />
                  <Line type="monotone" dataKey="cumulative" stroke="#F59E0B" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderYieldOnCostBreakdown = () => {
    const noiComponents = data.noiBreakdown || {};
    const costComponents = data.costBreakdown || {};

    return (
      <div className="space-y-6">
        {/* Formula */}
        <div className="bg-indigo-50 p-4 rounded-lg">
          <h4 className="font-semibold text-indigo-900 mb-2">Formula</h4>
          <code className="text-sm bg-white px-2 py-1 rounded">
            Yield on Cost = Stabilized NOI / Total Development Cost
          </code>
        </div>

        {/* NOI Calculation */}
        <div>
          <h4 className="font-semibold mb-3">Stabilized NOI Calculation</h4>
          <div className="space-y-2 bg-gray-50 p-4 rounded">
            <div className="flex justify-between text-sm">
              <span>Gross Potential Revenue:</span>
              <span className="font-medium">{formatCurrency(noiComponents.grossRevenue || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>- Vacancy ({noiComponents.vacancyRate}%):</span>
              <span className="font-medium text-red-600">
                -{formatCurrency(noiComponents.vacancyLoss || 0)}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2">
              <span>= Effective Gross Income:</span>
              <span className="font-medium">{formatCurrency(noiComponents.effectiveGrossIncome || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>- Operating Expenses:</span>
              <span className="font-medium text-red-600">
                -{formatCurrency(noiComponents.operatingExpenses || 0)}
              </span>
            </div>
            <div className="flex justify-between text-sm border-t pt-2 font-semibold">
              <span>= Net Operating Income:</span>
              <span className="text-green-600">{formatCurrency(data.stabilizedNOI || 0)}</span>
            </div>
          </div>
        </div>

        {/* Visual Comparison */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <p className="text-sm text-gray-600 mb-2">Stabilized NOI</p>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(data.stabilizedNOI || 0)}
            </p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <p className="text-sm text-gray-600 mb-2">Total Development Cost</p>
            <p className="text-3xl font-bold text-blue-600">
              {formatCurrency(data.totalCost || 0)}
            </p>
          </div>
        </div>

        {/* Result */}
        <div className="bg-indigo-100 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold text-indigo-900">Yield on Cost</p>
              <p className="text-sm text-indigo-700">
                Return on total investment at stabilization
              </p>
            </div>
            <span className="text-3xl font-bold text-indigo-600">{value}</span>
          </div>
        </div>

        {/* Comparison Metrics */}
        {data.comparisons && (
          <div>
            <h4 className="font-semibold mb-3">Market Comparison</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Market Cap Rate:</span>
                <span className="font-medium">{data.comparisons.marketCapRate}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Development Spread:</span>
                <span className="font-medium text-green-600">
                  {data.comparisons.developmentSpread} bps
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">{metric} Breakdown</h2>
            <p className="text-sm text-gray-600 mt-1">Detailed calculation and analysis</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyCalculation}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Copy calculation"
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <Copy className="w-5 h-5 text-gray-600" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
});

MetricBreakdown.displayName = 'MetricBreakdown';

export default MetricBreakdown;