import React, { useState, useCallback, useEffect } from 'react';
import { GroundLeaseStructure } from '../types/cottonwoodHeights';
import { GroundLeaseCalculator } from '../utils/groundLeaseCalculator';
import { InfoTooltip } from './InfoTooltip';

interface GroundLeaseSectionProps {
  groundLease: GroundLeaseStructure;
  onChange: (groundLease: GroundLeaseStructure) => void;
  projectedRevenue?: number;
  projectedNOI?: number;
}

export const GroundLeaseSection: React.FC<GroundLeaseSectionProps> = ({
  groundLease,
  onChange,
  projectedRevenue = 0,
  projectedNOI = 0,
}) => {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const calculator = new GroundLeaseCalculator(groundLease);

  useEffect(() => {
    const validation = calculator.validatePaymentStructure();
    setValidationErrors(validation.errors);
  }, [groundLease]);

  const calculateGroundRent = useCallback(() => {
    const payment = calculator.calculateAnnualPayment(1, projectedRevenue, projectedNOI);
    return payment.totalPayment;
  }, [groundLease, projectedRevenue, projectedNOI]);

  return (
    <div className="mb-4 p-4 border rounded-lg bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium">Ground Lease</h4>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={groundLease.enabled}
            onChange={(e) =>
              onChange({ ...groundLease, enabled: e.target.checked })
            }
            className="mr-2"
          />
          <span className="text-sm">Enabled</span>
        </label>
      </div>

      {groundLease.enabled && (
        <div className="space-y-4">
          {/* By Parcel Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="byParcel"
              checked={groundLease.byParcel}
              onChange={(e) =>
                onChange({ ...groundLease, byParcel: e.target.checked })
              }
              className="rounded border-gray-300"
            />
            <label htmlFor="byParcel" className="text-sm font-medium text-gray-700">
              Calculate ground lease by parcel
            </label>
            <InfoTooltip content="When enabled, ground lease will be calculated separately for each parcel (retail, grocery, townhomes) with different rates" />
          </div>

          {/* Acquisition Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Land Acquisition Type
            </label>
            <select
              value={groundLease.acquisitionType}
              onChange={(e) =>
                onChange({
                  ...groundLease,
                  acquisitionType: e.target.value as 'donation' | 'purchase',
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="donation">Ground Donation</option>
              <option value="purchase">Ground Purchase</option>
            </select>
          </div>

          {/* Payment Structure */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
              Payment Structure
              <InfoTooltip content="Choose how ground lease payments are calculated" />
            </label>
            <select
              value={groundLease.paymentStructure}
              onChange={(e) =>
                onChange({
                  ...groundLease,
                  paymentStructure: e.target.value as any,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="percentage_revenue">% of Gross Revenue (1-3%)</option>
              <option value="percentage_noi">% of NOI (10-25%)</option>
              <option value="base_plus_percentage">Base + Percentage</option>
            </select>
          </div>

          {/* Payment Structure Specific Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groundLease.paymentStructure === 'base_plus_percentage' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Annual Base Rent
                </label>
                <input
                  type="number"
                  value={groundLease.baseRate}
                  onChange={(e) =>
                    onChange({
                      ...groundLease,
                      baseRate: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {groundLease.paymentStructure === 'percentage_revenue'
                  ? 'Percentage of Revenue (%)'
                  : groundLease.paymentStructure === 'percentage_noi'
                  ? 'Percentage of NOI (%)'
                  : 'Additional Percentage (%)'}
              </label>
              <input
                type="number"
                value={groundLease.percentageRate * 100}
                onChange={(e) =>
                  onChange({
                    ...groundLease,
                    percentageRate: Number(e.target.value) / 100,
                  })
                }
                step="0.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              {groundLease.paymentStructure === 'percentage_revenue' && (
                <p className="text-xs text-gray-500 mt-1">
                  Industry standard: 1-3% of gross revenue
                </p>
              )}
              {groundLease.paymentStructure === 'percentage_noi' && (
                <p className="text-xs text-gray-500 mt-1">
                  Industry standard: 10-25% of NOI
                </p>
              )}
            </div>
          </div>

          {/* Escalation */}
          <div className="border-t pt-4">
            <h5 className="text-sm font-medium text-gray-700 mb-3">Escalation</h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Escalation Type
                </label>
                <select
                  value={groundLease.escalation.type}
                  onChange={(e) =>
                    onChange({
                      ...groundLease,
                      escalation: {
                        ...groundLease.escalation,
                        type: e.target.value as 'cpi' | 'fixed',
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="fixed">Fixed Rate</option>
                  <option value="cpi">CPI Indexed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Annual Escalation (%)
                </label>
                <input
                  type="number"
                  value={groundLease.escalation.rate * 100}
                  onChange={(e) =>
                    onChange({
                      ...groundLease,
                      escalation: {
                        ...groundLease.escalation,
                        rate: Number(e.target.value) / 100,
                      },
                    })
                  }
                  step="0.25"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Annual Cap (%)
                </label>
                <input
                  type="number"
                  value={groundLease.escalation.cap * 100}
                  onChange={(e) =>
                    onChange({
                      ...groundLease,
                      escalation: {
                        ...groundLease.escalation,
                        cap: Number(e.target.value) / 100,
                      },
                    })
                  }
                  step="0.25"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Parcel-Specific Settings */}
          {groundLease.byParcel && (
            <div className="border-t pt-4">
              <h5 className="text-sm font-medium text-gray-700 mb-3">Parcel-Specific Ground Lease Rates</h5>
              <div className="space-y-3">
                {/* Retail Parcel */}
                <div className="p-3 bg-white border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-medium text-sm">Retail Parcel</label>
                    <input
                      type="checkbox"
                      checked={groundLease.parcelSettings?.retail?.enabled ?? true}
                      onChange={(e) =>
                        onChange({
                          ...groundLease,
                          parcelSettings: {
                            ...groundLease.parcelSettings,
                            retail: {
                              ...groundLease.parcelSettings?.retail,
                              enabled: e.target.checked,
                              percentageRate: groundLease.parcelSettings?.retail?.percentageRate ?? 0.15,
                              baseRate: groundLease.parcelSettings?.retail?.baseRate ?? 0,
                            },
                          },
                        })
                      }
                      className="rounded border-gray-300"
                    />
                  </div>
                  {groundLease.parcelSettings?.retail?.enabled && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">% of NOI</label>
                        <input
                          type="number"
                          value={(groundLease.parcelSettings?.retail?.percentageRate ?? 0.15) * 100}
                          onChange={(e) =>
                            onChange({
                              ...groundLease,
                              parcelSettings: {
                                ...groundLease.parcelSettings,
                                retail: {
                                  ...groundLease.parcelSettings?.retail,
                                  enabled: true,
                                  percentageRate: Number(e.target.value) / 100,
                                  baseRate: groundLease.parcelSettings?.retail?.baseRate ?? 0,
                                },
                              },
                            })
                          }
                          step="0.1"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Grocery Parcel */}
                <div className="p-3 bg-white border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-medium text-sm">Grocery Parcel</label>
                    <input
                      type="checkbox"
                      checked={groundLease.parcelSettings?.grocery?.enabled ?? true}
                      onChange={(e) =>
                        onChange({
                          ...groundLease,
                          parcelSettings: {
                            ...groundLease.parcelSettings,
                            grocery: {
                              ...groundLease.parcelSettings?.grocery,
                              enabled: e.target.checked,
                              percentageRate: groundLease.parcelSettings?.grocery?.percentageRate ?? 0.12,
                              baseRate: groundLease.parcelSettings?.grocery?.baseRate ?? 0,
                            },
                          },
                        })
                      }
                      className="rounded border-gray-300"
                    />
                  </div>
                  {groundLease.parcelSettings?.grocery?.enabled && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">% of NOI</label>
                        <input
                          type="number"
                          value={(groundLease.parcelSettings?.grocery?.percentageRate ?? 0.12) * 100}
                          onChange={(e) =>
                            onChange({
                              ...groundLease,
                              parcelSettings: {
                                ...groundLease.parcelSettings,
                                grocery: {
                                  ...groundLease.parcelSettings?.grocery,
                                  enabled: true,
                                  percentageRate: Number(e.target.value) / 100,
                                  baseRate: groundLease.parcelSettings?.grocery?.baseRate ?? 0,
                                },
                              },
                            })
                          }
                          step="0.1"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Townhomes Parcel */}
                <div className="p-3 bg-white border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-medium text-sm">Townhomes Parcel</label>
                    <input
                      type="checkbox"
                      checked={groundLease.parcelSettings?.townhomes?.enabled ?? true}
                      onChange={(e) =>
                        onChange({
                          ...groundLease,
                          parcelSettings: {
                            ...groundLease.parcelSettings,
                            townhomes: {
                              ...groundLease.parcelSettings?.townhomes,
                              enabled: e.target.checked,
                              percentageRate: groundLease.parcelSettings?.townhomes?.percentageRate ?? 0.10,
                              baseRate: groundLease.parcelSettings?.townhomes?.baseRate ?? 0,
                            },
                          },
                        })
                      }
                      className="rounded border-gray-300"
                    />
                  </div>
                  {groundLease.parcelSettings?.townhomes?.enabled && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">% of NOI</label>
                        <input
                          type="number"
                          value={(groundLease.parcelSettings?.townhomes?.percentageRate ?? 0.10) * 100}
                          onChange={(e) =>
                            onChange({
                              ...groundLease,
                              parcelSettings: {
                                ...groundLease.parcelSettings,
                                townhomes: {
                                  ...groundLease.parcelSettings?.townhomes,
                                  enabled: true,
                                  percentageRate: Number(e.target.value) / 100,
                                  baseRate: groundLease.parcelSettings?.townhomes?.baseRate ?? 0,
                                },
                              },
                            })
                          }
                          step="0.1"
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h5 className="text-sm font-medium text-red-800 mb-1">
                Validation Issues:
              </h5>
              <ul className="list-disc list-inside text-sm text-red-700">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Ground Rent Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-blue-900 mb-2">
              Estimated Annual Ground Rent
            </h5>
            <p className="text-2xl font-bold text-blue-900">
              ${calculateGroundRent().toLocaleString()}
            </p>
            {projectedRevenue > 0 && (
              <p className="text-sm text-blue-700 mt-1">
                {((calculateGroundRent() / projectedRevenue) * 100).toFixed(2)}% of
                projected revenue
              </p>
            )}
            {projectedNOI > 0 && (
              <p className="text-sm text-blue-700">
                {((calculateGroundRent() / projectedNOI) * 100).toFixed(2)}% of
                projected NOI
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};