import React, { useState, useEffect } from 'react';
import { StateFundingStructure, StateFundingSource } from '../types/cottonwoodHeights';
import { InfoTooltip } from './InfoTooltip';

interface StateFundingSectionProps {
  funding: StateFundingStructure;
  onChange: (funding: StateFundingStructure) => void;
}

const defaultFundingSources: StateFundingSource[] = [
  {
    name: 'Mixed-Use Development Grant',
    enabled: false,
    amount: 0,
    maxAmount: 2000000,
    equityReductionFactor: 1.0,
    requirements: ['Min 20% market rate housing', 'Public space component'],
    disbursementSchedule: 'milestone',
  },
  {
    name: 'Infrastructure Gap Financing',
    enabled: false,
    amount: 0,
    maxAmount: 5000000,
    equityReductionFactor: 0.9,
    requirements: ['Job creation targets', 'Economic impact study'],
    disbursementSchedule: 'upfront',
  },
  {
    name: 'Market Rate Housing Trust Fund',
    enabled: false,
    amount: 0,
    maxAmount: 1500000,
    equityReductionFactor: 1.0,
    requirements: ['78 rental townhomes qualify'],
    disbursementSchedule: 'completion',
  },
  {
    name: 'Green Building Initiative',
    enabled: false,
    amount: 0,
    maxAmount: 1000000,
    equityReductionFactor: 0.95,
    requirements: ['LEED Gold certification', 'Energy efficiency targets'],
    disbursementSchedule: 'milestone',
  },
  {
    name: 'Transit-Oriented Development Fund',
    enabled: false,
    amount: 0,
    maxAmount: 3000000,
    equityReductionFactor: 0.85,
    requirements: ['Within 0.5 miles of transit', 'Reduced parking ratios'],
    disbursementSchedule: 'upfront',
  },
];

export const StateFundingSection: React.FC<StateFundingSectionProps> = ({
  funding,
  onChange,
}) => {
  const [sources, setSources] = useState<StateFundingSource[]>(
    funding.sources.length > 0 ? funding.sources : defaultFundingSources
  );

  useEffect(() => {
    onChange({ ...funding, sources });
  }, [sources]);

  const calculateTotalEquityReduction = () => {
    return sources
      .filter((source) => source.enabled)
      .reduce((total, source) => {
        return total + source.amount * source.equityReductionFactor;
      }, 0);
  };

  const calculateTotalFunding = () => {
    return sources
      .filter((source) => source.enabled)
      .reduce((total, source) => total + source.amount, 0);
  };

  const toggleSource = (index: number) => {
    const updated = [...sources];
    updated[index].enabled = !updated[index].enabled;
    if (!updated[index].enabled) {
      updated[index].amount = 0;
    }
    setSources(updated);
  };

  const updateAmount = (index: number, amount: number) => {
    const updated = [...sources];
    updated[index].amount = Math.min(amount, updated[index].maxAmount);
    setSources(updated);
  };

  return (
    <div className="mb-4 p-4 border rounded-lg bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium flex items-center">
          State & Local Funding
          <InfoTooltip content="Available public funding sources that can reduce required equity" />
        </h4>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={funding.enabled}
            onChange={(e) => onChange({ ...funding, enabled: e.target.checked })}
            className="mr-2"
          />
          <span className="text-sm">Enabled</span>
        </label>
      </div>

      {funding.enabled && (
        <div className="space-y-4">
          {/* Funding Sources */}
          <div className="space-y-3">
            {sources.map((source, index) => (
              <div
                key={source.name}
                className={`p-4 rounded-lg border ${
                  source.enabled ? 'bg-white border-blue-300' : 'bg-gray-100 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={source.enabled}
                        onChange={() => toggleSource(index)}
                        className="mr-2"
                      />
                      <span className="font-medium text-gray-900">
                        {source.name}
                      </span>
                    </label>
                    <p className="text-sm text-gray-600 mt-1 ml-6">
                      Max: ${source.maxAmount.toLocaleString()} • Equity Factor:{' '}
                      {(source.equityReductionFactor * 100).toFixed(0)}%
                    </p>
                  </div>
                  {source.enabled && (
                    <div className="flex items-center">
                      <span className="text-sm text-gray-700 mr-2">$</span>
                      <input
                        type="number"
                        value={source.amount}
                        onChange={(e) => updateAmount(index, Number(e.target.value))}
                        max={source.maxAmount}
                        className="w-32 px-2 py-1 border border-gray-300 rounded"
                        placeholder="Amount"
                      />
                    </div>
                  )}
                </div>

                {source.enabled && (
                  <div className="ml-6 space-y-2">
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">
                        Requirements:
                      </span>
                      <ul className="list-disc list-inside text-gray-600 mt-1">
                        {source.requirements.map((req, reqIndex) => (
                          <li key={reqIndex}>{req}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">
                        Disbursement:
                      </span>
                      <span className="ml-2 text-gray-600">
                        {source.disbursementSchedule === 'upfront'
                          ? 'At closing'
                          : source.disbursementSchedule === 'milestone'
                          ? 'Based on milestones'
                          : 'At completion'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-blue-900 mb-3">
              Funding Summary
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-blue-700">Total Funding</p>
                <p className="text-xl font-bold text-blue-900">
                  ${calculateTotalFunding().toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-700">Equity Reduction</p>
                <p className="text-xl font-bold text-blue-900">
                  ${calculateTotalEquityReduction().toLocaleString()}
                </p>
              </div>
            </div>
            {calculateTotalFunding() > 0 && (
              <div className="mt-3 text-sm text-blue-700">
                <p>
                  Active Sources:{' '}
                  {sources.filter((s) => s.enabled).length} of {sources.length}
                </p>
                <p className="mt-1">
                  Weighted Equity Factor:{' '}
                  {(
                    (calculateTotalEquityReduction() / calculateTotalFunding()) *
                    100
                  ).toFixed(0)}
                  %
                </p>
              </div>
            )}
          </div>

          {/* Impact on Returns */}
          {calculateTotalEquityReduction() > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                <strong>Impact on Returns:</strong> State funding reduces required
                equity by ${calculateTotalEquityReduction().toLocaleString()},
                which will increase equity returns and reduce investment risk.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};