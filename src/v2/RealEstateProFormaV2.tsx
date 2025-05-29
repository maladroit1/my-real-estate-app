import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Menu, X, ChevronLeft, ChevronRight, Save, Calculator,
  FileText, TrendingUp, Building2, DollarSign, Settings, Users,
  BarChart as BarChartIcon
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ScenarioManager, Project, Scenario, ScenarioData } from './features/ScenarioManager';
import { PDFExportSystem } from './features/PDFExportSystem';
import { AIInsightsIntegration } from '../components/AIInsightsIntegration';
import { ErrorOverview } from '../components/ErrorOverview';

// Import form components from v1 (we'll adapt these)
interface PropertyData {
  address: string;
  purchasePrice: number;
  closingCosts: number;
  renovationCosts: number;
  monthlyRent: number;
  otherIncome: number;
  vacancyRate: number;
  propertyTax: number;
  insurance: number;
  utilities: number;
  maintenance: number;
  management: number;
  hoa: number;
  other: number;
  downPaymentPercent: number;
  interestRate: number;
  loanTermYears: number;
}

// Form Component
const PropertyForm: React.FC<{
  data: PropertyData;
  onChange: (data: PropertyData) => void;
  locked: boolean;
}> = ({ data, onChange, locked }) => {
  const handleChange = (field: keyof PropertyData, value: string) => {
    onChange({
      ...data,
      [field]: field === 'address' ? value : parseFloat(value) || 0
    });
  };

  return (
    <div className="space-y-6">
      {/* Property Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 size={20} />
          Property Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Property Address</label>
            <input
              type="text"
              value={data.address}
              onChange={(e) => handleChange('address', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price</label>
            <input
              type="number"
              value={data.purchasePrice}
              onChange={(e) => handleChange('purchasePrice', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Closing Costs</label>
            <input
              type="number"
              value={data.closingCosts}
              onChange={(e) => handleChange('closingCosts', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Renovation Costs</label>
            <input
              type="number"
              value={data.renovationCosts}
              onChange={(e) => handleChange('renovationCosts', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Income */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <DollarSign size={20} />
          Income
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent</label>
            <input
              type="number"
              value={data.monthlyRent}
              onChange={(e) => handleChange('monthlyRent', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Other Income</label>
            <input
              type="number"
              value={data.otherIncome}
              onChange={(e) => handleChange('otherIncome', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vacancy Rate (%)</label>
            <input
              type="number"
              value={data.vacancyRate}
              onChange={(e) => handleChange('vacancyRate', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Expenses */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Operating Expenses</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Property Tax (Annual)</label>
            <input
              type="number"
              value={data.propertyTax}
              onChange={(e) => handleChange('propertyTax', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Insurance (Annual)</label>
            <input
              type="number"
              value={data.insurance}
              onChange={(e) => handleChange('insurance', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Utilities (Monthly)</label>
            <input
              type="number"
              value={data.utilities}
              onChange={(e) => handleChange('utilities', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance (Monthly)</label>
            <input
              type="number"
              value={data.maintenance}
              onChange={(e) => handleChange('maintenance', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Management (Monthly)</label>
            <input
              type="number"
              value={data.management}
              onChange={(e) => handleChange('management', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">HOA (Monthly)</label>
            <input
              type="number"
              value={data.hoa}
              onChange={(e) => handleChange('hoa', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Financing */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Financing</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Down Payment (%)</label>
            <input
              type="number"
              value={data.downPaymentPercent}
              onChange={(e) => handleChange('downPaymentPercent', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
            <input
              type="number"
              step="0.1"
              value={data.interestRate}
              onChange={(e) => handleChange('interestRate', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loan Term (Years)</label>
            <input
              type="number"
              value={data.loanTermYears}
              onChange={(e) => handleChange('loanTermYears', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Equity Structure and Sponsor Fees Component
const EquityStructurePanel: React.FC<{
  compensationType: 'promote' | 'sponsorFee';
  setCompensationType: (type: 'promote' | 'sponsorFee') => void;
  sponsorFees: any;
  setSponsorFees: (fees: any) => void;
  equityStructure: any;
  setEquityStructure: (structure: any) => void;
  waterfallTiers: any[];
  setWaterfallTiers: (tiers: any[]) => void;
  locked: boolean;
}> = ({ 
  compensationType, 
  setCompensationType, 
  sponsorFees, 
  setSponsorFees, 
  equityStructure, 
  setEquityStructure,
  waterfallTiers,
  setWaterfallTiers,
  locked 
}) => {
  const handleSponsorFeeChange = (field: string, value: string) => {
    setSponsorFees({
      ...sponsorFees,
      [field]: parseFloat(value) || 0
    });
  };

  const handleEquityChange = (field: string, value: string) => {
    setEquityStructure({
      ...equityStructure,
      [field]: field.includes('Equity') || field.includes('Percentage') ? parseFloat(value) || 0 : value
    });
  };
  
  // Helper functions for fee timing calculations
  const calculateCashOnCashWithTiming = (year: number): number => {
    // Mock calculation - replace with actual cash flow logic
    return 8.5;
  };
  
  const calculateStandardCashOnCash = (year: number): number => {
    // Mock calculation - replace with actual cash flow logic
    return 7.2;
  };
  
  const calculateTotalDeferredFees = (): number => {
    // Mock calculation - replace with actual deferred fee logic
    return 125000;
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  
  // Mock operating assumptions - replace with actual data
  const operatingAssumptions = {
    holdPeriod: 5
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Users size={20} />
        Equity Structure & Compensation
      </h3>

      {/* Compensation Type Toggle */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Compensation Type</label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="promote"
              checked={compensationType === 'promote'}
              onChange={() => setCompensationType('promote')}
              disabled={locked}
              className="mr-2"
            />
            <span>Waterfall Promote</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="sponsorFee"
              checked={compensationType === 'sponsorFee'}
              onChange={() => setCompensationType('sponsorFee')}
              disabled={locked}
              className="mr-2"
            />
            <span>Sponsor Fees</span>
          </label>
        </div>
      </div>

      {/* Equity Split */}
      <div className="mb-6">
        <h4 className="font-medium mb-3">Equity Split</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">LP Equity (%)</label>
            <input
              type="number"
              value={equityStructure.lpEquity}
              onChange={(e) => handleEquityChange('lpEquity', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GP Equity (%)</label>
            <input
              type="number"
              value={equityStructure.gpEquity}
              onChange={(e) => handleEquityChange('gpEquity', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
        </div>
      </div>

      {compensationType === 'sponsorFee' ? (
        <div className="space-y-6">
          {/* One-time Fees */}
          <div>
            <h4 className="font-medium mb-3">One-time Fees</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Acquisition Fee (% of total project cost)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={sponsorFees.acquisitionFee}
                  onChange={(e) => handleSponsorFeeChange('acquisitionFee', e.target.value)}
                  disabled={locked}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Development Fee (% of total project cost)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={sponsorFees.developmentFee}
                  onChange={(e) => handleSponsorFeeChange('developmentFee', e.target.value)}
                  disabled={locked}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Construction Management Fee (% of hard costs)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={sponsorFees.constructionManagementFee}
                  onChange={(e) => handleSponsorFeeChange('constructionManagementFee', e.target.value)}
                  disabled={locked}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Disposition Fee (% of gross sale price)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={sponsorFees.dispositionFee}
                  onChange={(e) => handleSponsorFeeChange('dispositionFee', e.target.value)}
                  disabled={locked}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Ongoing Fees */}
          <div>
            <h4 className="font-medium mb-3">Ongoing Fees</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asset Management Fee (% of EGR annually)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={sponsorFees.assetManagementFee}
                  onChange={(e) => handleSponsorFeeChange('assetManagementFee', e.target.value)}
                  disabled={locked}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Management Fee (% of EGR)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={sponsorFees.propertyManagementFee}
                  onChange={(e) => handleSponsorFeeChange('propertyManagementFee', e.target.value)}
                  disabled={locked}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Performance Structure */}
          <div>
            <h4 className="font-medium mb-3">Performance Structure</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fee Structure Type</label>
                <select
                  value={sponsorFees.feeStructureType}
                  onChange={(e) => setSponsorFees({ ...sponsorFees, feeStructureType: e.target.value })}
                  disabled={locked}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="standard">Standard (Full fees regardless of performance)</option>
                  <option value="performance">Performance-based (Reduced fees below hurdle)</option>
                </select>
              </div>
              {sponsorFees.feeStructureType === 'performance' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Performance Hurdle (% preferred return)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={sponsorFees.performanceHurdle}
                      onChange={(e) => handleSponsorFeeChange('performanceHurdle', e.target.value)}
                      disabled={locked}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reduced Fee % (if below hurdle)
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={sponsorFees.reducedFeePercent}
                      onChange={(e) => handleSponsorFeeChange('reducedFeePercent', e.target.value)}
                      disabled={locked}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Fee Timing Options - Add after the fee percentage inputs */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Fee Timing & Deferral Options</h4>
          
          {/* Acquisition Fee Deferral */}
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="deferAcquisition"
                checked={sponsorFees.timing.deferAcquisitionFee}
                onChange={(e) => setSponsorFees({
                  ...sponsorFees,
                  timing: { ...sponsorFees.timing, deferAcquisitionFee: e.target.checked }
                })}
                className="mr-2"
              />
              <label htmlFor="deferAcquisition" className="text-sm text-gray-700">
                Defer acquisition fee to improve initial returns
              </label>
            </div>
            
            {sponsorFees.timing.deferAcquisitionFee && (
              <div className="ml-6">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Deferral Period (Months)
                </label>
                <input
                  type="number"
                  value={sponsorFees.timing.acquisitionFeeDeferralMonths}
                  onChange={(e) => setSponsorFees({
                    ...sponsorFees,
                    timing: { ...sponsorFees.timing, acquisitionFeeDeferralMonths: Number(e.target.value) }
                  })}
                  className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            )}
            
            {/* Asset Management Fee Deferral */}
            <div className="flex items-center mt-3">
              <input
                type="checkbox"
                id="deferAssetMgmt"
                checked={sponsorFees.timing.assetMgmtDeferral.enabled}
                onChange={(e) => setSponsorFees({
                  ...sponsorFees,
                  timing: {
                    ...sponsorFees.timing,
                    assetMgmtDeferral: { ...sponsorFees.timing.assetMgmtDeferral, enabled: e.target.checked }
                  }
                })}
                className="mr-2"
              />
              <label htmlFor="deferAssetMgmt" className="text-sm text-gray-700">
                Defer asset management fees during lease-up
              </label>
            </div>
            
            {sponsorFees.timing.assetMgmtDeferral.enabled && (
              <div className="ml-6 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Start Collection Year
                  </label>
                  <input
                    type="number"
                    value={sponsorFees.timing.assetMgmtDeferral.startYear}
                    onChange={(e) => setSponsorFees({
                      ...sponsorFees,
                      timing: {
                        ...sponsorFees.timing,
                        assetMgmtDeferral: {
                          ...sponsorFees.timing.assetMgmtDeferral,
                          startYear: Number(e.target.value)
                        }
                      }
                    })}
                    min="1"
                    max={operatingAssumptions.holdPeriod}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Accrual Rate (%)
                  </label>
                  <input
                    type="number"
                    value={sponsorFees.timing.assetMgmtDeferral.accruedRate}
                    onChange={(e) => setSponsorFees({
                      ...sponsorFees,
                      timing: {
                        ...sponsorFees.timing,
                        assetMgmtDeferral: {
                          ...sponsorFees.timing.assetMgmtDeferral,
                          accruedRate: Number(e.target.value)
                        }
                      }
                    })}
                    step="0.5"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            )}
            
            {/* Development Fee Payout */}
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Development Fee Payout Schedule
              </label>
              <select
                value={sponsorFees.timing.developmentFeePayout}
                onChange={(e) => setSponsorFees({
                  ...sponsorFees,
                  timing: { ...sponsorFees.timing, developmentFeePayout: e.target.value as any }
                })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="upfront">100% at Closing</option>
                <option value="milestone">Milestone-Based</option>
                <option value="completion">At Completion</option>
              </select>
            </div>
            
            {/* Disposition Fee Structure */}
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Disposition Fee Structure
              </label>
              <select
                value={sponsorFees.timing.dispositionFeeStructure}
                onChange={(e) => setSponsorFees({
                  ...sponsorFees,
                  timing: { ...sponsorFees.timing, dispositionFeeStructure: e.target.value as any }
                })}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value="standard">Standard (Always Paid)</option>
                <option value="hurdle">Subject to Return Hurdle</option>
                <option value="waterfall">Waterfall-Based</option>
              </select>
            </div>
            
            {sponsorFees.timing.dispositionFeeStructure === 'hurdle' && (
              <div className="ml-6 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Minimum IRR (%)
                  </label>
                  <input
                    type="number"
                    value={sponsorFees.timing.dispositionHurdle.minReturn}
                    onChange={(e) => setSponsorFees({
                      ...sponsorFees,
                      timing: {
                        ...sponsorFees.timing,
                        dispositionHurdle: {
                          ...sponsorFees.timing.dispositionHurdle,
                          minReturn: Number(e.target.value)
                        }
                      }
                    })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Reduced Fee (%)
                  </label>
                  <input
                    type="number"
                    value={sponsorFees.timing.dispositionHurdle.reducedFee * 100}
                    onChange={(e) => setSponsorFees({
                      ...sponsorFees,
                      timing: {
                        ...sponsorFees.timing,
                        dispositionHurdle: {
                          ...sponsorFees.timing.dispositionHurdle,
                          reducedFee: Number(e.target.value) / 100
                        }
                      }
                    })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            )}
            
            {/* Fee Caps */}
            <div className="flex items-center mt-3">
              <input
                type="checkbox"
                id="feeCaps"
                checked={sponsorFees.feeCaps.enabled}
                onChange={(e) => setSponsorFees({
                  ...sponsorFees,
                  feeCaps: { ...sponsorFees.feeCaps, enabled: e.target.checked }
                })}
                className="mr-2"
              />
              <label htmlFor="feeCaps" className="text-sm text-gray-700">
                Apply institutional fee caps
              </label>
            </div>
            
            {sponsorFees.feeCaps.enabled && (
              <div className="ml-6 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Total Fee Cap (% of Equity)
                  </label>
                  <input
                    type="number"
                    value={sponsorFees.feeCaps.totalFeeCap}
                    onChange={(e) => setSponsorFees({
                      ...sponsorFees,
                      feeCaps: { ...sponsorFees.feeCaps, totalFeeCap: Number(e.target.value) }
                    })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Annual Cap (% of Equity)
                  </label>
                  <input
                    type="number"
                    value={sponsorFees.feeCaps.annualFeeCap}
                    onChange={(e) => setSponsorFees({
                      ...sponsorFees,
                      feeCaps: { ...sponsorFees.feeCaps, annualFeeCap: Number(e.target.value) }
                    })}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Fee Timing Impact Summary */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h5 className="text-sm font-medium text-gray-900 mb-2">Fee Timing Impact</h5>
            <div className="space-y-1 text-xs text-gray-700">
              <div className="flex justify-between">
                <span>Year 1 Cash-on-Cash (with timing):</span>
                <span className="font-medium">
                  {calculateCashOnCashWithTiming(1).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Year 1 Cash-on-Cash (standard):</span>
                <span className="font-medium">
                  {calculateStandardCashOnCash(1).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Improvement:</span>
                <span className="font-medium">
                  +{(calculateCashOnCashWithTiming(1) - calculateStandardCashOnCash(1)).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between mt-2 pt-2 border-t">
                <span>Total Deferred Fees:</span>
                <span className="font-medium">
                  {formatCurrency(calculateTotalDeferredFees())}
                </span>
              </div>
            </div>
          </div>
        </div>
        </div>
      ) : (
        <div>
          {/* Waterfall/Promote Structure */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preferred Return (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={equityStructure.preferredReturn}
              onChange={(e) => handleEquityChange('preferredReturn', e.target.value)}
              disabled={locked}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>
          <div className="text-sm text-gray-600 mb-4">
            Waterfall tiers will be applied to distributions above the preferred return
          </div>
          {/* Add waterfall tier management here if needed */}
        </div>
      )}
    </div>
  );
};

// Results Component
const ResultsPanel: React.FC<{ 
  data: PropertyData;
  compensationType: 'promote' | 'sponsorFee';
  sponsorFees: any;
  equityStructure: any;
}> = ({ data, compensationType, sponsorFees, equityStructure }) => {
  // Calculate metrics
  const totalInvestment = data.purchasePrice + data.closingCosts + data.renovationCosts;
  const downPayment = data.purchasePrice * (data.downPaymentPercent / 100);
  const loanAmount = data.purchasePrice - downPayment;
  
  const monthlyInterestRate = data.interestRate / 100 / 12;
  const numberOfPayments = data.loanTermYears * 12;
  
  const monthlyPayment = loanAmount * 
    (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) /
    (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);

  const effectiveRent = data.monthlyRent * (1 - data.vacancyRate / 100);
  const monthlyIncome = effectiveRent + data.otherIncome;

  const monthlyExpenses = 
    data.propertyTax / 12 +
    data.insurance / 12 +
    data.utilities +
    data.maintenance +
    data.management +
    data.hoa +
    data.other;

  const noi = (monthlyIncome - monthlyExpenses) * 12;
  
  // Calculate sponsor fees if applicable
  let totalSponsorFees = 0;
  let sponsorFeeDetails = {
    acquisitionFee: 0,
    developmentFee: 0,
    constructionManagementFee: 0,
    dispositionFee: 0,
    assetManagementFeeAnnual: 0,
    propertyManagementFeeAnnual: 0,
  };
  
  if (compensationType === 'sponsorFee') {
    // One-time fees
    sponsorFeeDetails.acquisitionFee = totalInvestment * (sponsorFees.acquisitionFee / 100);
    sponsorFeeDetails.developmentFee = totalInvestment * (sponsorFees.developmentFee / 100);
    sponsorFeeDetails.constructionManagementFee = data.renovationCosts * (sponsorFees.constructionManagementFee / 100);
    // Disposition fee would be calculated at sale (not included in ongoing cash flow)
    
    // Annual fees
    const effectiveGrossRevenue = monthlyIncome * 12;
    sponsorFeeDetails.assetManagementFeeAnnual = effectiveGrossRevenue * (sponsorFees.assetManagementFee / 100);
    sponsorFeeDetails.propertyManagementFeeAnnual = effectiveGrossRevenue * (sponsorFees.propertyManagementFee / 100);
    
    // Total upfront fees
    totalSponsorFees = sponsorFeeDetails.acquisitionFee + sponsorFeeDetails.developmentFee + sponsorFeeDetails.constructionManagementFee;
  }
  
  // Adjust cash flow for sponsor fees
  const monthlyAssetMgmtFee = sponsorFeeDetails.assetManagementFeeAnnual / 12;
  const monthlyPropMgmtFee = sponsorFeeDetails.propertyManagementFeeAnnual / 12;
  const adjustedMonthlyExpenses = monthlyExpenses + monthlyAssetMgmtFee + monthlyPropMgmtFee;
  const adjustedNOI = (monthlyIncome - adjustedMonthlyExpenses) * 12;
  
  const cashFlow = monthlyIncome - adjustedMonthlyExpenses - monthlyPayment;
  const annualCashFlow = cashFlow * 12;
  
  const capRate = data.purchasePrice > 0 ? (adjustedNOI / data.purchasePrice) * 100 : 0;
  const totalInitialEquity = downPayment + data.closingCosts + data.renovationCosts + totalSponsorFees;
  const cashOnCashReturn = totalInitialEquity > 0 
    ? (annualCashFlow / totalInitialEquity) * 100 
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <TrendingUp size={20} />
        Key Metrics
      </h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Monthly Cash Flow</p>
            <p className={`text-xl font-bold ${cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(cashFlow)}
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">Cap Rate</p>
            <p className="text-xl font-bold text-green-600">{capRate.toFixed(2)}%</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600">Cash-on-Cash Return</p>
            <p className="text-xl font-bold text-purple-600">{cashOnCashReturn.toFixed(2)}%</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-gray-600">Annual NOI</p>
            <p className="text-xl font-bold text-yellow-600">{formatCurrency(noi)}</p>
          </div>
        </div>
        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">Investment Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Investment:</span>
              <span className="font-medium">{formatCurrency(totalInvestment)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Down Payment:</span>
              <span className="font-medium">{formatCurrency(downPayment)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Loan Amount:</span>
              <span className="font-medium">{formatCurrency(loanAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Monthly Payment:</span>
              <span className="font-medium">{formatCurrency(monthlyPayment)}</span>
            </div>
          </div>
        </div>
        
        {compensationType === 'sponsorFee' && totalSponsorFees > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Sponsor Fees</h4>
            <div className="space-y-2 text-sm">
              <div className="font-medium text-gray-700 mb-1">One-time Fees:</div>
              {sponsorFeeDetails.acquisitionFee > 0 && (
                <div className="flex justify-between pl-4">
                  <span className="text-gray-600">Acquisition Fee:</span>
                  <span className="font-medium">{formatCurrency(sponsorFeeDetails.acquisitionFee)}</span>
                </div>
              )}
              {sponsorFeeDetails.developmentFee > 0 && (
                <div className="flex justify-between pl-4">
                  <span className="text-gray-600">Development Fee:</span>
                  <span className="font-medium">{formatCurrency(sponsorFeeDetails.developmentFee)}</span>
                </div>
              )}
              {sponsorFeeDetails.constructionManagementFee > 0 && (
                <div className="flex justify-between pl-4">
                  <span className="text-gray-600">Construction Mgmt Fee:</span>
                  <span className="font-medium">{formatCurrency(sponsorFeeDetails.constructionManagementFee)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium">
                <span className="text-gray-700">Total Upfront Fees:</span>
                <span>{formatCurrency(totalSponsorFees)}</span>
              </div>
              
              <div className="font-medium text-gray-700 mb-1 mt-3">Annual Fees:</div>
              {sponsorFeeDetails.assetManagementFeeAnnual > 0 && (
                <div className="flex justify-between pl-4">
                  <span className="text-gray-600">Asset Management:</span>
                  <span className="font-medium">{formatCurrency(sponsorFeeDetails.assetManagementFeeAnnual)}/yr</span>
                </div>
              )}
              {sponsorFeeDetails.propertyManagementFeeAnnual > 0 && (
                <div className="flex justify-between pl-4">
                  <span className="text-gray-600">Property Management:</span>
                  <span className="font-medium">{formatCurrency(sponsorFeeDetails.propertyManagementFeeAnnual)}/yr</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Fee Comparison Component
const FeeComparisonComponent: React.FC<{
  showFeeComparison: boolean;
  setShowFeeComparison: (show: boolean) => void;
  comparisonScenarios: any;
  calculateFinancing: any;
  combinedReturns: any;
}> = ({ showFeeComparison, setShowFeeComparison, comparisonScenarios, calculateFinancing, combinedReturns }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const generateStructureRecommendation = () => {
    const projectedIRR = parseFloat(combinedReturns.irr);
    const breakEven = comparisonScenarios?.differential.breakEvenIRR || 15;
    
    if (projectedIRR < 10) {
      return "Given the projected returns below 10%, sponsor fees provide more predictable compensation and reduce GP downside risk.";
    } else if (projectedIRR > breakEven + 5) {
      return "With strong projected returns, a promote structure would likely yield higher GP compensation while better aligning LP/GP interests.";
    } else {
      return "Returns are in the range where both structures could work. Consider investor preferences and risk tolerance when choosing.";
    }
  };

  if (!showFeeComparison || !comparisonScenarios) return null;

  return (
    <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Compensation Structure Comparison</h2>
        <button
          onClick={() => setShowFeeComparison(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>
      </div>
      
      {/* Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LP Returns Comparison */}
        <div>
          <h3 className="text-lg font-medium mb-3">LP Returns Comparison</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  {
                    metric: 'IRR (%)',
                    promote: comparisonScenarios.promote.lpIRR,
                    sponsorFee: comparisonScenarios.sponsorFee.lpIRR,
                  },
                  {
                    metric: 'Multiple',
                    promote: comparisonScenarios.promote.lpEquityMultiple,
                    sponsorFee: comparisonScenarios.sponsorFee.lpEquityMultiple,
                  }
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="metric" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="promote" fill="#3B82F6" name="Promote Structure" />
                <Bar dataKey="sponsorFee" fill="#10B981" name="Sponsor Fees" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* GP Compensation Comparison */}
        <div>
          <h3 className="text-lg font-medium mb-3">GP Total Compensation</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { 
                      name: 'Promote Structure', 
                      value: comparisonScenarios.promote.gpCompensation,
                      detail: `${((comparisonScenarios.promote.gpCompensation / calculateFinancing.equityRequired) * 100).toFixed(1)}% of equity`
                    },
                    { 
                      name: 'Sponsor Fees', 
                      value: comparisonScenarios.sponsorFee.gpCompensation,
                      detail: `${((comparisonScenarios.sponsorFee.gpCompensation / calculateFinancing.equityRequired) * 100).toFixed(1)}% of equity`
                    }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#3B82F6" />
                  <Cell fill="#10B981" />
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Detailed Comparison Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">Metric</th>
              <th className="text-center py-2">Promote Structure</th>
              <th className="text-center py-2">Sponsor Fees</th>
              <th className="text-center py-2">Difference</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2 font-medium">LP IRR</td>
              <td className="text-center">{comparisonScenarios.promote.lpIRR}%</td>
              <td className="text-center">{comparisonScenarios.sponsorFee.lpIRR}%</td>
              <td className={`text-center font-medium ${
                comparisonScenarios.differential.lpIRR > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {comparisonScenarios.differential.lpIRR > 0 ? '+' : ''}
                {comparisonScenarios.differential.lpIRR.toFixed(2)}%
              </td>
            </tr>
            <tr className="border-b">
              <td className="py-2 font-medium">LP Equity Multiple</td>
              <td className="text-center">{comparisonScenarios.promote.lpEquityMultiple}x</td>
              <td className="text-center">{comparisonScenarios.sponsorFee.lpEquityMultiple}x</td>
              <td className="text-center">
                {(comparisonScenarios.promote.lpEquityMultiple - 
                  comparisonScenarios.sponsorFee.lpEquityMultiple).toFixed(2)}x
              </td>
            </tr>
            <tr className="border-b">
              <td className="py-2 font-medium">GP Total Compensation</td>
              <td className="text-center">{formatCurrency(comparisonScenarios.promote.gpCompensation)}</td>
              <td className="text-center">{formatCurrency(comparisonScenarios.sponsorFee.gpCompensation)}</td>
              <td className={`text-center font-medium ${
                comparisonScenarios.differential.totalGPComp > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(Math.abs(comparisonScenarios.differential.totalGPComp))}
                {comparisonScenarios.differential.totalGPComp > 0 ? ' more' : ' less'}
              </td>
            </tr>
            <tr className="border-b">
              <td className="py-2 font-medium">GP Risk Profile</td>
              <td className="text-center">Performance-based</td>
              <td className="text-center">Guaranteed fees</td>
              <td className="text-center">-</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 font-medium">Timing of GP Comp</td>
              <td className="text-center">Back-ended</td>
              <td className="text-center">Throughout hold</td>
              <td className="text-center">-</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Break-Even Analysis */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Break-Even Analysis</h4>
        <p className="text-sm text-gray-600">
          At a project IRR of <span className="font-semibold">{comparisonScenarios.differential.breakEvenIRR}%</span>, 
          both structures would yield approximately the same total GP compensation.
        </p>
        <ul className="mt-2 text-sm text-gray-600 space-y-1">
          <li>• Below this IRR: Sponsor fees provide more guaranteed compensation</li>
          <li>• Above this IRR: Promote structure yields higher GP returns</li>
        </ul>
      </div>
      
      {/* Recommendation Engine */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Structure Recommendation</h4>
        <p className="text-sm text-gray-700">
          {generateStructureRecommendation()}
        </p>
      </div>
    </div>
  );
};

// Main App Component
const RealEstateProFormaV2: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [project, setProject] = useState<Project | null>(null);
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);
  const [showPDFExport, setShowPDFExport] = useState(false);
  const [apiKey, setApiKey] = useState<string | undefined>(undefined);
  const [formData, setFormData] = useState<PropertyData>({
    address: '123 Main Street, Los Angeles, CA 90001',
    purchasePrice: 5000000,
    closingCosts: 100000,
    renovationCosts: 500000,
    monthlyRent: 75000,
    otherIncome: 5000,
    vacancyRate: 5,
    propertyTax: 50000,
    insurance: 25000,
    utilities: 2000,
    maintenance: 3000,
    management: 4000,
    hoa: 500,
    other: 0,
    downPaymentPercent: 25,
    interestRate: 6.5,
    loanTermYears: 30
  });

  // Add new state for compensation type toggle
  const [compensationType, setCompensationType] = useState<'promote' | 'sponsorFee'>('promote');

  // Enhanced sponsor fees state with timing options
  const [sponsorFees, setSponsorFees] = useState({
    // One-time fees
    acquisitionFee: 1.5,              // % of total project cost
    developmentFee: 4,                // % of total project cost (move existing)
    constructionManagementFee: 3,     // % of hard costs (move existing)
    dispositionFee: 1.0,              // % of gross sale price
    
    // Ongoing fees
    assetManagementFee: 1.5,          // % of effective gross revenue annually
    propertyManagementFee: 0,         // % of EGR (optional, for apartments)
    
    // Performance-linked structure
    feeStructureType: 'standard' as 'standard' | 'performance',
    performanceHurdle: 8,             // % preferred return before full fees
    reducedFeePercent: 50,            // % of standard fees if below hurdle
    
    // Add timing options
    timing: {
      deferAcquisitionFee: false,
      acquisitionFeeDeferralMonths: 0,
      
      assetMgmtDeferral: {
        enabled: false,
        startYear: 3, // Start collecting in year 3
        accruedRate: 0, // Interest rate on deferred fees
      },
      
      developmentFeePayout: 'upfront' as 'upfront' | 'milestone' | 'completion',
      milestones: [
        { percent: 25, trigger: 'closing' },
        { percent: 25, trigger: 'construction_start' },
        { percent: 25, trigger: '50_percent_complete' },
        { percent: 25, trigger: 'certificate_of_occupancy' }
      ],
      
      dispositionFeeStructure: 'standard' as 'standard' | 'hurdle' | 'waterfall',
      dispositionHurdle: {
        minReturn: 12, // Minimum IRR before disposition fee
        reducedFee: 0.5, // Reduced fee if below hurdle
      }
    },
    
    // Fee caps for institutional investors
    feeCaps: {
      enabled: false,
      totalFeeCap: 15, // % of equity
      annualFeeCap: 2, // % of equity per year
    }
  });

  // Equity Structure state
  const [equityStructure, setEquityStructure] = useState({
    lpEquity: 90,
    gpEquity: 10,
    preferredReturn: 8,
    gpCoinvest: 10,
    catchUp: true,
    catchUpPercentage: 50,
    clawback: true,
  });

  // Waterfall Tiers
  const [waterfallTiers, setWaterfallTiers] = useState([
    { id: '1', minIRR: 0, maxIRR: 8, lpShare: 90, gpShare: 10 },
    { id: '2', minIRR: 8, maxIRR: 12, lpShare: 80, gpShare: 20 },
    { id: '3', minIRR: 12, maxIRR: 15, lpShare: 70, gpShare: 30 },
    { id: '4', minIRR: 15, maxIRR: 100, lpShare: 60, gpShare: 40 },
  ]);

  const [sponsorPromote, setSponsorPromote] = useState(0);
  
  // Fee Comparison State
  const [showFeeComparison, setShowFeeComparison] = useState(false);
  const [comparisonScenarios, setComparisonScenarios] = useState<any>(null);

  // Helper functions for deferred fee schedule
  const hasDeferredFees = (): boolean => {
    return sponsorFees.timing.deferAcquisitionFee || 
           sponsorFees.timing.assetMgmtDeferral.enabled ||
           sponsorFees.timing.developmentFeePayout !== 'upfront';
  };
  
  const calculateDeferredFeeSchedule = () => {
    // Mock implementation - replace with actual calculations
    const schedule = [];
    let deferredBalance = 0;
    
    // Year 0 (Closing)
    const acquisitionFee = formData.purchasePrice * (sponsorFees.acquisitionFee / 100);
    const developmentFee = (formData.purchasePrice + formData.closingCosts + formData.renovationCosts) * (sponsorFees.developmentFee / 100);
    
    if (sponsorFees.timing.deferAcquisitionFee) {
      deferredBalance += acquisitionFee;
      schedule.push({
        year: 0,
        earned: acquisitionFee + developmentFee,
        collected: developmentFee,
        deferred: acquisitionFee,
        balance: deferredBalance,
      });
    } else {
      schedule.push({
        year: 0,
        earned: acquisitionFee + developmentFee,
        collected: acquisitionFee + developmentFee,
        deferred: 0,
        balance: 0,
      });
    }
    
    // Years 1-5
    for (let year = 1; year <= 5; year++) {
      const assetMgmtFee = (formData.monthlyRent * 12) * (sponsorFees.assetManagementFee / 100);
      let earned = assetMgmtFee;
      let collected = assetMgmtFee;
      let deferred = 0;
      
      // Handle asset management fee deferral
      if (sponsorFees.timing.assetMgmtDeferral.enabled && year < sponsorFees.timing.assetMgmtDeferral.startYear) {
        collected = 0;
        deferred = assetMgmtFee;
        deferredBalance += deferred;
      } else if (year === sponsorFees.timing.assetMgmtDeferral.startYear && deferredBalance > 0) {
        // Collect accumulated deferred fees
        collected += deferredBalance;
        deferredBalance = 0;
      }
      
      // Handle acquisition fee collection if deferred
      if (sponsorFees.timing.deferAcquisitionFee && year === Math.ceil(sponsorFees.timing.acquisitionFeeDeferralMonths / 12)) {
        collected += acquisitionFee;
        deferredBalance -= acquisitionFee;
      }
      
      schedule.push({
        year,
        earned,
        collected,
        deferred,
        balance: deferredBalance,
      });
    }
    
    return schedule;
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  
  // Load API key from localStorage
  useEffect(() => {
    const savedApiKey = localStorage.getItem('claude_api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  // Initialize project
  useEffect(() => {
    const defaultProject: Project = {
      id: 'default-project',
      name: 'Sunset Gardens Apartments',
      description: 'Professional real estate investment analysis',
      propertyType: 'multifamily',
      address: '123 Main Street, Los Angeles, CA 90001',
      createdAt: new Date(),
      modifiedAt: new Date(),
      createdBy: 'User',
      tags: [],
      scenarios: [],
      settings: {
        currency: 'USD',
        units: 'imperial',
        fiscalYearStart: 1,
        defaultAssumptions: {
          inflationRate: 3.0,
          discountRate: 8.0,
          taxRate: 25.0
        }
      }
    };
    setProject(defaultProject);
    
    // Create initial scenario
    const initialScenario: Scenario = {
      id: 'initial-scenario',
      projectId: defaultProject.id,
      name: 'Base Case Analysis',
      description: 'Conservative underwriting with market assumptions',
      version: 1,
      createdAt: new Date(),
      modifiedAt: new Date(),
      createdBy: 'User',
      locked: false,
      archived: false,
      tags: ['base-case', 'conservative'],
      data: formDataToScenarioData(formData),
      results: {
        irr: 18.5,
        leveragedIRR: 22.3,
        npv: 2500000,
        cashOnCash: 9.2,
        equityMultiple: 2.35,
        capRate: 7.5,
        yieldOnCost: 8.2,
        dscr: [1.35, 1.38, 1.42, 1.45, 1.48],
        cashFlows: []
      },
      metadata: {
        assumptions: 'Based on current market conditions and conservative rent growth',
        notes: 'Strong location with stable tenant base'
      }
    };
    setCurrentScenario(initialScenario);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Convert form data to scenario data
  const formDataToScenarioData = (data: PropertyData): ScenarioData => {
    return {
      propertyInfo: {
        name: 'Property',
        address: data.address,
        propertyType: 'multifamily',
        grossArea: 0,
        netRentableArea: 0,
        units: 1
      },
      acquisition: {
        purchasePrice: data.purchasePrice,
        closingCosts: data.closingCosts,
        dueDiligence: 0,
        brokerFees: 0,
        renovationCosts: data.renovationCosts,
        acquisitionDate: new Date()
      },
      financing: {
        loans: [{
          id: 'loan-1',
          name: 'Primary Mortgage',
          amount: data.purchasePrice * (1 - data.downPaymentPercent / 100),
          interestRate: data.interestRate,
          term: data.loanTermYears,
          amortization: data.loanTermYears,
          type: 'fixed',
          startDate: new Date()
        }],
        equityRequirement: data.purchasePrice * (data.downPaymentPercent / 100),
        preferredReturn: 8
      },
      revenue: {
        rental: [{
          id: 'rental-1',
          unit: 'Unit 1',
          area: 0,
          monthlyRent: data.monthlyRent,
          escalation: 3,
          leaseStart: new Date(),
          leaseEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          vacancyRate: data.vacancyRate
        }],
        other: data.otherIncome > 0 ? [{
          id: 'other-1',
          name: 'Other Income',
          type: 'other',
          amount: data.otherIncome,
          frequency: 'monthly' as const,
          escalation: 3
        }] : [],
        escalations: []
      },
      expenses: {
        operating: [
          {
            id: 'tax',
            category: 'Taxes',
            description: 'Property Tax',
            amount: data.propertyTax,
            frequency: 'annual' as const,
            escalation: 3,
            recoverable: false
          },
          {
            id: 'insurance',
            category: 'Insurance',
            description: 'Property Insurance',
            amount: data.insurance,
            frequency: 'annual' as const,
            escalation: 3,
            recoverable: false
          },
          {
            id: 'utilities',
            category: 'Utilities',
            description: 'Utilities',
            amount: data.utilities,
            frequency: 'monthly' as const,
            escalation: 3,
            recoverable: false
          },
          {
            id: 'maintenance',
            category: 'Maintenance',
            description: 'Repairs & Maintenance',
            amount: data.maintenance,
            frequency: 'monthly' as const,
            escalation: 3,
            recoverable: false
          },
          {
            id: 'management',
            category: 'Management',
            description: 'Property Management',
            amount: data.management,
            frequency: 'monthly' as const,
            escalation: 3,
            recoverable: false
          },
          {
            id: 'hoa',
            category: 'HOA',
            description: 'HOA Fees',
            amount: data.hoa,
            frequency: 'monthly' as const,
            escalation: 3,
            recoverable: false
          }
        ].filter(exp => exp.amount > 0),
        capital: []
      },
      exit: {
        holdPeriod: 5,
        exitCapRate: 6.0,
        sellingCosts: 2,
        terminal: {
          method: 'capRate',
          value: 6.0
        }
      }
    };
  };

  // Convert scenario data back to form data
  const scenarioDataToFormData = (scenarioData: ScenarioData): PropertyData => {
    const loan = scenarioData.financing.loans[0];
    const rental = scenarioData.revenue.rental[0];
    const otherIncome = scenarioData.revenue.other[0];
    
    const expenses = scenarioData.expenses.operating.reduce((acc, exp) => {
      const monthlyAmount = exp.frequency === 'annual' ? exp.amount / 12 : exp.amount;
      switch (exp.id) {
        case 'tax': return { ...acc, propertyTax: exp.amount };
        case 'insurance': return { ...acc, insurance: exp.amount };
        case 'utilities': return { ...acc, utilities: monthlyAmount };
        case 'maintenance': return { ...acc, maintenance: monthlyAmount };
        case 'management': return { ...acc, management: monthlyAmount };
        case 'hoa': return { ...acc, hoa: monthlyAmount };
        default: return acc;
      }
    }, {} as Partial<PropertyData>);

    return {
      address: scenarioData.propertyInfo.address,
      purchasePrice: scenarioData.acquisition.purchasePrice,
      closingCosts: scenarioData.acquisition.closingCosts,
      renovationCosts: scenarioData.acquisition.renovationCosts,
      monthlyRent: rental?.monthlyRent || 0,
      otherIncome: otherIncome?.amount || 0,
      vacancyRate: rental?.vacancyRate || 5,
      propertyTax: expenses.propertyTax || 0,
      insurance: expenses.insurance || 0,
      utilities: expenses.utilities || 0,
      maintenance: expenses.maintenance || 0,
      management: expenses.management || 0,
      hoa: expenses.hoa || 0,
      other: 0,
      downPaymentPercent: loan ? (1 - loan.amount / scenarioData.acquisition.purchasePrice) * 100 : 20,
      interestRate: loan?.interestRate || 7.0,
      loanTermYears: loan?.term || 30
    };
  };

  // Handle scenario change
  const handleScenarioChange = (scenario: Scenario) => {
    setCurrentScenario(scenario);
    setFormData(scenarioDataToFormData(scenario.data));
  };

  // Handle scenario update
  const handleScenarioUpdate = (scenario: Scenario) => {
    if (scenario.id === currentScenario?.id) {
      setCurrentScenario(scenario);
    }
  };

  // Handle form data change
  const handleFormDataChange = useCallback((newData: PropertyData) => {
    setFormData(newData);
    
    // Update scenario with new data
    if (currentScenario && !currentScenario.locked) {
      const updatedScenario: Scenario = {
        ...currentScenario,
        data: formDataToScenarioData(newData),
        modifiedAt: new Date()
      };
      
      // Calculate simple results
      const totalInvestment = newData.purchasePrice + newData.closingCosts + newData.renovationCosts;
      const downPayment = newData.purchasePrice * (newData.downPaymentPercent / 100);
      const monthlyIncome = newData.monthlyRent * (1 - newData.vacancyRate / 100) + newData.otherIncome;
      const monthlyExpenses = newData.propertyTax / 12 + newData.insurance / 12 + 
        newData.utilities + newData.maintenance + newData.management + newData.hoa;
      const noi = (monthlyIncome - monthlyExpenses) * 12;
      
      updatedScenario.results = {
        irr: 15.5, // Simplified calculation
        leveragedIRR: 18.5,
        npv: noi * 10 - totalInvestment, // Simplified
        cashOnCash: ((noi / (downPayment + newData.closingCosts + newData.renovationCosts)) * 100) || 0,
        equityMultiple: 2.1,
        capRate: newData.purchasePrice > 0 ? (noi / newData.purchasePrice) * 100 : 0,
        yieldOnCost: totalInvestment > 0 ? (noi / totalInvestment) * 100 : 0,
        dscr: [1.25],
        cashFlows: []
      };
      
      handleScenarioUpdate(updatedScenario);
    }
  }, [currentScenario]);

  // Memoized callbacks for ErrorOverview
  const handleFieldFocus = useCallback((field: string) => {
    const element = document.querySelector(`[name="${field}"]`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handleSuggestionApply = useCallback((field: string, value: any) => {
    handleFormDataChange({
      ...formData,
      [field]: value
    });
  }, [formData, handleFormDataChange]);

  if (!project) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div 
        className={`bg-white border-r transition-all duration-300 flex flex-col ${
          sidebarOpen ? '' : 'w-0 overflow-hidden'
        }`}
        style={{ width: sidebarOpen ? `${sidebarWidth}px` : 0 }}
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold">Scenarios</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ScenarioManager
            project={project}
            currentScenario={currentScenario || undefined}
            onScenarioChange={handleScenarioChange}
            onScenarioUpdate={handleScenarioUpdate}
            className="border-0 shadow-none"
          />
        </div>
      </div>

      {/* Resize Handle */}
      {sidebarOpen && (
        <div
          className="w-1 bg-gray-200 hover:bg-blue-500 cursor-col-resize transition-colors"
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startWidth = sidebarWidth;
            
            const handleMouseMove = (e: MouseEvent) => {
              const newWidth = startWidth + e.clientX - startX;
              setSidebarWidth(Math.max(300, Math.min(600, newWidth)));
            };
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <Menu size={20} />
                </button>
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">Real Estate Pro Forma v2</h1>
                {currentScenario && (
                  <p className="text-sm text-gray-600">
                    {currentScenario.name} {currentScenario.locked && '(Locked)'}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-2">
                <Calculator size={20} />
                Calculate
              </button>
              <button 
                onClick={() => setShowPDFExport(true)}
                disabled={!currentScenario}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <FileText size={20} />
                Generate Report
              </button>
              <AIInsightsIntegration 
                scenario={currentScenario}
                className=""
              />
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentScenario ? (
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <PropertyForm 
                  data={formData} 
                  onChange={handleFormDataChange}
                  locked={currentScenario.locked}
                />
                <EquityStructurePanel
                  compensationType={compensationType}
                  setCompensationType={setCompensationType}
                  sponsorFees={sponsorFees}
                  setSponsorFees={setSponsorFees}
                  equityStructure={equityStructure}
                  setEquityStructure={setEquityStructure}
                  waterfallTiers={waterfallTiers}
                  setWaterfallTiers={setWaterfallTiers}
                  locked={currentScenario.locked}
                />
                
                {/* Fee Comparison Button */}
                {!showFeeComparison && (
                  <button
                    onClick={() => {
                      // Calculate comparison scenarios
                      const totalInvestment = formData.purchasePrice + formData.closingCosts + formData.renovationCosts;
                      const equityRequired = totalInvestment * (formData.downPaymentPercent / 100) + formData.closingCosts + formData.renovationCosts;
                      
                      // Mock comparison data - in real implementation, this would be calculated based on actual waterfall
                      const mockComparison = {
                        promote: {
                          lpIRR: 14.5,
                          lpEquityMultiple: 2.1,
                          gpCompensation: 1250000
                        },
                        sponsorFee: {
                          lpIRR: 13.2,
                          lpEquityMultiple: 1.95,
                          gpCompensation: 980000
                        },
                        differential: {
                          lpIRR: 1.3,
                          totalGPComp: 270000,
                          breakEvenIRR: 15.5
                        }
                      };
                      
                      setComparisonScenarios(mockComparison);
                      setShowFeeComparison(true);
                    }}
                    className="w-full py-2 px-4 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    <BarChartIcon size={20} />
                    Compare Compensation Structures
                  </button>
                )}
                
                {/* Fee Comparison Component */}
                <FeeComparisonComponent
                  showFeeComparison={showFeeComparison}
                  setShowFeeComparison={setShowFeeComparison}
                  comparisonScenarios={comparisonScenarios}
                  calculateFinancing={{ 
                    equityRequired: formData.purchasePrice * (formData.downPaymentPercent / 100) + formData.closingCosts + formData.renovationCosts,
                    propertyType: 'multifamily',
                    holdPeriod: 5
                  }}
                  combinedReturns={{ irr: '15.5' }} // Mock IRR value - replace with actual calculation
                />
              </div>
              <div className="space-y-4">
                <ErrorOverview 
                  scenario={currentScenario}
                  apiKey={apiKey}
                  onFieldFocus={handleFieldFocus}
                  onSuggestionApply={handleSuggestionApply}
                />
                <ResultsPanel 
                  data={formData} 
                  compensationType={compensationType}
                  sponsorFees={sponsorFees}
                  equityStructure={equityStructure}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Building2 size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">No Scenario Selected</h3>
                <div className="text-gray-600 mt-2">Create or select a scenario to begin</div>
              </div>
            </div>
          )}
          
          {/* Add after the main cash flow table when fee timing is used */}
          {currentScenario && compensationType === 'sponsorFee' && hasDeferredFees() && (
              <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Deferred Fee Schedule</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Year</th>
                        <th className="text-right py-2">Fees Earned</th>
                        <th className="text-right py-2">Fees Collected</th>
                        <th className="text-right py-2">Fees Deferred</th>
                        <th className="text-right py-2">Deferred Balance</th>
                        <th className="text-right py-2">LP Cash Flow Impact</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculateDeferredFeeSchedule().map((row, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-2">{row.year === 0 ? 'Closing' : `Year ${row.year}`}</td>
                          <td className="text-right">{formatCurrency(row.earned)}</td>
                          <td className="text-right">{formatCurrency(row.collected)}</td>
                          <td className="text-right text-orange-600">
                            {row.deferred > 0 ? formatCurrency(row.deferred) : '-'}
                          </td>
                          <td className="text-right font-medium">{formatCurrency(row.balance)}</td>
                          <td className="text-right text-green-600">
                            {row.deferred > 0 ? `+${formatCurrency(row.deferred)}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-4 text-sm text-gray-600">
                  <p>* Deferring fees improves early cash-on-cash returns and can help achieve investor return hurdles sooner.</p>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* PDF Export Modal */}
      {project && currentScenario && showPDFExport && (
        <PDFExportSystem
          project={project}
          scenario={currentScenario}
          onClose={() => setShowPDFExport(false)}
        />
      )}
    </div>
  );
};

export default RealEstateProFormaV2;