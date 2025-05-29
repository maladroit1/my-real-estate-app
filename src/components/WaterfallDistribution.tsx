import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  ComposedChart,
  Area,
  Sankey,
  Rectangle
} from 'recharts';
import {
  Plus,
  Minus,
  TrendingUp,
  DollarSign,
  Users,
  Info,
  ChevronRight,
  Settings
} from 'lucide-react';

interface WaterfallTier {
  id: string;
  minIRR: number;
  maxIRR: number;
  lpShare: number;
  gpShare: number;
}

interface WaterfallDistributionProps {
  totalDistributions: number;
  initialEquity: number;
  preferredReturn: number;
  sponsorPromote: number;
  setSponsorPromote: (value: number) => void;
  waterfallTiers: WaterfallTier[];
  setWaterfallTiers: (tiers: WaterfallTier[]) => void;
  equityStructure: {
    lpEquity: number;
    gpEquity: number;
    catchUp: boolean;
    catchUpPercentage: number;
  };
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export const WaterfallDistribution: React.FC<WaterfallDistributionProps> = React.memo(({
  totalDistributions,
  initialEquity,
  preferredReturn,
  sponsorPromote,
  setSponsorPromote,
  waterfallTiers,
  setWaterfallTiers,
  equityStructure
}) => {
  const [showComparison, setShowComparison] = useState(true);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Calculate waterfall distributions
  const calculateWaterfall = useMemo(() => {
    const lpCapital = initialEquity * (equityStructure.lpEquity / 100);
    const gpCapital = initialEquity * (equityStructure.gpEquity / 100);
    
    let remainingCash = totalDistributions;
    const distributions = {
      returnOfCapital: { lp: 0, gp: 0, total: 0 },
      preferredReturn: { lp: 0, gp: 0, total: 0 },
      catchUp: { lp: 0, gp: 0, total: 0 },
      profits: [] as Array<{ tier: number; lp: number; gp: number; total: number; irr: string }>,
      sponsorFee: 0
    };

    // Step 1: Return of Capital
    const lpCapitalReturn = Math.min(remainingCash, lpCapital);
    distributions.returnOfCapital.lp = lpCapitalReturn;
    remainingCash -= lpCapitalReturn;

    if (remainingCash > 0) {
      const gpCapitalReturn = Math.min(remainingCash, gpCapital);
      distributions.returnOfCapital.gp = gpCapitalReturn;
      remainingCash -= gpCapitalReturn;
    }
    distributions.returnOfCapital.total = distributions.returnOfCapital.lp + distributions.returnOfCapital.gp;

    // Step 2: Preferred Return
    if (remainingCash > 0) {
      const lpPreferred = Math.min(remainingCash, lpCapital * (preferredReturn / 100));
      distributions.preferredReturn.lp = lpPreferred;
      remainingCash -= lpPreferred;

      if (remainingCash > 0 && gpCapital > 0) {
        const gpPreferred = Math.min(remainingCash, gpCapital * (preferredReturn / 100));
        distributions.preferredReturn.gp = gpPreferred;
        remainingCash -= gpPreferred;
      }
    }
    distributions.preferredReturn.total = distributions.preferredReturn.lp + distributions.preferredReturn.gp;

    // Step 3: Catch-up (if enabled)
    if (remainingCash > 0 && equityStructure.catchUp) {
      const totalDistributedSoFar = distributions.returnOfCapital.total + distributions.preferredReturn.total;
      const targetGPShare = 0.20; // Typical 20% promote
      const targetGPAmount = (totalDistributedSoFar + remainingCash) * targetGPShare;
      const currentGPAmount = distributions.returnOfCapital.gp + distributions.preferredReturn.gp;
      const catchUpNeeded = Math.max(0, targetGPAmount - currentGPAmount);
      
      const catchUpAmount = Math.min(
        remainingCash,
        catchUpNeeded * (equityStructure.catchUpPercentage / 100)
      );
      
      distributions.catchUp.gp = catchUpAmount;
      distributions.catchUp.lp = 0;
      distributions.catchUp.total = catchUpAmount;
      remainingCash -= catchUpAmount;
    }

    // Step 4: Profit Splits by Tier
    if (remainingCash > 0) {
      waterfallTiers.forEach((tier, index) => {
        if (remainingCash > 0) {
          const tierAmount = remainingCash; // Simplified - in reality would calculate based on IRR hurdles
          const lpAmount = tierAmount * (tier.lpShare / 100);
          const gpAmount = tierAmount * (tier.gpShare / 100);
          
          distributions.profits.push({
            tier: index + 1,
            lp: lpAmount,
            gp: gpAmount,
            total: tierAmount,
            irr: `${tier.minIRR}-${tier.maxIRR}%`
          });
          
          remainingCash = 0; // Simplified - distribute all in first applicable tier
        }
      });
    }

    // Step 5: Sponsor Promote Fee
    const totalGPDistributions = distributions.returnOfCapital.gp + 
      distributions.preferredReturn.gp + 
      distributions.catchUp.gp +
      distributions.profits.reduce((sum, p) => sum + p.gp, 0);
    
    distributions.sponsorFee = totalGPDistributions * (sponsorPromote / 100);

    return distributions;
  }, [totalDistributions, initialEquity, preferredReturn, sponsorPromote, waterfallTiers, equityStructure]);

  // Calculate totals and metrics
  const calculateMetrics = useMemo(() => {
    const dist = calculateWaterfall;
    
    const lpTotal = dist.returnOfCapital.lp + 
      dist.preferredReturn.lp + 
      dist.catchUp.lp +
      dist.profits.reduce((sum, p) => sum + p.lp, 0);
    
    const gpTotalBeforePromote = dist.returnOfCapital.gp + 
      dist.preferredReturn.gp + 
      dist.catchUp.gp +
      dist.profits.reduce((sum, p) => sum + p.gp, 0);
    
    const gpTotalWithPromote = gpTotalBeforePromote + dist.sponsorFee;
    
    const lpCapital = initialEquity * (equityStructure.lpEquity / 100);
    const gpCapital = initialEquity * (equityStructure.gpEquity / 100);
    
    const lpMultiple = lpCapital > 0 ? lpTotal / lpCapital : 0;
    const gpMultipleBeforePromote = gpCapital > 0 ? gpTotalBeforePromote / gpCapital : 0;
    const gpMultipleWithPromote = gpCapital > 0 ? gpTotalWithPromote / gpCapital : 0;
    
    const effectiveGPPercentage = totalDistributions > 0 ? (gpTotalWithPromote / totalDistributions) * 100 : 0;
    
    return {
      lpTotal,
      gpTotalBeforePromote,
      gpTotalWithPromote,
      lpMultiple,
      gpMultipleBeforePromote,
      gpMultipleWithPromote,
      effectiveGPPercentage,
      promoteImpact: gpTotalWithPromote - gpTotalBeforePromote
    };
  }, [calculateWaterfall, initialEquity, equityStructure, totalDistributions]);

  // Prepare chart data
  const waterfallChartData = useMemo(() => {
    const dist = calculateWaterfall;
    const data = [
      {
        name: 'Return of Capital',
        LP: dist.returnOfCapital.lp,
        GP: dist.returnOfCapital.gp,
        total: dist.returnOfCapital.total
      },
      {
        name: 'Preferred Return',
        LP: dist.preferredReturn.lp,
        GP: dist.preferredReturn.gp,
        total: dist.preferredReturn.total
      }
    ];

    if (dist.catchUp.total > 0) {
      data.push({
        name: 'GP Catch-up',
        LP: dist.catchUp.lp,
        GP: dist.catchUp.gp,
        total: dist.catchUp.total
      });
    }

    dist.profits.forEach((profit, index) => {
      data.push({
        name: `Tier ${profit.tier} (${profit.irr})`,
        LP: profit.lp,
        GP: profit.gp,
        total: profit.total
      });
    });

    if (dist.sponsorFee > 0) {
      data.push({
        name: 'Sponsor Promote',
        LP: 0,
        GP: dist.sponsorFee,
        total: dist.sponsorFee
      });
    }

    return data;
  }, [calculateWaterfall]);

  // Flow diagram data
  const flowData = useMemo(() => {
    const nodes = [
      { name: 'Total Distributions' },
      { name: 'Return of Capital' },
      { name: 'Preferred Return' },
      { name: 'Profit Sharing' },
      { name: 'LP Returns' },
      { name: 'GP Returns' },
      { name: 'Sponsor Promote' }
    ];

    const links = [
      { source: 0, target: 1, value: calculateWaterfall.returnOfCapital.total },
      { source: 0, target: 2, value: calculateWaterfall.preferredReturn.total },
      { source: 0, target: 3, value: totalDistributions - calculateWaterfall.returnOfCapital.total - calculateWaterfall.preferredReturn.total },
      { source: 1, target: 4, value: calculateWaterfall.returnOfCapital.lp },
      { source: 1, target: 5, value: calculateWaterfall.returnOfCapital.gp },
      { source: 2, target: 4, value: calculateWaterfall.preferredReturn.lp },
      { source: 2, target: 5, value: calculateWaterfall.preferredReturn.gp },
      { source: 3, target: 4, value: calculateWaterfall.profits.reduce((sum, p) => sum + p.lp, 0) },
      { source: 3, target: 5, value: calculateWaterfall.profits.reduce((sum, p) => sum + p.gp, 0) + calculateWaterfall.catchUp.gp },
      { source: 5, target: 6, value: calculateWaterfall.sponsorFee }
    ].filter(link => link.value > 0);

    return { nodes, links };
  }, [calculateWaterfall, totalDistributions]);

  const addTier = () => {
    const lastTier = waterfallTiers[waterfallTiers.length - 1];
    const newTier: WaterfallTier = {
      id: Date.now().toString(),
      minIRR: lastTier ? lastTier.maxIRR : 15,
      maxIRR: lastTier ? lastTier.maxIRR + 5 : 20,
      lpShare: 50,
      gpShare: 50
    };
    setWaterfallTiers([...waterfallTiers, newTier]);
  };

  const removeTier = (id: string) => {
    if (waterfallTiers.length > 1) {
      setWaterfallTiers(waterfallTiers.filter(tier => tier.id !== id));
    }
  };

  const updateTier = (id: string, field: keyof WaterfallTier, value: number) => {
    setWaterfallTiers(waterfallTiers.map(tier => 
      tier.id === id ? { ...tier, [field]: value } : tier
    ));
  };

  return (
    <div className="space-y-6">
      {/* Sponsor Promote Slider */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Sponsor/GP Promote Fee</h3>
          <span className="text-2xl font-bold text-purple-600">{sponsorPromote}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="50"
          step="0.5"
          value={sponsorPromote}
          onChange={(e) => setSponsorPromote(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #8B5CF6 0%, #8B5CF6 ${sponsorPromote * 2}%, #E5E7EB ${sponsorPromote * 2}%, #E5E7EB 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
        </div>
      </div>

      {/* Waterfall Tiers Management */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Waterfall Tiers</h3>
          <button
            onClick={addTier}
            className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Tier
          </button>
        </div>
        
        <div className="space-y-3">
          {waterfallTiers.map((tier, index) => (
            <div key={tier.id} className="bg-white p-4 rounded-lg border">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium">Tier {index + 1}</h4>
                {waterfallTiers.length > 1 && (
                  <button
                    onClick={() => removeTier(tier.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-gray-600">Min IRR (%)</label>
                  <input
                    type="number"
                    value={tier.minIRR}
                    onChange={(e) => updateTier(tier.id, 'minIRR', Number(e.target.value))}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Max IRR (%)</label>
                  <input
                    type="number"
                    value={tier.maxIRR}
                    onChange={(e) => updateTier(tier.id, 'maxIRR', Number(e.target.value))}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">LP Share (%)</label>
                  <input
                    type="number"
                    value={tier.lpShare}
                    onChange={(e) => updateTier(tier.id, 'lpShare', Number(e.target.value))}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">GP Share (%)</label>
                  <input
                    type="number"
                    value={tier.gpShare}
                    onChange={(e) => updateTier(tier.id, 'gpShare', Number(e.target.value))}
                    className="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Waterfall Distribution Chart */}
      <div>
        <h3 className="font-semibold mb-4">Distribution Waterfall</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={waterfallChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="LP" stackId="a" fill="#3B82F6" />
              <Bar dataKey="GP" stackId="a" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distribution Table */}
      <div>
        <h3 className="font-semibold mb-4">Distribution Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Distribution Type</th>
                <th className="text-right py-2">LP Amount</th>
                <th className="text-right py-2">GP Amount</th>
                <th className="text-right py-2">Total</th>
                <th className="text-right py-2">% of Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2">Return of Capital</td>
                <td className="text-right">{formatCurrency(calculateWaterfall.returnOfCapital.lp)}</td>
                <td className="text-right">{formatCurrency(calculateWaterfall.returnOfCapital.gp)}</td>
                <td className="text-right font-medium">{formatCurrency(calculateWaterfall.returnOfCapital.total)}</td>
                <td className="text-right">{formatPercent((calculateWaterfall.returnOfCapital.total / totalDistributions) * 100)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">Preferred Return ({preferredReturn}%)</td>
                <td className="text-right">{formatCurrency(calculateWaterfall.preferredReturn.lp)}</td>
                <td className="text-right">{formatCurrency(calculateWaterfall.preferredReturn.gp)}</td>
                <td className="text-right font-medium">{formatCurrency(calculateWaterfall.preferredReturn.total)}</td>
                <td className="text-right">{formatPercent((calculateWaterfall.preferredReturn.total / totalDistributions) * 100)}</td>
              </tr>
              {calculateWaterfall.catchUp.total > 0 && (
                <tr className="border-b">
                  <td className="py-2">GP Catch-up</td>
                  <td className="text-right">{formatCurrency(calculateWaterfall.catchUp.lp)}</td>
                  <td className="text-right">{formatCurrency(calculateWaterfall.catchUp.gp)}</td>
                  <td className="text-right font-medium">{formatCurrency(calculateWaterfall.catchUp.total)}</td>
                  <td className="text-right">{formatPercent((calculateWaterfall.catchUp.total / totalDistributions) * 100)}</td>
                </tr>
              )}
              {calculateWaterfall.profits.map((profit, index) => (
                <tr key={index} className="border-b">
                  <td className="py-2">Tier {profit.tier} Profits ({profit.irr})</td>
                  <td className="text-right">{formatCurrency(profit.lp)}</td>
                  <td className="text-right">{formatCurrency(profit.gp)}</td>
                  <td className="text-right font-medium">{formatCurrency(profit.total)}</td>
                  <td className="text-right">{formatPercent((profit.total / totalDistributions) * 100)}</td>
                </tr>
              ))}
              {calculateWaterfall.sponsorFee > 0 && (
                <tr className="border-b bg-purple-50">
                  <td className="py-2 font-medium">Sponsor Promote</td>
                  <td className="text-right">-</td>
                  <td className="text-right font-medium text-purple-600">{formatCurrency(calculateWaterfall.sponsorFee)}</td>
                  <td className="text-right font-medium text-purple-600">{formatCurrency(calculateWaterfall.sponsorFee)}</td>
                  <td className="text-right">{formatPercent((calculateWaterfall.sponsorFee / totalDistributions) * 100)}</td>
                </tr>
              )}
              <tr className="font-bold bg-gray-50">
                <td className="py-2">Total</td>
                <td className="text-right">{formatCurrency(calculateMetrics.lpTotal)}</td>
                <td className="text-right">{formatCurrency(calculateMetrics.gpTotalWithPromote)}</td>
                <td className="text-right">{formatCurrency(totalDistributions)}</td>
                <td className="text-right">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">LP Multiple</p>
          <p className="text-2xl font-bold text-blue-600">{calculateMetrics.lpMultiple.toFixed(2)}x</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">GP Multiple (w/o Promote)</p>
          <p className="text-2xl font-bold text-green-600">{calculateMetrics.gpMultipleBeforePromote.toFixed(2)}x</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">GP Multiple (w/ Promote)</p>
          <p className="text-2xl font-bold text-purple-600">{calculateMetrics.gpMultipleWithPromote.toFixed(2)}x</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Effective GP %</p>
          <p className="text-2xl font-bold text-orange-600">{formatPercent(calculateMetrics.effectiveGPPercentage)}</p>
        </div>
      </div>

      {/* Scenario Comparison */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Scenario Comparison</h3>
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {showComparison ? 'Hide' : 'Show'} Comparison
          </button>
        </div>
        
        {showComparison && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium mb-2">Metric</p>
                <p className="py-1">LP Total Return</p>
                <p className="py-1">GP Total Return</p>
                <p className="py-1">GP Share of Profits</p>
                <p className="py-1">Promote Impact</p>
              </div>
              <div className="text-center">
                <p className="font-medium mb-2">Without Promote</p>
                <p className="py-1">{formatCurrency(calculateMetrics.lpTotal)}</p>
                <p className="py-1">{formatCurrency(calculateMetrics.gpTotalBeforePromote)}</p>
                <p className="py-1">{formatPercent((calculateMetrics.gpTotalBeforePromote / totalDistributions) * 100)}</p>
                <p className="py-1">-</p>
              </div>
              <div className="text-center">
                <p className="font-medium mb-2">With Promote</p>
                <p className="py-1">{formatCurrency(calculateMetrics.lpTotal)}</p>
                <p className="py-1 text-purple-600 font-medium">{formatCurrency(calculateMetrics.gpTotalWithPromote)}</p>
                <p className="py-1 text-purple-600 font-medium">{formatPercent(calculateMetrics.effectiveGPPercentage)}</p>
                <p className="py-1 text-purple-600 font-medium">+{formatCurrency(calculateMetrics.promoteImpact)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Flow Visualization */}
      <div>
        <h3 className="font-semibold mb-4">Distribution Flow</h3>
        <div className="bg-white p-6 rounded-lg border">
          <div className="space-y-4">
            {/* Simplified flow diagram using divs */}
            <div className="flex items-center justify-between">
              <div className="bg-blue-100 p-4 rounded-lg text-center flex-1">
                <p className="text-sm text-gray-600">Total Distributions</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(totalDistributions)}</p>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400 mx-2" />
              <div className="flex-1 space-y-2">
                <div className="bg-gray-100 p-2 rounded text-sm">
                  Return of Capital: {formatCurrency(calculateWaterfall.returnOfCapital.total)}
                </div>
                <div className="bg-gray-100 p-2 rounded text-sm">
                  Preferred Return: {formatCurrency(calculateWaterfall.preferredReturn.total)}
                </div>
                <div className="bg-gray-100 p-2 rounded text-sm">
                  Profit Sharing: {formatCurrency(totalDistributions - calculateWaterfall.returnOfCapital.total - calculateWaterfall.preferredReturn.total)}
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400 mx-2" />
              <div className="flex-1 space-y-2">
                <div className="bg-blue-100 p-3 rounded">
                  <p className="text-sm text-gray-600">LP Returns</p>
                  <p className="font-bold text-blue-600">{formatCurrency(calculateMetrics.lpTotal)}</p>
                </div>
                <div className="bg-green-100 p-3 rounded">
                  <p className="text-sm text-gray-600">GP Returns</p>
                  <p className="font-bold text-green-600">{formatCurrency(calculateMetrics.gpTotalBeforePromote)}</p>
                </div>
                {calculateWaterfall.sponsorFee > 0 && (
                  <div className="bg-purple-100 p-3 rounded">
                    <p className="text-sm text-gray-600">+ Promote</p>
                    <p className="font-bold text-purple-600">{formatCurrency(calculateWaterfall.sponsorFee)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

WaterfallDistribution.displayName = 'WaterfallDistribution';

export default WaterfallDistribution;